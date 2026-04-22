from fastapi import APIRouter, Depends, status, HTTPException, Query
from pydantic import BaseModel
from datetime import date, datetime
from bson import ObjectId
from app.models.user import UserInDB
from app.models.trip import TripCreate, TripResponse, TripInDB, TripBase, InviteRequest, TripUpdate
from app.core.dependencies import get_current_user
from app.core.database import trips_collection, users_collection
from typing import List
from app.services import geo_service
from app.models.common import Coordinates
from app.services.hotel_service import search_for_hotels, HotelOffer
from app.services.ai_service import generate_itinerary_for_trip, get_recommendations_for_trip
from app.services.flight_service import search_flights
from app.services.train_service import search_trains

class ItineraryPin(BaseModel):
    name: str
    coords: Coordinates

class MapDataResponse(BaseModel):
    destination_coords: Coordinates
    itinerary_pins: List[ItineraryPin]

router = APIRouter(
    prefix="/trips",
    tags=["Trips"]
)

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=TripResponse)
async def create_trip(
    trip: TripCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    trip_data = trip.model_dump()
    trip_data["owner_email"] = current_user.email
    trip_in_db = TripInDB(**trip_data)

    trip_to_insert = trip_in_db.model_dump()
    if trip_to_insert.get("start_date"):
        trip_to_insert["start_date"] = datetime.combine(trip_to_insert["start_date"], datetime.min.time())
    if trip_to_insert.get("end_date"):
        trip_to_insert["end_date"] = datetime.combine(trip_to_insert["end_date"], datetime.min.time())

    result = await trips_collection.insert_one(trip_to_insert)
    new_trip_id = result.inserted_id

    await users_collection.update_one(
        {"email": current_user.email},
        {"$addToSet": {"badges": "First Trip Planner"}}
    )

    coords = await geo_service.get_coords_for_location(trip.destination)
    if coords:
        await trips_collection.update_one(
            {"_id": new_trip_id},
            {"$set": {"destination_coords": coords.model_dump()}}
        )

    # Generate AI itinerary for the trip
    trip_for_ai = TripInDB(**trip_data)
    generated_items = await generate_itinerary_for_trip(trip_for_ai)
    
    from app.models.activity import ItineraryItem
    itinerary_items = []
    if generated_items:
        for item in generated_items:
            itinerary_items.append(ItineraryItem(**item).model_dump(exclude_none=True))

    if itinerary_items:
        await trips_collection.update_one(
            {"_id": new_trip_id},
            {"$set": {"itinerary": itinerary_items}}
        )
        
    # Generate AI recommendations for the trip
    try:
        recommendations = await get_recommendations_for_trip(trip_for_ai)
        if recommendations:
            await trips_collection.update_one(
                {"_id": new_trip_id},
                {"$set": {"recommendations": recommendations}}
            )
    except Exception as e:
        print(f"Failed to generate initial recommendations: {e}")

    # Fetch transport details if requested
    if trip.transport_mode == "flight" and trip.source and trip.start_date:
        try:
            flights = await search_flights(trip.source, trip.destination, trip.start_date.strftime("%Y-%m-%d"))
            flights_data = [f.model_dump() for f in flights[:5]]
            await trips_collection.update_one(
                {"_id": new_trip_id},
                {"$set": {"transport_details": flights_data}}
            )
        except Exception as e:
            print(f"Failed to fetch flights: {e}")
            
    elif trip.transport_mode == "train" and trip.source and trip.start_date:
        try:
            trains = await search_trains(origin=trip.source, destination=trip.destination, departure_date=trip.start_date.strftime("%Y-%m-%d"))
            trains_data = [t.model_dump() for t in trains[:5]]
            await trips_collection.update_one(
                {"_id": new_trip_id},
                {"$set": {"transport_details": trains_data}}
            )
        except Exception as e:
            print(f"Failed to fetch trains: {e}")

    final_trip = await trips_collection.find_one({"_id": new_trip_id})

    # --- UPDATED ---
    # Explicitly validate the raw data against the response model to apply the alias.
    return TripResponse.model_validate(final_trip)

@router.get("/", response_model=List[TripResponse])
async def get_user_trips(current_user: UserInDB = Depends(get_current_user)):
    trips_cursor = trips_collection.find({"owner_email": current_user.email})
    trips = await trips_cursor.to_list(length=100)

    # This was already correct, no changes needed here.
    return [TripResponse.model_validate(trip) for trip in trips]

@router.get("/feed", response_model=List[TripResponse])
async def get_wander_feed(current_user: UserInDB = Depends(get_current_user)):
    """Fetches public trips for the WanderFeed"""
    trips_cursor = trips_collection.find({"is_public": True}).sort("start_date", -1).limit(50)
    trips = await trips_cursor.to_list(length=50)

    # Validate and return
    return [TripResponse.model_validate(trip) for trip in trips]

@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    trip = await trips_collection.find_one({"_id": object_id})

    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.get("owner_email") != current_user.email and not trip.get("is_public", False):
        raise HTTPException(status_code=403, detail="Access denied. Trip is not public.")

    # --- LAZY MIGRATION FOR MISSING IDs ---
    needs_update = False
    import uuid
    for item in trip.get("itinerary", []):
        if "id" not in item:
            item["id"] = uuid.uuid4()
            needs_update = True
    if needs_update:
        await trips_collection.update_one(
            {"_id": object_id}, 
            {"$set": {"itinerary": trip["itinerary"]}}
        )
    # --- END MIGRATION ---

    # --- UPDATED ---
    # Explicitly validate the raw data against the response model.
    return TripResponse.model_validate(trip)

@router.put("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: str,
    trip_update: TripUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    existing_trip = await trips_collection.find_one({"_id": object_id})

    if existing_trip is None or existing_trip.get("owner_email") != current_user.email:
        raise HTTPException(status_code=404, detail="Trip not found")

    update_data = trip_update.model_dump(exclude_unset=True)

    if "start_date" in update_data and update_data["start_date"]:
        update_data["start_date"] = datetime.combine(update_data["start_date"], datetime.min.time())
    if "end_date" in update_data and update_data["end_date"]:
        update_data["end_date"] = datetime.combine(update_data["end_date"], datetime.min.time())

    if "start_date" in update_data or "end_date" in update_data:
        start = update_data.get('start_date', existing_trip.get('start_date'))
        end = update_data.get('end_date', existing_trip.get('end_date'))
        if start and end:
            try:
                start_date_obj = start.date() if isinstance(start, datetime) else start
                if isinstance(start_date_obj, str):
                    start_date_obj = date.fromisoformat(start_date_obj[:10])
                
                end_date_obj = end.date() if isinstance(end, datetime) else end
                if isinstance(end_date_obj, str):
                    end_date_obj = date.fromisoformat(end_date_obj[:10])

                if start_date_obj > end_date_obj:
                    raise HTTPException(status_code=400, detail="End date must be after start date")
            except Exception as e:
                print(f"Error parsing dates for comparison: {e}")

    await trips_collection.update_one(
        {"_id": object_id}, {"$set": update_data}
    )

    updated_trip = await trips_collection.find_one({"_id": object_id})

    # --- UPDATED ---
    # Explicitly validate the raw data against the response model.
    return TripResponse.model_validate(updated_trip)

@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    trip_to_delete = await trips_collection.find_one({"_id": object_id})

    if trip_to_delete is None or trip_to_delete.get("owner_email") != current_user.email:
        raise HTTPException(status_code=404, detail="Trip not found")

    await trips_collection.delete_one({"_id": object_id})

    return None

@router.post("/{trip_id}/invite", status_code=status.HTTP_200_OK)
async def invite_collaborator(
    trip_id: str,
    invite: InviteRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    trip = await trips_collection.find_one({"_id": object_id})

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.get("owner_email") != current_user.email:
        raise HTTPException(status_code=403, detail="Only the trip owner can invite collaborators")

    if invite.email == current_user.email:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")

    if invite.email in trip.get("collaborators", []):
        raise HTTPException(status_code=400, detail="User is already a collaborator")

    invited_user = await users_collection.find_one({"email": invite.email})
    if not invited_user:
        raise HTTPException(status_code=404, detail="User to be invited not found")

    await trips_collection.update_one(
        {"_id": object_id},
        {"$addToSet": {"collaborators": invite.email}}
    )

    return {"message": f"Successfully invited {invite.email} to the trip"}

@router.get("/{trip_id}/map-data", response_model=MapDataResponse)
async def get_map_data(
    trip_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    trip = await trips_collection.find_one({"_id": object_id})

    if trip is None or trip.get("owner_email") != current_user.email:
        raise HTTPException(status_code=404, detail="Trip not found")

    if "destination_coords" not in trip or not trip["destination_coords"]:
        raise HTTPException(status_code=404, detail="Destination coordinates not found for this trip.")

    itinerary_pins = []
    for item in trip.get("itinerary", []):
        if "location_coords" in item and item["location_coords"]:
            itinerary_pins.append(
                ItineraryPin(
                    name=item.get("location_name", "Unknown Location"),
                    coords=item["location_coords"]
                )
            )

    return MapDataResponse(
        destination_coords=trip["destination_coords"],
        itinerary_pins=itinerary_pins
    )

@router.post("/{trip_id}/complete", status_code=status.HTTP_200_OK)
async def complete_trip(
    trip_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    trip = await trips_collection.find_one({"_id": object_id})
    if trip is None or trip.get("owner_email") != current_user.email:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Trip is already marked as completed")

    await trips_collection.update_one(
        {"_id": object_id},
        {"$set": {"status": "completed"}}
    )
    
    await users_collection.update_one(
        {"email": current_user.email},
        {"$inc": {"points": 50}}
    )

    return {"message": "Trip completed successfully. +50 points awarded!"}

@router.get("/{trip_id}/hotels/search", response_model=List[HotelOffer])
async def find_hotels_for_trip(
    trip_id: str,
    adults: int = Query(1, ge=1, description="Number of adults"),
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    trip = await trips_collection.find_one({"_id": object_id})
    if trip is None or trip.get("owner_email") != current_user.email:
        raise HTTPException(status_code=404, detail="Trip not found")

    return await search_for_hotels(
        city_name=trip["destination"],
        check_in_date=trip["start_date"].strftime('%Y-%m-%d'),
        check_out_date=trip["end_date"].strftime('%Y-%m-%d'),
        adults=adults
    )

@router.post("/{trip_id}/clone", status_code=status.HTTP_201_CREATED, response_model=TripResponse)
async def clone_trip(
    trip_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    original_trip = await trips_collection.find_one({"_id": object_id})
    if original_trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    if not original_trip.get("is_public", False) and original_trip.get("owner_email") != current_user.email:
        raise HTTPException(status_code=403, detail="Cannot clone a private trip you do not own")

    cloned_data = dict(original_trip)
    cloned_data.pop("_id", None)
    cloned_data["owner_email"] = current_user.email
    cloned_data["is_public"] = False
    cloned_data["collaborators"] = []
    
    import uuid
    for i in range(len(cloned_data.get("itinerary", []))):
        cloned_data["itinerary"][i]["id"] = uuid.uuid4()
        
    for i in range(len(cloned_data.get("expenses", []))):
        cloned_data["expenses"][i]["id"] = uuid.uuid4()

    result = await trips_collection.insert_one(cloned_data)
    cloned_trip = await trips_collection.find_one({"_id": result.inserted_id})

    return TripResponse.model_validate(cloned_trip)
