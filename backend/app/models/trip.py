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
    travel_cost: float = 0.0
    food_cost: float = 0.0
    trip_type: str = Field("solo", example="solo")
    status: str = Field("planned", example="planned")
    itinerary: List[ItineraryItem] = []
    expenses: List[Expense] = []
    collaborators: List[EmailStr] = []
    destination_coords: Optional[Coordinates] = None
    documents: List[Document] = []
    packing_list: List[PackingListItem] = []
    recommendations: Optional[dict] = None
    transport_mode: Optional[str] = Field("none", example="flight")
    transport_details: Optional[list] = []
    is_public: bool = Field(default=False, description="Whether the trip appears in the global WanderFeed")

class TripCreate(BaseModel):
    destination: str = Field(..., min_length=1, example="Paris, France")
    source: Optional[str] = Field(None, example="New York, USA")
    start_date: date
    end_date: date
    budget: float = Field(..., ge=0, example=2500.50)
    transport_mode: Optional[str] = Field("none", example="flight")

class TripUpdate(BaseModel):
    destination: Optional[str] = None
    source: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = None
    travel_cost: Optional[float] = None
    food_cost: Optional[float] = None
    trip_type: Optional[str] = None
    status: Optional[str] = None
    transport_mode: Optional[str] = None
    is_public: Optional[bool] = None

class TripInDB(TripBase):
    owner_email: str

class TripResponse(TripInDB):
    id: Annotated[str, BeforeValidator(lambda v: str(v))] = Field(..., alias="_id")

    class Config:
        populate_by_name = True
        from_attributes = True
        json_encoders = {ObjectId: str}
