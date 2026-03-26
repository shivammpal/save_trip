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
