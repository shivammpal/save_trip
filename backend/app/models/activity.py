# File: app/models/activity.py

from pydantic import BaseModel, Field
from datetime import date, time
from uuid import UUID, uuid4
from typing import Optional
from .common import Coordinates
# --- Itinerary Models ---

class ItineraryItemCreate(BaseModel):
    day: int = Field(..., gt=0, description="Day number of the trip")
    time: Optional[time] = None
    description: str = Field(..., min_length=1)
    cost: float = Field(default=0.0, ge=0)
    location_name: Optional[str] = None
    
class ItineraryItem(ItineraryItemCreate):
    id: UUID = Field(default_factory=uuid4)
    location_coords: Optional[Coordinates] = None


# --- Expense Models ---

class ExpenseCreate(BaseModel):
    description: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0)
    category: str = Field(..., min_length=1)
    date: date

class Expense(ExpenseCreate):
    id: UUID = Field(default_factory=uuid4)