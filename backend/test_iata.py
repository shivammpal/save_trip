import asyncio
from dotenv import load_dotenv

load_dotenv(".env")

from app.services.flight_service import get_iata_code

async def main():
    locations = ["New Delhi, India", "Navi Mumbai, MH, India", "San Francisco, CA, USA"]
    for loc in locations:
        try:
            code = await get_iata_code(loc)
            print(f"'{loc}' -> {code}")
        except Exception as e:
            print(f"'{loc}' ERROR -> {e}")

asyncio.run(main())
