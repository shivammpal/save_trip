# File: app/core/config.py

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # --- Project Settings ---
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # --- Google OAuth Settings ---
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    
    GEOAPIFY_API_KEY: str
    
    GEMINI_API_KEY: str
    
    # --- Amadeus API Credentials ---
    AMADEUS_API_KEY: str
    AMADEUS_API_SECRET: str
    
    #train
    RAPIDAPI_KEY: str
    RAPIDAPI_HOST: str
    
    #uber 
    UBER_CLIENT_ID: str
    UBER_CLIENT_SECRET: str
    
    # --- Cloudinary Credentials ---
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    class Config:
        # This tells Pydantic to read settings from a .env file
        env_file = ".env"

# Create a single, globally accessible instance of the settings
settings = Settings()