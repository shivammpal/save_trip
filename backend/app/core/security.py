# File: app/core/security.py

from datetime import datetime, timedelta
from typing import Any
from passlib.context import CryptContext
from jose import jwt
from .config import settings

# --- Password Hashing ---
# Create a CryptContext instance, specifying the bcrypt hashing algorithm
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against its hashed version."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a plain password."""
    return pwd_context.hash(password)


# --- JSON Web Tokens (JWT) ---
def create_access_token(subject: Any) -> str:
    """
    Creates a JWT access token.
    'subject' can be a username, email, or any unique identifier.
    """
    expire = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt