import asyncio
from app.core.database import trips_collection
from app.models.trip import TripResponse

async def main():
    trip = await trips_collection.find_one({"itinerary.description": "TEST ITEM"})
    if trip:
        print("Parsing with TripResponse...")
        try:
            validated = TripResponse.model_validate(trip)
            print("Validation successful!")
            json_dump = validated.model_dump_json()
            print("JSON dump works:", json_dump[:100])
        except Exception as e:
            print("ValidationError:", e)

if __name__ == "__main__":
    asyncio.run(main())
