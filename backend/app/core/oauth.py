# File: app/core/oauth.py

from authlib.integrations.starlette_client import OAuth
from .config import settings

# Create an OAuth instance
oauth = OAuth()

# Register the Google client
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)