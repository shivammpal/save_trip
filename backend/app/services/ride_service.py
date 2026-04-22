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

import math

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth radius in kilometers
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

# --- Uber API Logic (Realistic Dynamic Mock) ---
async def get_uber_estimates(
    start_lat: float, start_lon: float, end_lat: float, end_lon: float
) -> List[RideEstimate]:
    """Returns a dynamic list of Uber ride estimates based on distance."""
    distance = haversine_distance(start_lat, start_lon, end_lat, end_lon)
    if distance < 1: distance = 1.0 # Minimum 1km

    base_duration = int((distance / 30) * 3600) # Assuming avg speed 30km/h
    
    # UberX: Base 50 + 12/km
    price_x = 50 + (12 * distance)
    # UberXL: Base 80 + 18/km
    price_xl = 80 + (18 * distance)
    # Uber Black: Base 120 + 25/km
    price_black = 120 + (25 * distance)

    return [
        RideEstimate(provider="Uber", vehicle_type="UberX", estimated_price_min=round(price_x*0.9), estimated_price_max=round(price_x*1.1), currency="INR", estimated_duration_seconds=base_duration),
        RideEstimate(provider="Uber", vehicle_type="UberXL", estimated_price_min=round(price_xl*0.9), estimated_price_max=round(price_xl*1.1), currency="INR", estimated_duration_seconds=base_duration),
        RideEstimate(provider="Uber", vehicle_type="Uber Black", estimated_price_min=round(price_black*0.9), estimated_price_max=round(price_black*1.1), currency="INR", estimated_duration_seconds=base_duration),
    ]

# --- Ola and Taxis (Realistic Dynamic Mock) ---
async def get_ola_estimates(
    start_lat: float, start_lon: float, end_lat: float, end_lon: float
) -> List[RideEstimate]:
    distance = haversine_distance(start_lat, start_lon, end_lat, end_lon)
    if distance < 1: distance = 1.0
    base_duration = int((distance / 28) * 3600) # Ola slightly different traffic routing logic maybe :)
    
    price_mini = 40 + (11 * distance)
    price_sedan = 60 + (14 * distance)

    return [
        RideEstimate(provider="Ola", vehicle_type="Mini", estimated_price_min=round(price_mini*0.9), estimated_price_max=round(price_mini*1.1), currency="INR", estimated_duration_seconds=base_duration),
        RideEstimate(provider="Ola", vehicle_type="Sedan", estimated_price_min=round(price_sedan*0.9), estimated_price_max=round(price_sedan*1.1), currency="INR", estimated_duration_seconds=base_duration),
    ]

async def get_taxi_estimates(
    start_lat: float, start_lon: float, end_lat: float, end_lon: float
) -> List[RideEstimate]:
    distance = haversine_distance(start_lat, start_lon, end_lat, end_lon)
    if distance < 1: distance = 1.0
    base_duration = int((distance / 25) * 3600) 
    
    price_standard = 50 + (15 * distance)
    return [
        RideEstimate(provider="Local Taxi", vehicle_type="Standard", estimated_price_min=round(price_standard*0.9), estimated_price_max=round(price_standard*1.1), currency="INR", estimated_duration_seconds=base_duration),
    ]