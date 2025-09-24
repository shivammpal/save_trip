# File: app/routers/packing.py

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from uuid import UUID
from typing import List

from app.models.user import UserInDB
from app.models.packing import PackingListItem, PackingListItemCreate, PackingListItemUpdate,PackingListTemplate, ApplyTemplateRequest
from app.core.dependencies import get_current_user
from app.core.database import trips_collection,packing_list_templates_collection
# This router is for general, non-trip-specific packing list actions
templates_router = APIRouter(
    prefix="/packing-list-templates",
    tags=["Packing List Templates"]
)
# This router is for actions on a specific trip's packing list
router = APIRouter(
    prefix="/trips/{trip_id}/packing-list",
    tags=["Packing List"]
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

@router.get("/", response_model=List[PackingListItem])
async def get_packing_list(
    trip_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Retrieves the packing list for a specific trip."""
    trip = await _get_trip_and_verify_owner(trip_id, current_user)
    return trip.get("packing_list", [])

@router.post("/", response_model=PackingListItem, status_code=status.HTTP_201_CREATED)
async def add_packing_list_item(
    trip_id: str,
    item: PackingListItemCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Adds a new item to a trip's packing list."""
    await _get_trip_and_verify_owner(trip_id, current_user)
    new_item = PackingListItem(**item.model_dump())
    await trips_collection.update_one(
        {"_id": ObjectId(trip_id)},
        {"$push": {"packing_list": new_item.model_dump()}}
    )
    return new_item

@router.put("/{item_id}", response_model=PackingListItem)
async def update_packing_list_item(
    trip_id: str,
    item_id: UUID,
    item_update: PackingListItemUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Updates a packing list item (e.g., toggles its 'is_packed' status)."""
    await _get_trip_and_verify_owner(trip_id, current_user)
    
    result = await trips_collection.update_one(
        {"_id": ObjectId(trip_id), "packing_list.id": item_id},
        {"$set": {"packing_list.$.is_packed": item_update.is_packed}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Packing list item not found")
    
    # Fetch the updated trip to return the updated item
    updated_trip = await trips_collection.find_one({"_id": ObjectId(trip_id)})
    updated_item = next((i for i in updated_trip["packing_list"] if i["id"] == item_id), None)
    return updated_item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_packing_list_item(
    trip_id: str,
    item_id: UUID,
    current_user: UserInDB = Depends(get_current_user)
):
    """Deletes an item from a trip's packing list."""
    await _get_trip_and_verify_owner(trip_id, current_user)
    
    result = await trips_collection.update_one(
        {"_id": ObjectId(trip_id)},
        {"$pull": {"packing_list": {"id": item_id}}}
    )

    if result.matched_count == 0: # Note: matched_count might be 1 even if item not in list, modified_count is better
        raise HTTPException(status_code=404, detail="Packing list item not found")
    
    return None

@templates_router.get("/", response_model=List[PackingListTemplate])
async def get_all_templates():
    """Retrieves all available packing list templates."""
    templates_cursor = packing_list_templates_collection.find()
    return await templates_cursor.to_list(length=100)


@router.post("/apply-template", status_code=status.HTTP_200_OK)
async def apply_packing_list_template(
    trip_id: str,
    request: ApplyTemplateRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Applies a packing list template to a trip, avoiding duplicate items."""
    trip = await _get_trip_and_verify_owner(trip_id, current_user)
    
    template = await packing_list_templates_collection.find_one(
        {"name": request.template_name}
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    # Get the names of items already on the user's list
    existing_item_names = {item['item_name'] for item in trip.get('packing_list', [])}
    
    # Filter the template items, keeping only those not already on the user's list
    new_items_to_add = [
        item for item in template.get('items', []) 
        if item['item_name'] not in existing_item_names
    ]

    # If there are new items to add, create full PackingListItem objects
    if new_items_to_add:
        new_packing_list_items = [
            PackingListItem(**item).model_dump() for item in new_items_to_add
        ]
        # Add all new items to the database in one operation
        await trips_collection.update_one(
            {"_id": ObjectId(trip_id)},
            {"$push": {"packing_list": {"$each": new_packing_list_items}}}
        )

    return {"message": f"Template '{request.template_name}' applied successfully."}