# File: app/routers/destinations.py (Updated)

from fastapi import APIRouter, Query
from typing import List

# Import the new service and the now separate model
from app.services import geo_service
from app.models.destination import Destination

router = APIRouter(
    prefix="/destinations",
    tags=["Destinations"]
)

@router.get("/search", response_model=List[Destination])
async def search_destinations(
    query: str = Query(..., min_length=3, description="City or place to search for")
):
    """
    Searches for destinations by calling the central geocoding service.
    """
    # The endpoint now simply calls our service, which contains all the complex logic.
    return await geo_service.search_for_locations(query)