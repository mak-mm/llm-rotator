"""
WebSocket endpoints for real-time updates
"""
import json
import asyncio
import logging
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.connection_info: Dict[WebSocket, dict] = {}
    
    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        self.connection_info[websocket] = {
            'connected_at': datetime.now(),
            'client_id': id(websocket)
        }
        logger.info(f"WebSocket connected: {id(websocket)}")
        
        # Send welcome message
        await self.send_personal_message({
            'type': 'connection',
            'data': {'status': 'connected', 'client_id': id(websocket)},
            'timestamp': datetime.now().isoformat()
        }, websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.connection_info:
            del self.connection_info[websocket]
        logger.info(f"WebSocket disconnected: {id(websocket)}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send message to websocket {id(websocket)}: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: dict):
        """Broadcast a message to all connected WebSockets"""
        if not self.active_connections:
            return
        
        message['timestamp'] = datetime.now().isoformat()
        disconnected = set()
        
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to broadcast to websocket {id(connection)}: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected connections
        for connection in disconnected:
            self.disconnect(connection)
    
    async def send_provider_status_update(self, provider_data: dict):
        """Send provider status update to all clients"""
        await self.broadcast({
            'type': 'provider_status',
            'data': provider_data
        })
    
    async def send_metrics_update(self, metrics_data: dict):
        """Send metrics update to all clients"""
        await self.broadcast({
            'type': 'metrics_update',
            'data': metrics_data
        })
    
    async def send_query_progress(self, request_id: str, status: str, progress: int = 0, message: str = None):
        """Send query progress update to all clients"""
        await self.broadcast({
            'type': 'query_progress',
            'data': {
                'request_id': request_id,
                'status': status,
                'progress': progress,
                'message': message
            }
        })
    
    def get_connection_count(self) -> int:
        """Get the number of active connections"""
        return len(self.active_connections)

# Global connection manager instance
manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint"""
    await manager.connect(websocket)
    
    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                await handle_client_message(websocket, message)
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    'type': 'error',
                    'data': {'message': 'Invalid JSON format'},
                    'timestamp': datetime.now().isoformat()
                }, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

async def handle_client_message(websocket: WebSocket, message: dict):
    """Handle messages received from clients"""
    message_type = message.get('type')
    
    if message_type == 'ping':
        # Respond to ping with pong
        await manager.send_personal_message({
            'type': 'pong',
            'data': {'timestamp': datetime.now().isoformat()},
            'timestamp': datetime.now().isoformat()
        }, websocket)
    
    elif message_type == 'subscribe':
        # Handle subscription requests (could be extended for specific subscriptions)
        topics = message.get('data', {}).get('topics', [])
        await manager.send_personal_message({
            'type': 'subscription_confirmed',
            'data': {'topics': topics},
            'timestamp': datetime.now().isoformat()
        }, websocket)
    
    else:
        logger.warning(f"Unknown message type: {message_type}")

# Utility functions for broadcasting updates
async def broadcast_provider_status(provider_data: dict):
    """Broadcast provider status update"""
    await manager.send_provider_status_update(provider_data)

async def broadcast_metrics_update(metrics_data: dict):
    """Broadcast metrics update"""
    await manager.send_metrics_update(metrics_data)

async def broadcast_query_progress(request_id: str, status: str, progress: int = 0, message: str = None):
    """Broadcast query progress update"""
    await manager.send_query_progress(request_id, status, progress, message)

# Background task to send periodic updates
async def periodic_updates():
    """Send periodic updates to connected clients"""
    while True:
        try:
            if manager.get_connection_count() > 0:
                # Send a heartbeat every 30 seconds
                await manager.broadcast({
                    'type': 'heartbeat',
                    'data': {
                        'server_time': datetime.now().isoformat(),
                        'connected_clients': manager.get_connection_count()
                    }
                })
            
            await asyncio.sleep(30)  # Wait 30 seconds
            
        except Exception as e:
            logger.error(f"Error in periodic updates: {e}")
            await asyncio.sleep(30)