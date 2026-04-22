import asyncio
from app.core.database import trips_collection

async def main():
    trip = await trips_collection.find_one({"itinerary": {"$exists": True, "$not": {"$size": 0}}})
    if trip:
        print("Found trip with itinerary!")
        for item in trip.get("itinerary", []):
            print(f"Item: {item}")
            print(f"ID Type: {type(item.get('id', None))}")
    else:
        print("No trip with itinerary found.")

if __name__ == "__main__":
    asyncio.run(main())
