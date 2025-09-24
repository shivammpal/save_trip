# File: app/routers/gamification.py

from fastapi import APIRouter
from typing import List

from app.models.user import UserProfile
from app.core.database import users_collection

router = APIRouter(
    prefix="/gamification",
    tags=["Gamification"]
)

@router.get("/leaderboard", response_model=List[UserProfile])
async def get_leaderboard():
    """
    Retrieves the top 10 users with the most points.
    """
    # Find users, sort by points descending, and limit to 10 results
    leaderboard_cursor = users_collection.find().sort("points", -1).limit(10)
    
    leaderboard = await leaderboard_cursor.to_list(length=10)
    
    return leaderboard