import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

async def test():
    key = os.getenv("RAPIDAPI_KEY")
    
    print("Testing indian-railways.p.rapidapi.com...")
    headers1 = {
        "x-rapidapi-host": "indian-railways.p.rapidapi.com",
        "x-rapidapi-key": key,
    }
    async with httpx.AsyncClient() as client:
        params = {"from": "NDLS", "to": "MMCT"}
        try:
            resp = await client.get("https://indian-railways.p.rapidapi.com/findtrains.php", headers=headers1, params=params)
            print("Status:", resp.status_code)
            print("Body:", resp.text[:500])
        except Exception as e:
            print("Err1:", e)

    print("\nTesting irctc-api2.p.rapidapi.com/searchTrain...")
    headers2 = {
        "x-rapidapi-host": "irctc-api2.p.rapidapi.com",
        "x-rapidapi-key": key,
    }
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get("https://irctc-api2.p.rapidapi.com/searchTrain", headers=headers2, params={"source": "NDLS", "destination": "MMCT", "date": "2024-05-20"})
            print("searchTrain:", resp.status_code)
            print("Body:", resp.text[:500])
        except Exception as e:
            print("Err2:", e)
            
        try:
            resp = await client.get("https://irctc-api2.p.rapidapi.com/trainBetweenStations", headers=headers2, params={"fromStationCode": "NDLS", "toStationCode": "MMCT", "date": "2024-05-20"})
            print("trainBetweenStations:", resp.status_code)
            print("Body:", resp.text[:500])
        except Exception as e:
            print("Err3:", e)

asyncio.run(test())
