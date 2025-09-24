# File: app/services/ride_service.py

from fastapi import HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx
import random

from app.core.config import settings

# --- Pydantic Model for our Clean Ride Estimate Data ---
class RideEstimate(BaseModel):
    provider: str  # e.g., "Uber", "Ola", "Taxi"
    vehicle_type: str
    estimated_price_min: float
    estimated_price_max: float
    currency: str
    estimated_duration_seconds: int

# --- Uber API Logic ---
async def get_uber_estimates(
    start_lat: float, start_lon: float, end_lat: float, end_lon: float
) -> List[RideEstimate]:
    """Gets real-time ride estimates from the Uber API."""
    
    # Step 1: Get a temporary access token from Uber
    auth_url = "https://login.uber.com/oauth/v2/token"
    auth_data = {
        'client_id': settings.UBER_CLIENT_ID,
        'client_secret': settings.UBER_CLIENT_SECRET,
        'grant_type': 'client_credentials',
        'scope': 'eats.store' # A general scope, as price estimates don't need a specific one
    }
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.post(auth_url, data=auth_data)
            auth_response.raise_for_status()
            access_token = auth_response.json()['access_token']
        except httpx.HTTPStatusError:
            raise HTTPException(status_code=500, detail="Could not authenticate with Uber API.")

    # Step 2: Use the access token to get price estimates
    estimates_url = "https://api.uber.com/v1.2/estimates/price"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {
        "start_latitude": start_lat,
        "start_longitude": start_lon,
        "end_latitude": end_lat,
        "end_longitude": end_lon
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(estimates_url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPStatusError:
            # Uber might return a 404 if no cars are available, we'll treat it as an empty list
            return []
        except Exception:
            raise HTTPException(status_code=500, detail="Error fetching ride estimates from Uber.")

    results = []
    for price in data.get("prices", []):
        results.append(RideEstimate(
            provider="Uber",
            vehicle_type=price.get("display_name"),
            estimated_price_min=price.get("low_estimate", 0),
            estimated_price_max=price.get("high_estimate", 0),
            currency=price.get("currency_code"),
            estimated_duration_seconds=price.get("duration", 0)
        ))
    return results


# --- Mock Services for Ola and Taxis ---
async def get_ola_estimates(
    start_lat: float, start_lon: float, end_lat: float, end_lon: float
) -> List[RideEstimate]:
    """Returns a simulated list of Ola ride estimates."""
    return [
        RideEstimate(provider="Ola", vehicle_type="Mini", estimated_price_min=150, estimated_price_max=180, currency="INR", estimated_duration_seconds=random.randint(900, 1200)),
        RideEstimate(provider="Ola", vehicle_type="Sedan", estimated_price_min=180, estimated_price_max=220, currency="INR", estimated_duration_seconds=random.randint(900, 1200)),
    ]

async def get_taxi_estimates(
    start_lat: float, start_lon: float, end_lat: float, end_lon: float
) -> List[RideEstimate]:
    """Returns a simulated list of local taxi estimates."""
    return [
        RideEstimate(provider="Local Taxi", vehicle_type="Standard", estimated_price_min=200, estimated_price_max=250, currency="INR", estimated_duration_seconds=random.randint(1000, 1300)),
    ]