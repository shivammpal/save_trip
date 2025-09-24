from amadeus import Client, ResponseError
from fastapi import HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

from app.core.config import settings

# --- Pydantic Models for our Clean Flight Data ---
class FlightSegment(BaseModel):
    departure_airport: str
    arrival_airport: str
    departure_time: str
    arrival_time: str
    carrier: str

class FlightOffer(BaseModel):
    id: str
    price: float
    currency: str
    segments: List[FlightSegment]

# --- Initialize the Amadeus Client ---
# The Amadeus SDK is synchronous, but FastAPI runs it in a thread pool
# so it doesn't block the main application.
amadeus_client = Client(
    client_id=settings.AMADEUS_API_KEY,
    client_secret=settings.AMADEUS_API_SECRET
)

# --- Service Functions ---
async def get_iata_code(city_name: str) -> str:
    """Converts a city name (e.g., 'London') to its IATA airport code (e.g., 'LON')."""
    try:
        # Clean the city name - extract just the city part if it contains commas
        clean_city = city_name.split(',')[0].strip()

        # Try with the cleaned city name first
        response = amadeus_client.reference_data.locations.get(
            keyword=clean_city,
            subType='CITY,AIRPORT'
        )

        # Filter results to prioritize airports and major cities
        if response.data:
            # First, try to find airports
            airports = [item for item in response.data if item.get('subType') == 'AIRPORT']
            if airports:
                return airports[0]['iataCode']

            # Then try cities
            cities = [item for item in response.data if item.get('subType') == 'CITY']
            if cities:
                return cities[0]['iataCode']

            # Fallback to first result
            return response.data[0]['iataCode']

        raise HTTPException(status_code=404, detail=f"No IATA code found for city: {city_name}")

    except ResponseError as error:
        print(f"Amadeus IATA lookup error: {error}")
        # Try with a more specific search if the first attempt failed
        try:
            # Try searching with just the first word of the city name
            first_word = city_name.split()[0].strip()
            response = amadeus_client.reference_data.locations.get(
                keyword=first_word,
                subType='CITY,AIRPORT'
            )

            if response.data:
                # Prioritize airports
                airports = [item for item in response.data if item.get('subType') == 'AIRPORT']
                if airports:
                    return airports[0]['iataCode']

                # Then cities
                cities = [item for item in response.data if item.get('subType') == 'CITY']
                if cities:
                    return cities[0]['iataCode']

                return response.data[0]['iataCode']

        except ResponseError:
            pass

        raise HTTPException(status_code=400, detail=f"Could not find IATA code for city: {city_name}")
    except (IndexError, KeyError):
        raise HTTPException(status_code=404, detail=f"No IATA code found for city: {city_name}")


async def search_flights(
    origin: str,
    destination: str,
    departure_date: str,
    max_price: Optional[int] = None
) -> List[FlightOffer]:
    """Searches for flights using the Amadeus API and returns a simplified list."""

    print(f"DEBUG: Starting flight search - {origin} to {destination} on {departure_date}")

    # Validate that departure date is in the future
    try:
        departure_date_obj = datetime.strptime(departure_date, '%Y-%m-%d').date()
        today = date.today()
        if departure_date_obj <= today:
            raise HTTPException(
                status_code=400,
                detail=f"Departure date {departure_date} must be in the future. Today is {today}."
            )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date format: {departure_date}. Please use YYYY-MM-DD format."
        )

    # Get IATA codes for the origin and destination cities
    print(f"DEBUG: Getting IATA codes...")
    origin_code = await get_iata_code(origin)
    destination_code = await get_iata_code(destination)
    print(f"DEBUG: IATA codes - {origin_code} to {destination_code}")

    try:
        # Build the search parameters dynamically
        params = {
            'originLocationCode': origin_code,
            'destinationLocationCode': destination_code,
            'departureDate': departure_date,
            'adults': 1,
            'currencyCode': 'USD',
            'max': 10
        }
        # Only add maxPrice to the parameters if it's not None
        if max_price is not None:
            params['maxPrice'] = max_price

        # Make the API call to Amadeus Flight Offers Search with the clean parameters
        print(f"DEBUG: Making Amadeus API call with params: {params}")
        response = amadeus_client.shopping.flight_offers_search.get(**params)
        print(f"DEBUG: API call successful, found {len(response.data)} offers")

        simplified_offers = []
        for offer in response.data:
            # Extract segments for the first itinerary (simplest journey)
            itinerary = offer['itineraries'][0]
            segments_data = []
            for segment in itinerary['segments']:
                segments_data.append(FlightSegment(
                    departure_airport=segment['departure']['iataCode'],
                    arrival_airport=segment['arrival']['iataCode'],
                    departure_time=segment['departure']['at'],
                    arrival_time=segment['arrival']['at'],
                    carrier=segment['carrierCode'] # Typically a 2-letter airline code
                ))

            simplified_offers.append(FlightOffer(
                id=offer['id'],
                price=float(offer['price']['total']),
                currency=offer['price']['currency'],
                segments=segments_data
            ))

        print(f"DEBUG: Successfully processed {len(simplified_offers)} offers")
        return simplified_offers

    except ResponseError as error:
        print(f"Amadeus flight search error: {error}")
        print(f"Error code: {error.code}")
        # Call .description() as a method to get the actual error message
        print(f"Error description: {error.description()}")
        raise HTTPException(status_code=500, detail="Error searching for flights.")
    except Exception as error:
        print(f"Unexpected error in flight search: {error}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error searching for flights.")