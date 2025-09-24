# File: app/routers/auth.py (Updated)

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse

from app.models.user import UserCreate, Token, UserInDB
from app.core.database import users_collection
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.oauth import oauth # <-- NEW IMPORT

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

# --- Google OAuth2 Authentication ---

@router.get('/login/google')
async def login_google(request: Request):
    """
    Redirects the user to Google's authentication page.
    """
    redirect_uri = request.url_for('auth_google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get('/google/callback', name='auth_google_callback')
async def auth_google_callback(request: Request):
    """
    Handles the callback from Google. Instead of returning JSON, this now
    redirects the user back to the frontend with the token.
    """
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Could not validate credentials: {e}")

    user_info = token.get('userinfo')
    if not user_info:
        raise HTTPException(status_code=400, detail="Could not fetch user info")

    user_email = user_info['email']
    user = await users_collection.find_one({"email": user_email})

    if not user:
        new_user = UserInDB(
            email=user_email,
            provider="google",
            social_id=user_info.get('sub')
        )
        await users_collection.insert_one(new_user.model_dump())
    
    # Create our own application's access token
    access_token = create_access_token(subject=user_email)
    
    # Redirect the user to a new frontend route with the token
    # The frontend will be responsible for handling this token.
    frontend_url = f"http://localhost:5173/auth/callback?token={access_token}"
    return RedirectResponse(url=frontend_url)