# File: app/core/dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.core.database import users_collection
from app.models.user import TokenData, UserInDB

# This tells FastAPI where it can go to get a token.
# It corresponds to the '/auth/login' endpoint we created.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    """
    Decodes the JWT token to get the current user.
    This function is a dependency that can be used to protect routes.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the JWT
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        # The 'sub' (subject) of the token is the user's email
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        # If the token is invalid (expired, malformed, etc.)
        raise credentials_exception

    # Find the user in the database
    user = await users_collection.find_one({"email": token_data.email})
    if user is None:
        # If the user from the token doesn't exist in the DB
        raise credentials_exception
    
    # Return the user as a Pydantic model
    return UserInDB(**user)