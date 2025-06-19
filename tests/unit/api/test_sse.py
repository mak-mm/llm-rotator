"""
Unit tests for SSE (Server-Sent Events) functionality
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch
from src.api.sse import SSEManager, sse_manager


class TestSSEManager:
    """Tests for SSE Manager"""
    
    @pytest.fixture
    def sse_manager(self):
        """Create fresh SSE manager instance"""
        return SSEManager()
    
    @pytest.mark.asyncio
    async def test_connect_to_sse(self, sse_manager):
        """Test creating an SSE connection"""
        request_id = "test_123"
        
        # Create connection generator
        connection_gen = sse_manager.connect(request_id)
        
        # Get first event (connection event)
        first_event = await connection_gen.__anext__()
        
        # Verify connection event format
        event_data = json.loads(first_event)
        assert event_data["type"] == "connection"
        assert event_data["status"] == "connected"
        assert event_data["request_id"] == request_id
    
    @pytest.mark.asyncio
    async def test_disconnect_from_sse(self, sse_manager):
        """Test disconnecting from SSE"""
        request_id = "test_123"
        
        # Simulate adding connections
        sse_manager.active_connections[request_id] = [asyncio.Queue()]
        
        # Disconnect
        sse_manager.disconnect(request_id)
        
        # Verify connection is removed
        assert request_id not in sse_manager.active_connections
    
    @pytest.mark.asyncio
    async def test_send_event(self, sse_manager):
        """Test sending an event to connections"""
        request_id = "test_123"
        
        # Add a queue to simulate active connection
        queue = asyncio.Queue()
        sse_manager.active_connections[request_id] = [queue]
        
        # Send event
        await sse_manager.send_event(request_id, "progress", {
            "step": 1, 
            "message": "Starting analysis"
        })
        
        # Verify event is queued
        assert not queue.empty()
        event = await queue.get()
        assert event["type"] == "progress"
        assert event["data"]["step"] == 1
    
    @pytest.mark.asyncio
    async def test_send_to_no_connections(self, sse_manager):
        """Test sending to request with no active connections"""
        request_id = "unregistered_123"
        
        # Send event to non-existent connection
        await sse_manager.send_event(request_id, "progress", {
            "step": 1, 
            "message": "Test"
        })
        
        # Should store in history even with no active connections
        assert request_id in sse_manager.event_history
        assert len(sse_manager.event_history[request_id]) == 1
    
    @pytest.mark.asyncio
    async def test_multiple_connections_same_request(self, sse_manager):
        """Test handling multiple connections for the same request"""
        request_id = "test_123"
        
        # Add multiple queues for same request
        queue1 = asyncio.Queue()
        queue2 = asyncio.Queue()
        sse_manager.active_connections[request_id] = [queue1, queue2]
        
        # Send event
        await sse_manager.send_event(request_id, "progress", {
            "message": "Test message"
        })
        
        # Both queues should receive the event
        assert not queue1.empty()
        assert not queue2.empty()
        
        event1 = await queue1.get()
        event2 = await queue2.get()
        assert event1["data"]["message"] == "Test message"
        assert event2["data"]["message"] == "Test message"
    
    @pytest.mark.asyncio
    async def test_connection_cleanup(self, sse_manager):
        """Test connection cleanup"""
        request_id = "test_123"
        
        # Add connection
        queue = asyncio.Queue()
        sse_manager.active_connections[request_id] = [queue]
        
        # Verify connection exists
        assert sse_manager.is_connected(request_id)
        
        # Disconnect
        sse_manager.disconnect(request_id)
        
        # Verify cleanup
        assert not sse_manager.is_connected(request_id)
        assert request_id not in sse_manager.active_connections
    
    @pytest.mark.asyncio
    async def test_event_formatting(self, sse_manager):
        """Test SSE event formatting"""
        event_data = {
            "step": 1, 
            "total": 7, 
            "message": "Analyzing query"
        }
        
        formatted = sse_manager._format_event({
            "type": "progress",
            "data": event_data
        })
        
        # Verify JSON format
        parsed = json.loads(formatted)
        assert parsed["type"] == "progress"
        assert parsed["data"]["step"] == 1
        assert parsed["data"]["message"] == "Analyzing query"
    
    @pytest.mark.asyncio
    async def test_concurrent_events(self, sse_manager):
        """Test sending events to multiple connections concurrently"""
        request_ids = [f"test_{i}" for i in range(5)]
        
        # Set up connections
        for request_id in request_ids:
            queue = asyncio.Queue()
            sse_manager.active_connections[request_id] = [queue]
        
        # Send events concurrently
        send_tasks = [
            sse_manager.send_event(rid, "test", {"value": "concurrent"})
            for rid in request_ids
        ]
        await asyncio.gather(*send_tasks)
        
        # Verify all events were sent
        for request_id in request_ids:
            queue = sse_manager.active_connections[request_id][0]
            assert not queue.empty()
            event = await queue.get()
            assert event["data"]["value"] == "concurrent"
    
    @pytest.mark.asyncio
    async def test_step_update(self, sse_manager):
        """Test sending step update events"""
        request_id = "test_123"
        
        # Add connection
        queue = asyncio.Queue()
        sse_manager.active_connections[request_id] = [queue]
        
        # Send step update
        await sse_manager.send_step_update(
            request_id, 
            "fragmentation", 
            "processing", 
            50, 
            "Creating fragments..."
        )
        
        # Verify event structure
        assert not queue.empty()
        event = await queue.get()
        assert event["type"] == "step_progress"
        assert event["data"]["step"] == "fragmentation"
        assert event["data"]["status"] == "processing"
        assert event["data"]["progress"] == 50
    
    @pytest.mark.asyncio
    async def test_event_history(self, sse_manager):
        """Test event history storage"""
        request_id = "test_123"
        
        # Send events without active connection
        await sse_manager.send_event(request_id, "step1", {"message": "Step 1"})
        await sse_manager.send_event(request_id, "step2", {"message": "Step 2"})
        
        # Verify events are stored in history
        assert request_id in sse_manager.event_history
        assert len(sse_manager.event_history[request_id]) == 2
        
        # Verify event content
        events = sse_manager.event_history[request_id]
        assert events[0]["type"] == "step1"
        assert events[1]["type"] == "step2"
    
    @pytest.mark.asyncio
    async def test_investor_update(self, sse_manager):
        """Test sending investor metrics update"""
        request_id = "test_123"
        
        # Add connection
        queue = asyncio.Queue()
        sse_manager.active_connections[request_id] = [queue]
        
        # Send investor update
        metrics = {
            "privacy_score": 0.85,
            "cost_savings": 0.65,
            "system_efficiency": 0.92
        }
        await sse_manager.send_investor_update(request_id, "kpis", metrics)
        
        # Verify event
        assert not queue.empty()
        event = await queue.get()
        assert event["type"] == "investor_kpis"
        assert event["data"]["privacy_score"] == 0.85
    
    @pytest.mark.asyncio
    async def test_error_event(self, sse_manager):
        """Test sending error events"""
        request_id = "test_123"
        
        # Add connection
        queue = asyncio.Queue()
        sse_manager.active_connections[request_id] = [queue]
        
        # Send error
        await sse_manager.send_error(request_id, "Processing failed", {
            "error_code": "PROCESSING_ERROR",
            "details": "Invalid input"
        })
        
        # Verify error event
        assert not queue.empty()
        event = await queue.get()
        assert event["type"] == "error"
        assert event["data"]["error"] == "Processing failed"
        assert event["data"]["details"]["error_code"] == "PROCESSING_ERROR"
    
    @pytest.mark.asyncio
    async def test_completion_event(self, sse_manager):
        """Test sending completion events"""
        request_id = "test_123"
        
        # Add connection
        queue = asyncio.Queue()
        sse_manager.active_connections[request_id] = [queue]
        
        # Send completion
        result = {
            "aggregated_response": "Final answer",
            "privacy_score": 0.9,
            "fragments_used": 3
        }
        await sse_manager.send_completion(request_id, result)
        
        # Verify completion event
        assert not queue.empty()
        event = await queue.get()
        assert event["type"] == "complete"
        assert event["data"]["aggregated_response"] == "Final answer"
    
    @pytest.mark.asyncio
    async def test_wait_for_connection(self, sse_manager):
        """Test waiting for connection to be established"""
        request_id = "test_123"
        
        # Should return False if no connection
        result = await sse_manager.wait_for_connection(request_id, timeout=0.1)
        assert result is False
        
        # Add connection
        queue = asyncio.Queue()
        sse_manager.active_connections[request_id] = [queue]
        
        # Should return True if connection exists
        result = await sse_manager.wait_for_connection(request_id, timeout=0.1)
        assert result is True


class TestSSEManagerIntegration:
    """Integration tests for SSE Manager"""
    
    @pytest.mark.asyncio
    async def test_full_sse_flow(self):
        """Test complete SSE flow from connection to completion"""
        manager = SSEManager()
        request_id = "integration_test_123"
        
        # Start connection
        connection_gen = manager.connect(request_id)
        
        # Get connection event
        connection_event = await connection_gen.__anext__()
        event_data = json.loads(connection_event)
        assert event_data["type"] == "connection"
        
        # Send progress events
        await manager.send_step_update(request_id, "detection", "processing", 25, "Detecting PII...")
        await manager.send_step_update(request_id, "fragmentation", "processing", 50, "Creating fragments...")
        await manager.send_step_update(request_id, "aggregation", "completed", 100, "Aggregating responses...")
        
        # Send completion
        await manager.send_completion(request_id, {"response": "Test complete"})
        
        # Verify events in history
        assert request_id in manager.event_history
        events = manager.event_history[request_id]
        
        # Should have step updates and completion
        step_events = [e for e in events if e["type"] == "step_progress"]
        complete_events = [e for e in events if e["type"] == "complete"]
        
        assert len(step_events) == 3
        assert len(complete_events) == 1
        assert complete_events[0]["data"]["response"] == "Test complete"


class TestGlobalSSEManager:
    """Tests for global SSE manager instance"""
    
    def test_global_instance_exists(self):
        """Test that global SSE manager instance exists"""
        assert sse_manager is not None
        assert isinstance(sse_manager, SSEManager)
    
    @pytest.mark.asyncio
    async def test_global_instance_functionality(self):
        """Test that global instance works correctly"""
        request_id = "global_test_123"
        
        # Should be able to send events
        await sse_manager.send_event(request_id, "test", {"message": "Global test"})
        
        # Should store in history
        assert request_id in sse_manager.event_history
        assert len(sse_manager.event_history[request_id]) == 1
        
        # Clean up
        if request_id in sse_manager.event_history:
            del sse_manager.event_history[request_id]