# File: app/services/hotel_service.py

from fastapi import HTTPException
from amadeus.client.errors import ResponseError
from typing import List

from app.models.hotel import HotelOffer
# We need the Amadeus client and the IATA code helper from our flight service
from app.services.flight_service import amadeus_client, get_iata_code

async def search_for_hotels(
    city_name: str,
    check_in_date: str,
    check_out_date: str,
    adults: int = 1
) -> List[HotelOffer]:
    """
    Searches for hotel offers in a city for given dates.
    """
    try:
        # First, get the IATA city code for the destination
        city_code = await get_iata_code(city_name)

        # Then, search for hotel offers using the city code
        response = amadeus_client.shopping.hotel_offers.get(
            cityCode=city_code,
            checkInDate=check_in_date,
            checkOutDate=check_out_date,
            adults=adults,
            currency='USD',
            bestRateOnly=True
        )

        # Parse the complex response into our simple HotelOffer model
        hotel_offers = []
        for offer_data in response.data:
            hotel = offer_data.get('hotel', {})
            offer = offer_data.get('offers', [{}])[0]
            price = offer.get('price', {})

            hotel_offers.append(
                HotelOffer(
                    hotelId=hotel.get('hotelId'),
                    name=hotel.get('name'),
                    rating=hotel.get('rating'),
                    price=float(price.get('total', 0.0)),
                    currency=price.get('currency'),
                    amenities=hotel.get('amenities', [])
                )
            )
        
        return hotel_offers

    except ResponseError as error:
        print(f"Amadeus hotel search error: {error}")
        raise HTTPException(status_code=500, detail="Error searching for hotels.")