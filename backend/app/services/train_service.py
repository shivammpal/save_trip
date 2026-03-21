# File: app/services/train_service.py

from typing import List, Optional
import httpx
import random
from fastapi import HTTPException
from pydantic import BaseModel
from app.core.config import settings

class TrainOffer(BaseModel):
    train_number: str
    train_name: str
    departure_time: str
    arrival_time: str
    duration: str
    available_classes: List[str]
    price: float
    currency: str

RAPIDAPI_HOST = settings.RAPIDAPI_HOST
STATIONS_URL = "https://indian-railways.p.rapidapi.com/stations.php"
BETWEEN_STATIONS_URL = "https://indian-railways.p.rapidapi.com/findtrains.php"
TRAIN_STATUS_URL = "https://indian-railways.p.rapidapi.com/trainstatus.php"
TRAIN_INFO_URL = "https://indian-railways.p.rapidapi.com/traininfo.php"

HEADERS = {
    "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
    "X-RapidAPI-Host": RAPIDAPI_HOST
}

async def get_station_code(city_name: str) -> str:
    """Get station code from city name."""
    params = {"q": city_name}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(STATIONS_URL, headers=HEADERS, params=params)
            response.raise_for_status()
            data = response.json()
            stations = data.get("stations")
            if not stations:
                raise HTTPException(status_code=404, detail=f"No station found for city: {city_name}")
            return stations[0]["code"]
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"External API error: {e.response.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching station code: {e}")

async def search_trains(
    train_number_date: Optional[str] = None,
    train_number_name: Optional[str] = None,
    max_price: Optional[int] = None
) -> List[TrainOffer]:
    """Search trains by status or info."""
    results = []

    if train_number_date:
        # Parse train_number_date: e.g., "12345 2023-10-01"
        parts = train_number_date.split()
        if len(parts) != 2:
            return []
        train_number, date_str = parts
        # Convert YYYY-MM-DD to YYYYMMDD
        y, m, d = date_str.split("-")
        formatted_date = f"{y}{m}{d}"

        params = {
            "departure_date": formatted_date,
            "isH5": "true",
            "client": "web",
            "deviceIdentifier": "Mozilla%20Firefox-138.0.0.0",
            "train_number": train_number
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(TRAIN_STATUS_URL, headers=HEADERS, params=params)
                response.raise_for_status()
                data = response.json()
                if data and data.get("data"):
                    for train in data["data"]:
                        price = round(random.uniform(50, 200), 2)
                        currency = "USD"
                        if max_price is None or price <= max_price:
                            results.append(
                                TrainOffer(
                                    train_number=train.get("train_number", "N/A"),
                                    train_name=train.get("train_name", "N/A"),
                                    departure_time=train.get("departure_time", "N/A"),
                                    arrival_time=train.get("arrival_time", "N/A"),
                                    duration=train.get("duration", "N/A"),
                                    available_classes=train.get("available_classes", []),
                                    price=price,
                                    currency=currency
                                )
                            )
            except Exception:
                pass

    if train_number_name:
        # For train info: trainnameOrnumber
        params = {
            "isH5": "true",
            "client": "web"
        }
        url = f"{TRAIN_INFO_URL}/{train_number_name}"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=HEADERS, params=params)
                response.raise_for_status()
                data = response.json()
                if data and data.get("data"):
                    for train in data["data"]:
                        price = round(random.uniform(50, 200), 2)
                        currency = "USD"
                        if max_price is None or price <= max_price:
                            results.append(
                                TrainOffer(
                                    train_number=train.get("train_number", "N/A"),
                                    train_name=train.get("train_name", "N/A"),
                                    departure_time=train.get("departure_time", "N/A"),
                                    arrival_time=train.get("arrival_time", "N/A"),
                                    duration=train.get("duration", "N/A"),
                                    available_classes=train.get("available_classes", []),
                                    price=price,
                                    currency=currency
                                )
                            )
            except Exception:
                pass

    return results
