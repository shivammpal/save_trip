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

# --- Uber API Logic (Mocked for demo purposes) ---
async def get_uber_estimates(
    start_lat: float, start_lon: float, end_lat: float, end_lon: float
) -> List[RideEstimate]:
    """Returns a simulated list of Uber ride estimates."""
    return [
        RideEstimate(provider="Uber", vehicle_type="UberX", estimated_price_min=120, estimated_price_max=150, currency="INR", estimated_duration_seconds=random.randint(800, 1100)),
        RideEstimate(provider="Uber", vehicle_type="UberXL", estimated_price_min=180, estimated_price_max=220, currency="INR", estimated_duration_seconds=random.randint(800, 1100)),
        RideEstimate(provider="Uber", vehicle_type="Uber Black", estimated_price_min=250, estimated_price_max=300, currency="INR", estimated_duration_seconds=random.randint(800, 1100)),
    ]


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