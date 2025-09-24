# File: app/routers/trips.py

from fastapi import APIRouter, Depends, status,HTTPException, Query
from pydantic import BaseModel
# NEW: Import date from datetime
from datetime import date
# NEW: Import ObjectId from bson
from bson import ObjectId

from app.models.user import UserInDB
from app.models.trip import TripCreate, TripResponse, TripInDB, TripBase,InviteRequest
from app.core.dependencies import get_current_user
from app.core.database import trips_collection,users_collection
from typing import List # <-- NEW IMPORT
from app.services import geo_service
from app.models.common import Coordinates 
from app.services.hotel_service import search_for_hotels, HotelOffer

# --- NEW: Pydantic models for the map data response ---
class ItineraryPin(BaseModel):
    name: str
    coords: Coordinates

class MapDataResponse(BaseModel):
    destination_coords: Coordinates
    itinerary_pins: List[ItineraryPin]

# Initialize the router
router = APIRouter(
    prefix="/trips",
    tags=["Trips"]
)

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=TripResponse)
async def create_trip(
    trip: TripCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Creates a new trip, awards points/badges, and geocodes the destination.
    """
    trip_data = trip.model_dump()
    trip_data["owner_email"] = current_user.email
    trip_in_db = TripInDB(**trip_data)

    # 1. Insert the new trip into the database
    result = await trips_collection.insert_one(trip_in_db.model_dump())
    new_trip_id = result.inserted_id

    # --- GAMIFICATION LOGIC (Existing) ---
    await users_collection.update_one(
        {"email": current_user.email},
        {
            "$inc": {"points": 50},
            "$addToSet": {"badges": "First Trip Planner"}
        }
    )

    # --- NEW GEOCODING LOGIC ---
    coords = await geo_service.get_coords_for_location(trip.destination)
    if coords:
        await trips_collection.update_one(
            {"_id": new_trip_id},
            {"$set": {"destination_coords": coords.model_dump()}}
        )

    # 2. Fetch the final, complete trip document
    final_trip = await trips_collection.find_one({"_id": new_trip_id})
    
    return final_trip
@router.get("/", response_model=List[TripResponse])
async def get_user_trips(current_user: UserInDB = Depends(get_current_user)):
    """
    Retrieves all trips owned by the currently logged-in user.
    """
    # Find all trips where 'owner_email' matches the current user's email
    trips_cursor = trips_collection.find({"owner_email": current_user.email})
    
    # Convert the cursor to a list of dictionaries
    trips = await trips_cursor.to_list(length=100) # You can adjust length as needed
    
    return trips

@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Retrieves a single trip by its ID, ensuring it belongs to the current user.
    """
    try:
        # Convert the string ID to a MongoDB ObjectId
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")
    
    # Find the trip by its ID
    trip = await trips_collection.find_one({"_id": object_id})

    # Check if the trip exists AND if the owner is the current user
    if trip is None or trip["owner_email"] != current_user.email:
        raise HTTPException(status_code=404, detail="Trip not found")

    return trip
@router.put("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: str,
    trip_update: TripBase, # We can reuse TripBase for updates
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Updates a trip, verifying ownership first.
    """
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    # First, find the existing trip
    existing_trip = await trips_collection.find_one({"_id": object_id})

    # Verify the trip exists and the current user is the owner
    if existing_trip is None or existing_trip["owner_email"] != current_user.email:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Perform the update
    update_data = trip_update.model_dump(exclude_unset=True)
    
    # Ensure end date is after start date in the update
    start = update_data.get('start_date', existing_trip.get('start_date'))
    end = update_data.get('end_date', existing_trip.get('end_date'))
    if start and end and date.fromisoformat(str(start)) > date.fromisoformat(str(end)):
        raise HTTPException(status_code=400, detail="End date must be after start date")

    await trips_collection.update_one(
        {"_id": object_id}, {"$set": update_data}
    )

    # Return the updated document
    updated_trip = await trips_collection.find_one({"_id": object_id})
    return updated_trip


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Deletes a trip, verifying ownership first.
    """
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    # Find the trip to ensure it exists and to check ownership
    trip_to_delete = await trips_collection.find_one({"_id": object_id})

    # Verify ownership before deleting
    if trip_to_delete is None or trip_to_delete["owner_email"] != current_user.email:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Perform the deletion
    await trips_collection.delete_one({"_id": object_id})

    # A 204 response does not return a body, so we return None
    return None

@router.post("/{trip_id}/invite", status_code=status.HTTP_200_OK)
async def invite_collaborator(
    trip_id: str,
    invite: InviteRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Invites another user to collaborate on a trip."""
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    trip = await trips_collection.find_one({"_id": object_id})

    # 1. Verify the trip exists
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # 2. Verify the current user is the OWNER of the trip
    if trip["owner_email"] != current_user.email:
        raise HTTPException(status_code=403, detail="Only the trip owner can invite collaborators")

    # 3. Check if the user being invited is the owner
    if invite.email == current_user.email:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")
        
    # 4. Check if the user being invited is already a collaborator
    if invite.email in trip.get("collaborators", []):
        raise HTTPException(status_code=400, detail="User is already a collaborator")

    # 5. Check if the invited user is a registered user
    invited_user = await users_collection.find_one({"email": invite.email})
    if not invited_user:
        raise HTTPException(status_code=404, detail="User to be invited not found")

    # Use MongoDB's $addToSet to add the email, preventing duplicates
    await trips_collection.update_one(
        {"_id": object_id},
        {"$addToSet": {"collaborators": invite.email}}
    )

    return {"message": f"Successfully invited {invite.email} to the trip"}

# --- NEW ENDPOINT ---
@router.get("/{trip_id}/map-data", response_model=MapDataResponse)
async def get_map_data(
    trip_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Retrieves geolocation data for a specific trip, formatted for a map.
    """
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    trip = await trips_collection.find_one({"_id": object_id})

    # Verify trip exists and is owned by the current user
    if trip is None or trip["owner_email"] != current_user.email:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    # Verify the trip has been geocoded
    if "destination_coords" not in trip or not trip["destination_coords"]:
        raise HTTPException(status_code=404, detail="Destination coordinates not found for this trip.")

    itinerary_pins = []
    for item in trip.get("itinerary", []):
        # Only include itinerary items that have been successfully geocoded
        if "location_coords" in item and item["location_coords"]:
            itinerary_pins.append(
                ItineraryPin(
                    name=item["location_name"],
                    coords=item["location_coords"]
                )
            )
            
    return MapDataResponse(
        destination_coords=trip["destination_coords"],
        itinerary_pins=itinerary_pins
    )
    
@router.get("/{trip_id}/hotels/search", response_model=List[HotelOffer])
async def find_hotels_for_trip(
    trip_id: str,
    adults: int = Query(1, ge=1, description="Number of adults"),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Finds hotel offers for a specific trip, using the trip's
    destination and dates as search criteria.
    """
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    # Find the trip and verify ownership
    trip = await trips_collection.find_one({"_id": object_id})
    if trip is None or trip["owner_email"] != current_user.email:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Automatically use the trip's details for the search
    return await search_for_hotels(
        city_name=trip["destination"],
        check_in_date=trip["start_date"].strftime('%Y-%m-%d'),
        check_out_date=trip["end_date"].strftime('%Y-%m-%d'),
        adults=adults
    )