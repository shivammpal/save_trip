# File: app/routers/documents.py

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from bson import ObjectId
import cloudinary
import cloudinary.uploader
from typing import List 

from app.core.config import settings
from app.models.user import UserInDB
from app.models.document import Document
from app.core.dependencies import get_current_user
from app.core.database import trips_collection

# --- Configure Cloudinary ---
# This uses the credentials from your .env file to connect to your account
cloudinary.config(
    cloud_name = settings.CLOUDINARY_CLOUD_NAME,
    api_key = settings.CLOUDINARY_API_KEY,
    api_secret = settings.CLOUDINARY_API_SECRET
)

router = APIRouter(
    prefix="/trips/{trip_id}/documents",
    tags=["Documents"]
)

# Helper function to get a trip and verify ownership
async def _get_trip_and_verify_owner(trip_id: str, current_user: UserInDB):
    try:
        object_id = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format")

    trip = await trips_collection.find_one({"_id": object_id})
    if trip is None or trip["owner_email"] != current_user.email:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.post("/upload", response_model=Document, status_code=status.HTTP_201_CREATED)
async def upload_document(
    trip_id: str,
    current_user: UserInDB = Depends(get_current_user),
    file: UploadFile = File(...)
):
    """Uploads a new document (e.g., ticket, visa) for a trip."""
    await _get_trip_and_verify_owner(trip_id, current_user)

    try:
        # Upload the file to Cloudinary
        upload_result = cloudinary.uploader.upload(
            file.file,
            resource_type="auto", # Automatically detect file type (image, pdf, etc.)
            folder=f"trip_planner/{trip_id}" # Organize files into folders per trip
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file to cloud: {e}")

    # Create our document metadata object
    new_document = Document(
        public_id=upload_result.get("public_id"),
        file_name=file.filename,
        secure_url=upload_result.get("secure_url")
    )
    
    # Add the document metadata to the trip's document list in MongoDB
    await trips_collection.update_one(
        {"_id": ObjectId(trip_id)},
        {"$push": {"documents": new_document.model_dump()}}
    )

    return new_document

@router.get("/", response_model=List[Document])
async def list_documents(
    trip_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Lists all documents for a specific trip."""
    trip = await _get_trip_and_verify_owner(trip_id, current_user)
    return trip.get("documents", [])


@router.delete("/{public_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    trip_id: str,
    public_id: str, # This is the unique ID from Cloudinary
    current_user: UserInDB = Depends(get_current_user)
):
    """Deletes a document from Cloudinary and our database."""
    await _get_trip_and_verify_owner(trip_id, current_user)

    # 1. Delete the file from Cloudinary
    try:
        cloudinary.uploader.destroy(public_id, resource_type="auto")
    except Exception as e:
        # If Cloudinary fails, we still proceed to delete from our DB
        # but log the error. In a real app, you might handle this differently.
        print(f"Could not delete file from Cloudinary: {e}")

    # 2. Remove the document metadata from our database
    await trips_collection.update_one(
        {"_id": ObjectId(trip_id)},
        {"$pull": {"documents": {"public_id": public_id}}}
    )
    
    return None # No content response