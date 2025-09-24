# File: app/models/user.py (Updated)

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

# --- Existing Models ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- Updated and New Models for User Profile ---

class UserInDB(BaseModel):
    email: EmailStr
    hashed_password: Optional[str] = None
    provider: str = "local"
    social_id: Optional[str] = None
    name: Optional[str] = None
    age: Optional[int] = None
    travel_preferences: Optional[List[str]] = None
    points: int = 0
    badges: List[str] = []
    # NEW: Role field
    role: str = "user"

class UpdateUserProfile(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    travel_preferences: Optional[List[str]] = None

class UserProfile(BaseModel):
    email: EmailStr
    provider: str
    name: Optional[str] = None
    age: Optional[int] = None
    travel_preferences: Optional[List[str]] = None
    points: int
    badges: List[str]
    # NEW: Role field
    role: str

    class Config:
        from_attributes = True