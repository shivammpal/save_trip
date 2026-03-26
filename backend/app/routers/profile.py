# File: app/routers/profile.py

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.models.user import UserInDB, UserProfile, UpdateUserProfile
from app.core.database import users_collection

# Initialize the router
router = APIRouter(
    prefix="/profile",
    tags=["User Profile"]
)

@router.get("/me", response_model=UserProfile)
async def read_user_me(current_user: UserInDB = Depends(get_current_user)):
    """
    Fetch the profile of the currently logged-in user.
    """
    # The 'get_current_user' dependency already fetches the user object.
    # We just need to return it. FastAPI will automatically convert it
    # to the UserProfile response model, filtering out sensitive data.
    return current_user

@router.put("/me", response_model=UserProfile)
async def update_user_me(
    profile_update: UpdateUserProfile,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Update the profile of the currently logged-in user.
    """
    # Get the update data, excluding any fields that were not set in the request
    update_data = profile_update.model_dump(exclude_unset=True)

    # Only perform an update if there is data to update
    if update_data:
        await users_collection.update_one(
            {"email": current_user.email},
            {"$set": update_data}
        )

    # Fetch the updated user document from the database to return the fresh data
    updated_user = await users_collection.find_one({"email": current_user.email})
    return updated_user

class ClaimUserIDRequest(BaseModel):
    user_id: str

@router.post("/userid", response_model=UserProfile)
async def claim_user_id(
    payload: ClaimUserIDRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Claim a unique user_id for chat features.
    """
    if current_user.user_id:
        raise HTTPException(status_code=400, detail="User ID already claimed.")
    
    # Needs to be purely alphanumeric or underscores to look good and prevent URL encoding nightmares
    import re
    if not re.match(r"^[A-Za-z0-9_]{3,20}$", payload.user_id):
        raise HTTPException(status_code=400, detail="User ID must be 3-20 characters, alphanumeric or underscores only.")

    # Check for uniqueness
    existing_user = await users_collection.find_one({"user_id": payload.user_id})
    if existing_user:
        raise HTTPException(status_code=409, detail="User ID is already taken. Please choose another one.")

    await users_collection.update_one(
        {"email": current_user.email},
        {"$set": {"user_id": payload.user_id}}
    )
    
    updated_user = await users_collection.find_one({"email": current_user.email})
    return updated_user