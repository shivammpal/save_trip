import asyncio
from app.core.database import trips_collection
import uuid

async def main():
    # find a trip
    trip = await trips_collection.find_one()
    if not trip: return
    trip_id = trip['_id']
    
    from app.models.activity import ItineraryItem, ItineraryItemCreate
    new_item = ItineraryItem(
        day=1,
        description="TEST ITEM",
        cost=500
    )
    # simulate the router's behavior
    res = await trips_collection.update_one(
        {"_id": trip_id},
        {"$push": {"itinerary": new_item.model_dump(exclude_none=True)}}
    )
    print("Update result:", res.modified_count)

    # Now fetch it
    updated_trip = await trips_collection.find_one({"_id": trip_id})
    test_item = next((item for item in updated_trip['itinerary'] if item.get('description') == 'TEST ITEM'), None)
    print("Fetched item:", test_item)
    
if __name__ == "__main__":
    asyncio.run(main())
