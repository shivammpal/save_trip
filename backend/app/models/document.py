# File: app/models/document.py (Corrected)

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional # <-- FIX 1: Import Optional

class Document(BaseModel):
    public_id: str = Field(..., description="The public ID from Cloudinary, used for deletion.")
    secure_url: str = Field(..., description="The HTTPS URL of the uploaded file.")
    
    # FIX 2: Make these fields optional to handle old data in the database
    # This will stop the validation error.
    original_filename: Optional[str] = None
    resource_type: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DocumentCreate(BaseModel):
    # The 'Create' model *still* requires these fields for new uploads
    public_id: str
    secure_url: str
    original_filename: str
    resource_type: str

