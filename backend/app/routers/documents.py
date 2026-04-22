# File: app/routers/documents.py (Corrected)

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
import cloudinary
import cloudinary.uploader
import time

from app.core.dependencies import get_current_user
from app.core.database import trips_collection
from app.models.user import UserInDB
from app.models.document import Document, DocumentCreate
from app.core.config import settings # <-- FIX 1: Import 'settings' object

# Configure Cloudinary using the settings object
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)

@router.post("/signature", status_code=status.HTTP_200_OK)
async def get_upload_signature(current_user: UserInDB = Depends(get_current_user)):
    """
    Generates a signed signature for direct frontend uploads to Cloudinary.
    """
    timestamp = int(time.time())
    params_to_sign = {"timestamp": timestamp}
    
    signature = cloudinary.utils.api_sign_request(
        params_to_sign, settings.CLOUDINARY_API_SECRET # <-- FIX 2: Use settings.
    )

    return {
        "signature": signature, 
        "timestamp": timestamp, 
        "api_key": settings.CLOUDINARY_API_KEY # <-- FIX 3: Use settings.
    }

@router.post("/trips/{trip_id}", status_code=status.HTTP_201_CREATED, response_model=Document)
async def add_document_to_trip(
    trip_id: str,
    document_data: DocumentCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Saves the metadata of a successfully uploaded document to a trip.
    This is called *after* the frontend uploads the file to Cloudinary.
    """
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    trip = await trips_collection.find_one({"_id": object_id, "owner_email": current_user.email})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    new_document = Document(**document_data.model_dump())
    
    await trips_collection.update_one(
        {"_id": object_id},
        {"$addToSet": {"documents": new_document.model_dump()}}
    )
    return new_document

@router.delete("/trips/{trip_id}/{public_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document_from_trip(
    trip_id: str,
    public_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")
    
    # Remove from MongoDB
    result = await trips_collection.update_one(
        {"_id": object_id, "owner_email": current_user.email},
        {"$pull": {"documents": {"public_id": public_id}}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Document not found in trip")

    # Delete from Cloudinary
    try:
        # You might need to specify resource_type if you upload non-images
        cloudinary.uploader.destroy(public_id, invalidate=True)
    except Exception as e:
        # Log the error, but don't fail the request if it's already removed from our DB
        print(f"Could not delete {public_id} from Cloudinary: {e}")
        
    return None

import asyncio

@router.post("/trips/{trip_id}/{public_id}/verify/ai", status_code=status.HTTP_200_OK)
async def verify_document_ai(
    trip_id: str,
    public_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid format")
        
    # Mocking a 2 second LLM verification delay
    await asyncio.sleep(2)
    
    result = await trips_collection.update_one(
        {"_id": object_id, "documents.public_id": public_id},
        {"$set": {"documents.$.verification_status": "ai_verified"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return {"message": "Document verified by AI successfully."}

@router.post("/trips/{trip_id}/{public_id}/verify/leader", status_code=status.HTTP_200_OK)
async def verify_document_leader(
    trip_id: str,
    public_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid format")
    
    trip = await trips_collection.find_one({"_id": object_id})
    if not trip or trip.get("owner_email") != current_user.email:
        raise HTTPException(status_code=403, detail="Only the trip leader can verify documents manually.")
        
    result = await trips_collection.update_one(
        {"_id": object_id, "documents.public_id": public_id},
        {"$set": {"documents.$.verification_status": "leader_verified"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return {"message": "Document verified by Leader successfully."}

