# File: app/services/train_service.py

from fastapi import HTTPException
from pydantic import BaseModel
from typing import List
import httpx

from app.core.config import settings

# --- Pydantic Model for our Clean Train Data ---
class TrainOffer(BaseModel):
    train_number: str
    train_name: str
    departure_time: str
    arrival_time: str
    duration: str
    available_classes: List[str]

# --- API Constants ---
RAPIDAPI_HOST = "indian-railways.p.rapidapi.com"
STATIONS_URL = "https://indian-railways.p.rapidapi.com/stations.php"
BETWEEN_STATIONS_URL = "https://indian-railways.p.rapidapi.com/findtrains.php"

HEADERS = {
    "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
    "X-RapidAPI-Host": RAPIDAPI_HOST
}

# --- Service Functions ---
async def get_station_code(city_name: str) -> str:
    """Converts a city name to its station code using the API."""
    params = {"q": city_name}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(STATIONS_URL, headers=HEADERS, params=params)
            response.raise_for_status()
            data = response.json()
            if not data.get('stations'):
                raise HTTPException(status_code=404, detail=f"No station found for city: {city_name}")
            return data['stations'][0]['code']
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"Error from external API: {e.response.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching station code: {e}")

async def search_trains(
    origin: str,
    destination: str,
    departure_date: str
) -> List[TrainOffer]:
    """Searches for trains between two stations on a given date."""
    origin_code = await get_station_code(origin)
    destination_code = await get_station_code(destination)
    
    params = {
        "fromStationCode": origin_code,
        "toStationCode": destination_code,
        "dateOfJourney": departure_date
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(BETWEEN_STATIONS_URL, headers=HEADERS, params=params)
            response.raise_for_status()
            data = response.json()
            if not data or not data.get('data'):
                return [] # Return empty list if no trains are found
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"Error from external API: {e.response.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error searching for trains: {e}")

    results = []
    for train in data['data']:
        results.append(TrainOffer(
            train_number=train.get('train_number'),
            train_name=train.get('train_name'),
            departure_time=train.get('from_sta'), # Departure time
            arrival_time=train.get('to_sta'), # Arrival time
            duration=train.get('duration'),
            available_classes=train.get('avl_classes', [])
        ))
    
    return results