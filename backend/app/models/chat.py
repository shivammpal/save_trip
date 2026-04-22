from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class MessageCreate(BaseModel):
    receiver_email: str
    text: Optional[str] = ""
    message_type: str = "text" # "text", "image", "audio"
    file_url: Optional[str] = None

class MessageInDB(MessageCreate):
    id: Optional[str] = Field(None, alias="_id")
    sender_email: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class ChatUser(BaseModel):
    name: str
    email: str
    is_online: bool = False
    is_blocked: bool = False
    location: Optional[str] = None
    status: Optional[str] = None
    profile_picture: Optional[str] = None
    last_message_preview: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0
