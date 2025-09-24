# File: app/models/trip.py (Updated)

from datetime import date
from typing import List, Optional
# NEW: Import EmailStr for validation
from pydantic import BaseModel, Field, model_validator, EmailStr
from bson import ObjectId

from .activity import ItineraryItem, Expense
from .common import Coordinates
from .document import Document
from .packing import PackingListItem

class InviteRequest(BaseModel):
    email: EmailStr

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    @classmethod
    def validate(cls, v, *args, **kwargs):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)
    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")

class TripBase(BaseModel):
    destination: str = Field(..., min_length=1, example="Paris, France")
    start_date: date
    end_date: date
    budget: float = Field(..., gt=0, example=2500.50)
    total_spent: float = 0.0
    itinerary: List[ItineraryItem] = []
    expenses: List[Expense] = []
    # NEW FIELD:
    collaborators: List[EmailStr] = []
    destination_coords: Optional[Coordinates] = None
    documents: List[Document] = []
    packing_list: List[PackingListItem] = []
    
    @model_validator(mode='before')
    def check_dates(cls, values):
        start, end = values.get('start_date'), values.get('end_date')
        if start and end and start > end:
            raise ValueError("End date must be after start date")
        return values

class TripCreate(TripBase):
    class Config:
        # Exclude fields that shouldn't be set on creation
        exclude = {'total_spent', 'itinerary', 'expenses', 'collaborators','destination_coords','documents','packing_list'}

class TripInDB(TripBase):
    owner_email: str

class TripResponse(TripBase):
    id: str = Field(..., alias="_id")

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {ObjectId: str}