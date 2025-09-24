# File: app/models/document.py

from pydantic import BaseModel, Field
from datetime import datetime

class Document(BaseModel):
    public_id: str  # The unique ID from Cloudinary
    file_name: str  # The original name of the file
    secure_url: str # The HTTPS URL to access the file
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)