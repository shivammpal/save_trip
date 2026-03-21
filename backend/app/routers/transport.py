# File: app/routers/transport.py

from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from datetime import date
import asyncio

from app.models.user import UserInDB
from app.core.dependencies import get_current_user
from app.services.flight_service import search_flights, FlightOffer
from app.services.train_service import search_trains, TrainOffer
from app.services import ride_service
from app.services.ride_service import RideEstimate
from app.services.hotel_service import search_for_hotels, HotelOffer

router = APIRouter(
    prefix="/transport",
    tags=["Transport"]
)

@router.get("/test")
async def test_transport():
    """Test endpoint to verify transport router is working."""
    return {"message": "Transport router is working!"}

@router.get("/flights/search", response_model=List[FlightOffer])
async def find_flights(
    origin: str = Query(..., min_length=3),
    destination: str = Query(..., min_length=3),
    departure_date: date = Query(...),
    max_price: Optional[int] = Query(None),
    current_user: UserInDB = Depends(get_current_user)
):
    """Search flight offers based on user criteria."""
    return await search_flights(
        origin=origin,
        destination=destination,
        departure_date=departure_date.strftime('%Y-%m-%d'),
        max_price=max_price
    )

@router.get("/trains/search", response_model=List[TrainOffer])
async def find_trains(
    train_number_date: Optional[str] = Query(None),
    train_number_name: Optional[str] = Query(None),
    max_price: Optional[int] = Query(None),
    current_user: UserInDB = Depends(get_current_user)
):
    """Search trains by status or info."""
    return await search_trains(
        train_number_date=train_number_date,
        train_number_name=train_number_name,
        max_price=max_price
    )

@router.get("/rides/search", response_model=List[RideEstimate])
async def find_ride_estimates(
    start_lat: float = Query(...),
    start_lon: float = Query(...),
    end_lat: float = Query(...),
    end_lon: float = Query(...),
    current_user: UserInDB = Depends(get_current_user)
):
    """Search for ride estimates from multiple providers."""
    results = await asyncio.gather(
        ride_service.get_uber_estimates(start_lat, start_lon, end_lat, end_lon),
        ride_service.get_ola_estimates(start_lat, start_lon, end_lat, end_lon),
        ride_service.get_taxi_estimates(start_lat, start_lon, end_lat, end_lon)
    )
    # Flatten results
    all_estimates = [estimate for provider_list in results for estimate in provider_list]
    return all_estimates

@router.get("/hotels/search", response_model=List[HotelOffer])
async def find_hotels(
    city: str = Query(..., min_length=3),
    check_in_date: date = Query(...),
    check_out_date: date = Query(...),
    adults: int = Query(1, ge=1),
    current_user: UserInDB = Depends(get_current_user)
):
    """Search hotel offers for a given city and dates."""
    return await search_for_hotels(
        city_name=city,
        check_in_date=check_in_date.strftime('%Y-%m-%d'),
        check_out_date=check_out_date.strftime('%Y-%m-%d'),
        adults=adults
    )
