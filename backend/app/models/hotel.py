# File: app/models/hotel.py

from pydantic import BaseModel
from typing import List, Optional

class HotelOffer(BaseModel):
    hotelId: str
    name: str
    rating: Optional[int] = None
    price: float
    currency: str
    amenities: List[str] = []