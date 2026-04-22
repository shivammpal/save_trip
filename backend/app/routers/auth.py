# File: app/routers/auth.py (Updated)

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse

from app.models.user import UserCreate, Token, UserInDB
from app.core.database import users_collection
from app.core.security import get_password_hash, verify_password, create_access_token
from pydantic import BaseModel
import firebase_admin.auth as firebase_auth

# Initialize the router
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

# --- Standard Email/Password Authentication (from Task 4) ---

@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=dict)
async def register_user(user: UserCreate):
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )
    
    hashed_password = get_password_hash(user.password)
    new_user = UserInDB(
        email=user.email,
        hashed_password=hashed_password,
        provider="local"
    )
    await users_collection.insert_one(new_user.model_dump())
    
    return {"message": "User registered successfully. Please log in."}

@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await users_collection.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(subject=user["email"])
    return {"access_token": access_token, "token_type": "bearer"}

# --- Firebase Google Authentication ---

class FirebaseTokenRequest(BaseModel):
    token: str

@router.post("/google", response_model=Token)
async def login_with_firebase_google(request: FirebaseTokenRequest):
    """
    Verifies a Firebase ID token sent from the frontend and returns our custom access token.
    """
    try:
        # Verify the Firebase ID token with a 60-second clock skew tolerance
        # (Resolves "Token used too early" local development clock desync errors)
        decoded_token = firebase_auth.verify_id_token(request.token, clock_skew_seconds=60)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_email = decoded_token.get("email")
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase token did not contain an email.",
        )
        
    # Check if user exists in our DB
    user = await users_collection.find_one({"email": user_email})

    if not user:
        # User doesn't exist, create them. Extract name and picture if available.
        new_user = UserInDB(
            email=user_email,
            provider="google",
            social_id=decoded_token.get("uid"),
            name=decoded_token.get("name"),
            profile_picture=decoded_token.get("picture")
        )
        await users_collection.insert_one(new_user.model_dump())
    
    # Generate our standard JWT for the frontend to use
    access_token = create_access_token(subject=user_email)
    
    return {"access_token": access_token, "token_type": "bearer"}