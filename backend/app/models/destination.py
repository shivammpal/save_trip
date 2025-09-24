# File: app/models/destination.py

from pydantic import BaseModel

class Destination(BaseModel):
    name: str
    country: str
    lat: float
    lon: float