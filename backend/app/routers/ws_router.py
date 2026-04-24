from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt
from app.core.config import settings
import logging
import json

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """
    Manages all active WebSocket connections.
    broadcast() sends a message to every connected client.
    """

    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        logger.info(f"WS Client Connected — {len(self.active)} Total")

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)
        logger.info(f"WS Client Disconnected — {len(self.active)} Remaining")

    async def broadcast(self, message: dict):
        """Send a JSON message to all connected clients."""
        if not self.active:
            return
        data = json.dumps(message)
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        # Clean up dead connections
        for ws in dead:
            self.disconnect(ws)
        logger.info(f"WS Broadcast Sent to {len(self.active)} Client(s): {message}")


# Singleton — imported by scheduler to broadcast after ingestion
manager = ConnectionManager()


def _verify_token(token: str) -> bool:
    """Verify JWT token. Returns True if valid, False otherwise."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload.get("sub") is not None
    except JWTError:
        return False


@router.websocket("/ws/live")
async def websocket_live(
    ws:    WebSocket,
    token: str = Query(default=""),
):
    """
    WebSocket endpoint for real-time tender broadcast.
    Client connects with: ws://localhost:8000/ws/live?token=<jwt>
    Receives JSON messages when new tenders are ingested.
    """
    # Verify JWT token
    if not token or not _verify_token(token):
        await ws.close(code=4001)
        logger.warning("WS Connection Rejected - Invalid Token")
        return

    await manager.connect(ws)

    # Send welcome message so frontend knows connection is live
    await ws.send_text(json.dumps({
        "type":    "Connected",
        "message": "War Room Live Feed Connected",
    }))

    try:
        while True:
            # Keep connection alive — wait for any client message
            # Client sends "ping", we send "pong"
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(ws)