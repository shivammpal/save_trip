import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv(".env")

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
HEADERS = {
    "X-RapidAPI-Key": RAPIDAPI_KEY,
    "X-RapidAPI-Host": "indian-railways.p.rapidapi.com"
}

async def test_find_trains():
    async with httpx.AsyncClient() as client:
        # 1. Get station code for Delhi
        r1 = await client.get("https://indian-railways.p.rapidapi.com/stations.php", headers=HEADERS, params={"q": "delhi"})
        print("Stations Delhi:", r1.json())
        
        # 2. Find trains from NDLS to CSAMT
        # According to standard rapidapi findtrains.php, params could be ?source=NDLS&destination=BCT
        r2 = await client.get("https://indian-railways.p.rapidapi.com/findtrains.php", headers=HEADERS, params={"source": "NDLS", "destination": "BCT"})
        print("\nFind Trains NDLS -> BCT:")
        data = r2.json()
        print(f"Data keys: {data.keys() if isinstance(data, dict) else 'Not dict'}")
        if data and "trains" in data:
            print(len(data["trains"]), "trains found.")
            if len(data["trains"]) > 0:
                print("First train:", data["trains"][0])
        else:
             print("Raw data:", str(data)[:500])

asyncio.run(test_find_trains())
