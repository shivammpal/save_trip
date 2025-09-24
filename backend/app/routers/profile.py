# File: app/routers/profile.py

from fastapi import APIRouter, Depends

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