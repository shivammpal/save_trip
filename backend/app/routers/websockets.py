# File: app/routers/websockets.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websockets import connection_manager

router = APIRouter(
    prefix="/ws",
    tags=["WebSocket"]
)

@router.websocket("/trip/{trip_id}")
async def websocket_endpoint(websocket: WebSocket, trip_id: str):
    """
    Handles the WebSocket connection for a specific trip.
    """
    # Accept the connection and add it to our manager
    await connection_manager.connect(websocket, trip_id)
    
    try:
        # This loop will keep the connection alive
        while True:
            # We wait for a message from the client.
            # In our case, we don't need to do anything with the message,
            # but this call is necessary to detect when the client disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        # When the client disconnects, this exception is raised
        connection_manager.disconnect(websocket, trip_id)
        print(f"Client disconnected from trip {trip_id}")

from app.core.database import users_collection
import json

@router.websocket("/chat/{email}")
async def chat_websocket_endpoint(websocket: WebSocket, email: str):
    """
    Handles global WebSocket connections for 1-on-1 chat.
    Broadcasts online presence status to contacts.
    """
    await connection_manager.connect_personal(websocket, email)
    
    # Broadcast Online Status
    try:
        user = await users_collection.find_one({"email": email})
        if user and user.get("contacts"):
            status_msg = json.dumps({"type": "status_update", "email": email, "is_online": True})
            for contact in user.get("contacts", []):
                await connection_manager.send_personal_message(status_msg, contact)
                
        while True:
            # Keep line alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect_personal(websocket, email)
        print(f"User {email} disconnected from global chat")
        # Broadcast Offline Status
        user = await users_collection.find_one({"email": email})
        if user and user.get("contacts"):
            # Ensure the user has zero active connections everywhere before declaring offline.
            # A user might have multiple tabs open.
            if not connection_manager.is_user_online(email):
                status_msg = json.dumps({"type": "status_update", "email": email, "is_online": False})
                for contact in user.get("contacts", []):
                    await connection_manager.send_personal_message(status_msg, contact)