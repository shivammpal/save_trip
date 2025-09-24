# File: app/routers/transport.py (Updated)

from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from datetime import date
import asyncio

from app.models.user import UserInDB
from app.core.dependencies import get_current_user
# Import flight service and models
from app.services.flight_service import search_flights, FlightOffer
# NEW: Import train service and models
from app.services.train_service import search_trains, TrainOffer
from app.services import ride_service
from app.services.ride_service import RideEstimate
from app.services.hotel_service import search_for_hotels, HotelOffer

router = APIRouter(
    prefix="/transport",
    tags=["Transport"]
)

# --- Test endpoint to check if router is working ---
@router.get("/test")
async def test_transport():
    """Test endpoint to verify transport router is working."""
    return {"message": "Transport router is working!"}

# --- Existing Flight Search Endpoint ---
@router.get("/flights/search", response_model=List[FlightOffer])
async def find_flights(
    origin: str = Query(..., min_length=3, description="Origin city (e.g., 'London')"),
    destination: str = Query(..., min_length=3, description="Destination city (e.g., 'Paris')"),
    departure_date: date = Query(..., description="Departure date in YYYY-MM-DD format"),
    max_price: Optional[int] = Query(None, description="Optional maximum price in USD"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Searches for flight offers based on user criteria."""
    return await search_flights(
        origin=origin,
        destination=destination,
        departure_date=departure_date.strftime('%Y-%m-%d'),
        max_price=max_price
    )

# --- NEW: Train Search Endpoint ---
@router.get("/trains/search", response_model=List[TrainOffer])
async def find_trains(
    origin: str = Query(..., min_length=3, description="Origin city (e.g., 'Mumbai')"),
    destination: str = Query(..., min_length=3, description="Destination city (e.g., 'Delhi')"),
    departure_date: date = Query(..., description="Departure date in YYYY-MM-DD format"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Searches for trains between stations based on user criteria."""
    return await search_trains(
        origin=origin,
        destination=destination,
        departure_date=departure_date.strftime('%Y-%m-%d')
    )

@router.get("/rides/search", response_model=List[RideEstimate])
async def find_ride_estimates(
    start_lat: float = Query(..., description="Starting latitude"),
    start_lon: float = Query(..., description="Starting longitude"),
    end_lat: float = Query(..., description="Ending latitude"),
    end_lon: float = Query(..., description="Ending longitude"),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Searches for ride estimates from multiple providers (Uber, Ola, etc.).
    """
    # Run all our estimate functions concurrently for a faster response
    uber_task = ride_service.get_uber_estimates(start_lat, start_lon, end_lat, end_lon)
    ola_task = ride_service.get_ola_estimates(start_lat, start_lon, end_lat, end_lon)
    taxi_task = ride_service.get_taxi_estimates(start_lat, start_lon, end_lat, end_lon)

    # Wait for all tasks to complete
    results = await asyncio.gather(uber_task, ola_task, taxi_task)

    # Combine the lists of results into a single list
    all_estimates = [estimate for provider_list in results for estimate in provider_list]

    return all_estimates

# --- NEW: Hotel Search Endpoint ---
@router.get("/hotels/search", response_model=List[HotelOffer])
async def find_hotels(
    city: str = Query(..., min_length=3, description="City to search for hotels in (e.g., 'Paris')"),
    check_in_date: date = Query(..., description="Check-in date in YYYY-MM-DD format"),
    check_out_date: date = Query(..., description="Check-out date in YYYY-MM-DD format"),
    adults: int = Query(1, ge=1, description="Number of adults"),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Searches for hotel offers in a given city for specific dates.
    """
    return await search_for_hotels(
        city_name=city,
        check_in_date=check_in_date.strftime('%Y-%m-%d'),
        check_out_date=check_out_date.strftime('%Y-%m-%d'),
        adults=adults
    )
