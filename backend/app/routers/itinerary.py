# File: app/routers/itinerary.py

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from uuid import UUID
from typing import List

from app.models.user import UserInDB
from app.models.activity import ItineraryItem, ItineraryItemCreate
from app.core.dependencies import get_current_user
from app.core.database import trips_collection
from app.core.websockets import connection_manager
from app.services import geo_service

# This router will handle operations on the itinerary of a specific trip.
# The trip_id will be part of the path for all endpoints here.
router = APIRouter(
    prefix="/trips/{trip_id}/itinerary",
    tags=["Itinerary"]
)

# Helper function to get a trip and verify ownership
async def _get_trip_and_verify_owner(trip_id: str, current_user: UserInDB):
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    trip = await trips_collection.find_one({"_id": object_id})
    if trip is None or trip["owner_email"] != current_user.email:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip

@router.post("/", response_model=ItineraryItem, status_code=status.HTTP_201_CREATED)
async def add_itinerary_item(
    trip_id: str,
    item: ItineraryItemCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Adds a new item to a trip's itinerary and geocodes its location if provided. Validates location legitimacy."""
    await _get_trip_and_verify_owner(trip_id, current_user)

    # --- NEW GEOCODING LOGIC WITH VALIDATION ---
    coords = None
    if item.location_name:
        # If a location name is provided, get its coordinates
        coords = await geo_service.get_coords_for_location(item.location_name)
        if not coords:
            # If geocoding fails, reject the addition as invalid location
            raise HTTPException(status_code=400, detail=f"Invalid location: '{item.location_name}' could not be found. Please provide a valid location name.")
    # --- END OF NEW LOGIC ---

    # Create the full ItineraryItem, including the coordinates if found
    new_item = ItineraryItem(**item.model_dump(), location_coords=coords)

    await trips_collection.update_one(
        {"_id": ObjectId(trip_id)},
        {"$push": {"itinerary": new_item.model_dump(exclude_none=True)}}
    )
    return new_item

@router.put("/{item_id}", response_model=ItineraryItem)
async def update_itinerary_item(
    trip_id: str,
    item_id: UUID,
    item_update: ItineraryItemCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Updates a specific itinerary item within a trip."""
    await _get_trip_and_verify_owner(trip_id, current_user)

    updated_item = ItineraryItem(**item_update.model_dump(), id=item_id)
    
    # Use the positional '$' operator with arrayFilters to update the specific item
    result = await trips_collection.update_one(
        {"_id": ObjectId(trip_id), "itinerary.id": item_id},
        {"$set": {"itinerary.$": updated_item.model_dump()}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Itinerary item not found")
    # Broadcast the update
    await connection_manager.broadcast(f'{{"event": "update", "source": "itinerary"}}', trip_id)
    return updated_item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_itinerary_item(
    trip_id: str,
    item_id: UUID,
    current_user: UserInDB = Depends(get_current_user)
):
    """Deletes a specific itinerary item from a trip."""
    await _get_trip_and_verify_owner(trip_id, current_user)

    # Use MongoDB's $pull operator to remove the item from the array
    result = await trips_collection.update_one(
        {"_id": ObjectId(trip_id)},
        {"$pull": {"itinerary": {"id": item_id}}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Itinerary item not found")
    await connection_manager.broadcast(f'{{"event": "update", "source": "itinerary"}}', trip_id)
    return None # No content response