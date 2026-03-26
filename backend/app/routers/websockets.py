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

@router.websocket("/chat/{email}")
async def chat_websocket_endpoint(websocket: WebSocket, email: str):
    """
    Handles global WebSocket connections for 1-on-1 chat.
    """
    await connection_manager.connect_personal(websocket, email)
    try:
        while True:
            # Keep line alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect_personal(websocket, email)
        print(f"User {email} disconnected from global chat")