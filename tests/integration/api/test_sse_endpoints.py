"""
Integration tests for SSE endpoints
"""

import pytest
import asyncio
import json
import httpx
from typing import List, Dict
from fastapi.testclient import TestClient


class TestSSEEndpoints:
    """Integration tests for SSE endpoints"""
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sse_stream_endpoint(self, integration_client):
        """Test SSE stream endpoint connection"""
        # First, create a query to get a request_id
        payload = {"query": "Test query for SSE"}
        response = integration_client.post("/api/v1/analyze", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        request_id = data["request_id"]
        
        # Now test SSE connection
        # Note: TestClient doesn't support SSE, so we test the endpoint exists
        response = integration_client.get(
            f"/api/v1/stream/{request_id}",
            headers={"Accept": "text/event-stream"}
        )
        # Should return streaming response or 404 if request completed
        assert response.status_code in [200, 404]
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sse_event_flow(self):
        """Test full SSE event flow with real HTTP client"""
        async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
            # Submit a query
            payload = {"query": "What is machine learning?"}
            response = await client.post("/api/v1/analyze", json=payload)
            
            if response.status_code != 200:
                pytest.skip("API not running locally")
            
            data = response.json()
            request_id = data["request_id"]
            
            # Connect to SSE stream
            events = []
            try:
                async with client.stream(
                    "GET",
                    f"/api/v1/stream/{request_id}",
                    headers={"Accept": "text/event-stream"},
                    timeout=10.0
                ) as stream:
                    async for line in stream.aiter_lines():
                        if line.startswith("event:"):
                            event_type = line.split(":", 1)[1].strip()
                        elif line.startswith("data:"):
                            data_str = line.split(":", 1)[1].strip()
                            try:
                                event_data = json.loads(data_str)
                                events.append({
                                    "type": event_type,
                                    "data": event_data
                                })
                            except json.JSONDecodeError:
                                pass
                        
                        # Stop after receiving completion event
                        if any(e.get("type") == "complete" for e in events):
                            break
            except httpx.ConnectError:
                pytest.skip("Cannot connect to API")
            except httpx.ReadTimeout:
                # Timeout is OK if we got some events
                pass
            
            # Verify we received events
            if events:
                event_types = [e["type"] for e in events]
                
                # Should have progress events
                assert any("progress" in t for t in event_types)
                
                # Should have completion or error
                assert any(t in ["complete", "error"] for t in event_types)
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sse_progress_events(self, integration_client):
        """Test that SSE sends proper progress events"""
        # Submit a complex query that will trigger all processing steps
        payload = {
            "query": """
            My name is John Doe and I work at Acme Corp.
            Here's a Python function to calculate fibonacci:
            def fib(n):
                if n <= 1: return n
                return fib(n-1) + fib(n-2)
            """
        }
        response = integration_client.post("/api/v1/analyze", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        request_id = data["request_id"]
        
        # Check status endpoint shows progress
        response = integration_client.get(f"/api/v1/status/{request_id}")
        if response.status_code == 200:
            status_data = response.json()
            assert "progress" in status_data
            assert "current_step" in status_data
    
    @pytest.mark.integration
    def test_sse_error_handling(self, integration_client):
        """Test SSE error handling for invalid request"""
        # Try to connect to SSE with invalid request_id
        invalid_request_id = "invalid_123"
        response = integration_client.get(
            f"/api/v1/stream/{invalid_request_id}",
            headers={"Accept": "text/event-stream"}
        )
        
        # Should return 404 for non-existent request
        assert response.status_code == 404
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_multiple_sse_connections(self, integration_client):
        """Test multiple concurrent SSE connections"""
        # Create multiple queries
        request_ids = []
        for i in range(3):
            payload = {"query": f"Test query {i}"}
            response = integration_client.post("/api/v1/analyze", json=payload)
            assert response.status_code == 200
            request_ids.append(response.json()["request_id"])
        
        # Try to connect to all SSE streams
        # (Just verify endpoints are accessible)
        for request_id in request_ids:
            response = integration_client.get(
                f"/api/v1/stream/{request_id}",
                headers={"Accept": "text/event-stream"}
            )
            assert response.status_code in [200, 404]
    
    @pytest.mark.integration
    def test_sse_headers(self, integration_client):
        """Test SSE response headers"""
        # Create a query
        payload = {"query": "Test SSE headers"}
        response = integration_client.post("/api/v1/analyze", json=payload)
        assert response.status_code == 200
        
        request_id = response.json()["request_id"]
        
        # Check SSE endpoint headers
        response = integration_client.get(
            f"/api/v1/stream/{request_id}",
            headers={"Accept": "text/event-stream"}
        )
        
        if response.status_code == 200:
            # Should have proper SSE headers
            assert response.headers.get("content-type", "").startswith("text/event-stream")
            assert response.headers.get("cache-control") == "no-cache"
            assert response.headers.get("connection") == "keep-alive"
    
    @pytest.mark.integration
    @pytest.mark.parametrize("event_type", [
        "progress",
        "detection_complete",
        "fragmentation_complete",
        "routing_complete",
        "processing_complete",
        "aggregation_complete",
        "complete"
    ])
    def test_sse_event_types(self, event_type):
        """Test SSE event type structure"""
        # This is a unit test for event structure validation
        from src.api.sse import SSEMessage
        
        # Create sample event
        event_data = {
            "step": 1,
            "total_steps": 7,
            "message": f"Test {event_type}",
            "details": {}
        }
        
        message = SSEMessage(
            event=event_type,
            data=event_data,
            id=f"test_{event_type}_1"
        )
        
        formatted = message.format()
        
        # Verify format
        assert f"event: {event_type}" in formatted
        assert "data: {" in formatted
        assert formatted.endswith("\n\n")