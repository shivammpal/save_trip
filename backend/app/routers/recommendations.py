# File: app/routers/recommendations.py

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from app.core.dependencies import get_current_user
from app.models.user import UserInDB
from app.models.trip import TripInDB
from app.core.database import trips_collection
from app.services.ai_service import get_recommendations_for_trip

router = APIRouter(
    prefix="/trips",
    tags=["AI Recommendations"]
)

@router.get("/{trip_id}/recommendations", response_model=dict)
async def get_trip_recommendations(
    trip_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Generates and returns AI-powered recommendations for a specific trip.
    """
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")
        
    # Find the trip and verify ownership
    trip_doc = await trips_collection.find_one({"_id": object_id})
    if trip_doc is None or trip_doc["owner_email"] != current_user.email:
        raise HTTPException(status_code=404, detail="Trip not found")

    # If recommendations are already cached in DB, return them
    if "recommendations" in trip_doc and trip_doc["recommendations"]:
        return trip_doc["recommendations"]

    # Convert the dictionary from DB to a Pydantic model for our service
    trip = TripInDB(**trip_doc)

    # Call the AI service to get recommendations
    recommendations = await get_recommendations_for_trip(trip)
    
    # Save the generated recommendations to the database for future requests
    if recommendations:
        await trips_collection.update_one(
            {"_id": object_id},
            {"$set": {"recommendations": recommendations}}
        )

    return recommendations