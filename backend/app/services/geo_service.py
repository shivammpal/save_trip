# File: app/services/geo_service.py

from fastapi import HTTPException
from typing import List, Optional
import httpx

from app.core.config import settings
from app.models.common import Coordinates
# We need the Destination model from the router, let's move it to a common place
# For now, we can redefine it here or move it to a new models file.
# Let's move it.
# First, create/update app/models/destination.py
# (Instructions for this will be in the next step, for now, imagine it's there)
from app.models.destination import Destination


GEOAPIFY_URL = "https://api.geoapify.com/v1/geocode/search"

async def search_for_locations(query: str) -> List[Destination]:
    """Searches for a list of possible locations matching a query."""
    params = {"text": query, "apiKey": settings.GEOAPIFY_API_KEY, "format": "json", "limit": 5}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(GEOAPIFY_URL, params=params)
            response.raise_for_status()
            data = response.json()
        except (httpx.RequestError, httpx.HTTPStatusError):
            raise HTTPException(status_code=502, detail="Error communicating with geocoding service.")

    results = []
    for item in data.get("results", []):
        results.append(
            Destination(
                name=item.get("formatted"),
                country=item.get("country"),
                lat=item.get("lat"),
                lon=item.get("lon")
            )
        )
    return results

async def get_coords_for_location(location_name: str) -> Optional[Coordinates]:
    """Gets the coordinates for the best match of a location name."""
    params = {"text": location_name, "apiKey": settings.GEOAPIFY_API_KEY, "format": "json", "limit": 1}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(GEOAPIFY_URL, params=params)
            response.raise_for_status()
            data = response.json()
        except (httpx.RequestError, httpx.HTTPStatusError):
            return None # Return None on error

    results = data.get("results", [])
    if not results:
        return None

    top_result = results[0]
    return Coordinates(lat=top_result.get("lat"), lon=top_result.get("lon"))