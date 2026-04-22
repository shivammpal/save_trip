# File: app/main.py (Updated)

from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.profile import router as profile_router
from app.routers.trips import router as trips_router
from app.routers.destinations import router as destinations_router
from app.routers.itinerary import router as itinerary_router
from app.routers.expenses import router as expenses_router
from app.routers.recommendations import router as recommendations_router
from app.routers.gamification import router as gamification_router
from app.routers.transport import router as transport_router
from app.routers.packing import router as packing_router, templates_router as packing_templates_router
from app.routers.websockets import router as websockets_router
from app.routers.documents import router as documents_router
from app.routers.chat import router as chat_router

import firebase_admin
from firebase_admin import credentials

# Initialize Firebase Admin
cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
firebase_admin.initialize_app(cred)

# Create an instance of the FastAPI application
app = FastAPI(
    title="BudgetTripPlanner API",
    description="API for planning budget-friendly trips.",
    version="0.1.0"
)

# Custom Security Headers Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # Permissive CSP for development but enforces basic structure
        response.headers["Content-Security-Policy"] = "default-src 'self' *; img-src * data:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';"
        response.headers["Permissions-Policy"] = "geolocation=(self), microphone=(), camera=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Add session middleware for OAuth
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the existing and new routers
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(trips_router)
app.include_router(destinations_router)
app.include_router(itinerary_router)
app.include_router(expenses_router)
app.include_router(recommendations_router)
app.include_router(gamification_router)
app.include_router(transport_router)
app.include_router(packing_templates_router)
app.include_router(packing_router)
app.include_router(websockets_router)
app.include_router(documents_router)
app.include_router(chat_router)

# Root endpoint for health checks
@app.get("/", tags=["Root"])
async def read_root():
    """
    A simple health-check endpoint.
    """
    return {"status": "ok", "message": "Welcome to the BudgetTripPlanner API!"}
