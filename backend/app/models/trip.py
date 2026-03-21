# File: app/models/trip.py

from datetime import date
from typing import List, Optional, Annotated
from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from bson import ObjectId

# These imports are based on your file and should be correct
from .activity import ItineraryItem, Expense
from .common import Coordinates
from .document import Document
from .packing import PackingListItem


class InviteRequest(BaseModel):
    email: EmailStr

class TripBase(BaseModel):
    destination: str = Field(..., min_length=1, example="Paris, France")
    source: Optional[str] = Field(None, example="New York, USA")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = Field(None, ge=0, example=2500.50)
    total_spent: float = 0.0
    itinerary: List[ItineraryItem] = []
    expenses: List[Expense] = []
    collaborators: List[EmailStr] = []
    destination_coords: Optional[Coordinates] = None
    documents: List[Document] = []
    packing_list: List[PackingListItem] = []

class TripCreate(BaseModel):
    destination: str = Field(..., min_length=1, example="Paris, France")
    source: Optional[str] = Field(None, example="New York, USA")
    start_date: date
    end_date: date
    budget: float = Field(..., ge=0, example=2500.50)


class TripInDB(TripBase):
    owner_email: str

class TripResponse(TripInDB):
    id: Annotated[str, BeforeValidator(lambda v: str(v))] = Field(..., alias="_id")

    class Config:
        populate_by_name = True
        from_attributes = True
        json_encoders = {ObjectId: str}
