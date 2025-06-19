"""
Server-Sent Events (SSE) implementation for real-time progress streaming
"""

import json
import asyncio
import logging
from typing import AsyncGenerator, Dict, Any, Optional
from datetime import datetime
from fastapi import Request
from sse_starlette.sse import EventSourceResponse

logger = logging.getLogger(__name__)

class SSEManager:
    """Manages Server-Sent Events connections and broadcasts"""
    
    def __init__(self):
        self.active_connections: Dict[str, asyncio.Queue] = {}
        # Store events for requests even when no SSE connection exists yet
        self.event_history: Dict[str, list] = {}
    
    async def connect(self, request_id: str) -> AsyncGenerator[str, None]:
        """Create a new SSE connection for a request"""
        logger.info(f"[SSE] Creating connection for {request_id}")
        
        # Check if connection already exists to prevent duplicates
        if request_id in self.active_connections:
            logger.warning(f"[SSE] Connection already exists for {request_id}, closing existing one")
            # Close existing connection by clearing its queue
            existing_queue = self.active_connections[request_id]
            try:
                existing_queue.put_nowait(None)  # Signal termination
            except asyncio.QueueFull:
                pass
        
        queue = asyncio.Queue()
        self.active_connections[request_id] = queue
        
        try:
            # Send initial connection event
            yield self._format_event({
                "type": "connection",
                "status": "connected",
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Send any historical events first (catch-up)
            if request_id in self.event_history:
                logger.info(f"[SSE] Sending {len(self.event_history[request_id])} historical events for {request_id}")
                for event in self.event_history[request_id]:
                    yield self._format_event(event)
            else:
                logger.warning(f"[SSE] No historical events found for {request_id}")
            
            # Keep connection alive and send new events
            while True:
                try:
                    # Wait for events with timeout for keepalive
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    
                    # Check for termination signal
                    if event is None:
                        logger.info(f"[SSE] Received termination signal for {request_id}")
                        break
                        
                    yield self._format_event(event)
                except asyncio.TimeoutError:
                    # Send keepalive ping
                    yield self._format_event({
                        "type": "ping",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
        except asyncio.CancelledError:
            pass
        finally:
            # Clean up connection
            if request_id in self.active_connections:
                del self.active_connections[request_id]
                
            # Clean up event history after some time
            # Keep events for 1 hour in case of reconnection
            asyncio.create_task(self._cleanup_event_history(request_id, delay=3600))
    
    async def send_event(self, request_id: str, event_type: str, data: Dict[str, Any]):
        """Send an event to a specific request's SSE stream"""
        event = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": request_id
        }
        
        # Always store in history first
        if request_id not in self.event_history:
            self.event_history[request_id] = []
        self.event_history[request_id].append(event)
        logger.info(f"[SSE] Stored event {event_type} for {request_id} (history: {len(self.event_history[request_id])} events)")
        
        # Send to active connection if exists
        if request_id in self.active_connections:
            await self.active_connections[request_id].put(event)
            logger.info(f"[SSE] Sent live event {event_type} to {request_id}")
        else:
            logger.info(f"[SSE] No active connection for {request_id}, stored for later")
    
    async def send_update(self, request_id: str, event_data: Dict[str, Any]):
        """Send a generic update event"""
        # Always store in history first
        if request_id not in self.event_history:
            self.event_history[request_id] = []
        self.event_history[request_id].append(event_data)
        
        # Send to active connection if exists
        if request_id in self.active_connections:
            await self.active_connections[request_id].put(event_data)
    
    async def send_step_update(self, request_id: str, step: str, status: str, 
                              progress: float = 0, message: str = "", 
                              additional_data: Optional[Dict] = None):
        """Send a step progress update"""
        event_data = {
            "type": "step_progress",
            "data": {
                "step": step,
                "status": status,  # starting, processing, completed
                "progress": progress,  # 0-100
                "message": message,
                "timestamp": datetime.utcnow().isoformat(),
                **(additional_data or {})
            }
        }
        
        await self.send_update(request_id, event_data)
    
    async def send_investor_update(self, request_id: str, metric_type: str, 
                                  metrics: Dict[str, Any]):
        """Send investor metrics update"""
        await self.send_event(request_id, f"investor_{metric_type}", metrics)
    
    async def send_error(self, request_id: str, error: str, details: Optional[Dict] = None):
        """Send error event"""
        await self.send_event(request_id, "error", {
            "error": error,
            "details": details or {}
        })
    
    async def send_completion(self, request_id: str, result: Dict[str, Any]):
        """Send completion event with final results"""
        await self.send_event(request_id, "complete", result)
    
    async def send_final_update(self, request_id: str, data: dict):
        """Send final completion update to connected clients"""
        event_data = {
            "type": "complete",
            "data": {
                **data,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
        await self.send_update(request_id, event_data)
    
    def _format_event(self, data: Dict[str, Any]) -> str:
        """Format data as SSE event"""
        # sse_starlette expects just the JSON string, it handles the SSE formatting
        return json.dumps(data)
    
    def disconnect(self, request_id: str):
        """Remove a connection"""
        if request_id in self.active_connections:
            del self.active_connections[request_id]
    
    def is_connected(self, request_id: str) -> bool:
        """Check if a request has an active SSE connection"""
        return request_id in self.active_connections
    
    async def wait_for_connection(self, request_id: str, timeout: float = 5.0):
        """Wait for SSE connection to be established"""
        start_time = asyncio.get_event_loop().time()
        while not self.is_connected(request_id):
            if asyncio.get_event_loop().time() - start_time > timeout:
                return False
            await asyncio.sleep(0.1)
        return True
    
    async def _cleanup_event_history(self, request_id: str, delay: int = 3600):
        """Clean up event history after delay"""
        await asyncio.sleep(delay)
        if request_id in self.event_history:
            del self.event_history[request_id]


# Global SSE manager instance
sse_manager = SSEManager()