# File: app/core/websockets.py

from fastapi import WebSocket
from typing import List

class ConnectionManager:
    def __init__(self):
        # This dictionary will store active connections.
        # The key will be the trip_id (a string).
        # The key will be the trip_id (a string).
        # The value will be a list of active WebSocket connections for that trip.
        self.active_connections: dict[str, List[WebSocket]] = {}
        
        # P2P global chat connections map: email -> List[WebSocket]
        self.personal_connections: dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, trip_id: str):
        """Accepts a new WebSocket connection and adds it to the list for the trip."""
        await websocket.accept()
        # Ensure the trip_id key exists, then append the new connection
        self.active_connections.setdefault(trip_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, trip_id: str):
        """Removes a WebSocket connection from the list."""
        if trip_id in self.active_connections:
            self.active_connections[trip_id].remove(websocket)

    async def broadcast(self, message: str, trip_id: str):
        """Sends a message to all connected clients for a specific trip."""
        """Sends a message to all connected clients for a specific trip."""
        if trip_id in self.active_connections:
            for connection in self.active_connections[trip_id]:
                await connection.send_text(message)

    async def connect_personal(self, websocket: WebSocket, email: str):
        """Accepts a personal WebSocket connection."""
        await websocket.accept()
        self.personal_connections.setdefault(email, []).append(websocket)

    def disconnect_personal(self, websocket: WebSocket, email: str):
        """Removes a personal WebSocket connection."""
        if email in self.personal_connections:
            self.personal_connections[email].remove(websocket)

    async def send_personal_message(self, message: str, email: str):
        """Sends a message to a specific user via all their active connections."""
        if email in self.personal_connections:
            for connection in self.personal_connections[email]:
                await connection.send_text(message)

# Create a single, globally accessible instance of the manager
connection_manager = ConnectionManager()