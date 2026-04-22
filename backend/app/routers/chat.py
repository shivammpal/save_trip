from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
from datetime import datetime
from bson import ObjectId
from app.models.user import UserInDB
from app.models.chat import MessageCreate, MessageInDB, ChatUser
from app.core.dependencies import get_current_user
from app.core.database import messages_collection, users_collection
from app.core.websockets import connection_manager

router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)

@router.get("/users", response_model=List[ChatUser])
async def get_chat_users(current_user: UserInDB = Depends(get_current_user)):
    """Fetch all users in the current user's contact list."""
    if not current_user.user_id:
        raise HTTPException(status_code=403, detail="Must claim a User ID first.")
        
    contacts = getattr(current_user, "contacts", [])
    if not contacts:
        return []

    users_cursor = users_collection.find({"email": {"$in": contacts}})
    users = await users_cursor.to_list(length=100)
    
    blocked_by_me = getattr(current_user, "blocked_contacts", [])

    result = []
    for u in users:
        email = u.get("email")
        if not email: continue
        name = u.get("name")
        if not name:
            name = email.split("@")[0]
            
        is_online = connection_manager.is_user_online(email)
        is_blocked = email in blocked_by_me
        
        # If the other person blocked the current user, they should always appear offline to protect privacy.
        their_blocks = u.get("blocked_contacts", [])
        if current_user.email in their_blocks:
            is_online = False
            
        location = u.get("location")
        status = u.get("bio")
        profile_picture = u.get("profile_picture")
        
        last_msg_query = {
            "$or": [
                {"sender_email": current_user.email, "receiver_email": email},
                {"sender_email": email, "receiver_email": current_user.email}
            ]
        }
        last_msg_cursor = messages_collection.find(last_msg_query).sort("timestamp", -1).limit(1)
        last_msgs = await last_msg_cursor.to_list(length=1)
        
        last_message_preview = None
        last_message_time = None
        
        if last_msgs:
            msg = last_msgs[0]
            last_message_time = msg.get("timestamp")
            if msg.get("message_type") == "image":
                last_message_preview = "📸 Image"
            elif msg.get("message_type") == "audio":
                last_message_preview = "🎤 Voice message"
            else:
                text = msg.get("text", "")
                last_message_preview = text[:27] + "..." if len(text) > 30 else text
        else:
            last_message_preview = "Start a conversation"
            
        result.append(ChatUser(
            name=name, email=email, is_online=is_online, is_blocked=is_blocked,
            location=location, status=status, profile_picture=profile_picture,
            last_message_preview=last_message_preview, last_message_time=last_message_time
        ))
        
    # Sort result: users with messages first (most recent), then users without messages
    result.sort(key=lambda x: x.last_message_time or datetime.min, reverse=True)
    return result

class AddContactRequest(BaseModel):
    user_id: str

@router.post("/contacts/add", response_model=ChatUser)
async def add_chat_contact(payload: AddContactRequest, current_user: UserInDB = Depends(get_current_user)):
    if not current_user.user_id:
        raise HTTPException(status_code=403, detail="Must claim a User ID first to add friends.")
    if payload.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot add yourself.")
        
    target_user = await users_collection.find_one({"user_id": payload.user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User ID not found.")
        
    target_email = target_user["email"]
    
    # Add target to current user's contacts
    await users_collection.update_one(
        {"email": current_user.email},
        {"$addToSet": {"contacts": target_email}}
    )
    
    # Add current user to target's contacts
    await users_collection.update_one(
        {"email": target_email},
        {"$addToSet": {"contacts": current_user.email}}
    )
    
    name = target_user.get("name")
    if not name: name = target_email.split("@")[0]
    
    is_online = connection_manager.is_user_online(target_email)
    
    return ChatUser(
        name=name, 
        email=target_email, 
        is_online=is_online, 
        is_blocked=False,
        location=target_user.get("location"),
        status=target_user.get("bio"),
        profile_picture=target_user.get("profile_picture"),
        last_message_preview="Start a conversation"
    )

@router.post("/block/{email}", status_code=status.HTTP_200_OK)
async def block_user(email: str, current_user: UserInDB = Depends(get_current_user)):
    """Blocks a user, preventing them from sending messages to you."""
    if email == current_user.email:
        raise HTTPException(status_code=400, detail="Cannot block yourself.")
    
    await users_collection.update_one(
        {"email": current_user.email},
        {"$addToSet": {"blocked_contacts": email}}
    )
    return {"status": "User blocked successfully."}

@router.post("/unblock/{email}", status_code=status.HTTP_200_OK)
async def unblock_user(email: str, current_user: UserInDB = Depends(get_current_user)):
    """Unblocks a previously blocked user."""
    await users_collection.update_one(
        {"email": current_user.email},
        {"$pull": {"blocked_contacts": email}}
    )
    return {"status": "User unblocked successfully."}

@router.get("/history/{other_email}", response_model=List[MessageInDB])
async def get_chat_history(other_email: str, current_user: UserInDB = Depends(get_current_user)):
    """Fetch message history between the current user and another user."""
    query = {
        "$or": [
            {"sender_email": current_user.email, "receiver_email": other_email},
            {"sender_email": other_email, "receiver_email": current_user.email}
        ]
    }
    cursor = messages_collection.find(query).sort("timestamp", 1)  # Ascending
    messages = await cursor.to_list(length=500)
    
    formatted_messages = []
    for m in messages:
        m["_id"] = str(m["_id"])
        formatted_messages.append(MessageInDB(**m))
    return formatted_messages

@router.post("/send", response_model=MessageInDB, status_code=status.HTTP_201_CREATED)
async def send_message(msg: MessageCreate, current_user: UserInDB = Depends(get_current_user)):
    """Send a message to another user."""
    # Verify receiver exists
    receiver = await users_collection.find_one({"email": msg.receiver_email})
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    # Blocking Rules Implementation
    # 1. Did current_user block the receiver?
    if msg.receiver_email in getattr(current_user, "blocked_contacts", []):
         raise HTTPException(status_code=403, detail="You cannot message a blocked contact.")
         
    # 2. Did receiver block the current_user?
    if current_user.email in receiver.get("blocked_contacts", []):
         # Fail silently? Or Explicitly? "User is unavailable" to not reveal block.
         raise HTTPException(status_code=403, detail="Message could not be delivered.")

    new_msg = {
        "text": msg.text,
        "message_type": msg.message_type,
        "file_url": msg.file_url,
        "sender_email": current_user.email,
        "receiver_email": msg.receiver_email,
        "timestamp": datetime.utcnow()
    }
    result = await messages_collection.insert_one(new_msg)
    new_msg["_id"] = str(result.inserted_id)

    db_msg = MessageInDB(**new_msg)
    
    # Push to socket
    import json
    payload = json.dumps({"type": "new_message", "message": db_msg.model_dump(mode="json")})
    
    # Notify Receiver
    await connection_manager.send_personal_message(payload, msg.receiver_email)
    
    # Return the saved message so the sender can display it
    return db_msg

@router.delete("/message/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(message_id: str, current_user: UserInDB = Depends(get_current_user)):
    """Delete a chat message."""
    try:
        obj_id = ObjectId(message_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid message ID format.")
        
    msg = await messages_collection.find_one({"_id": obj_id})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
        
    if msg["sender_email"] != current_user.email:
        raise HTTPException(status_code=403, detail="You can only delete your own messages.")
        
    # Delete from MongoDB
    await messages_collection.delete_one({"_id": obj_id})
    
    # Broadcast deletion event to receiver (so they instantly wipe it from UI)
    import json
    payload = json.dumps({"type": "delete_message", "message_id": str(message_id)})
    await connection_manager.send_personal_message(payload, msg["receiver_email"])
    
    return None
