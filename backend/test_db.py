import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.trip_planner
    trips = db.trips.find({})
    
    async for trip in trips:
        print(f"Trip: {trip.get('destination')}")
        itinerary = trip.get("itinerary", [])
        for idx, item in enumerate(itinerary):
            print(f"  Item {idx}: id={item.get('id')} type={type(item.get('id'))}")

if __name__ == "__main__":
    asyncio.run(main())
