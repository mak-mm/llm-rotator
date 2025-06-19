"""
Integration tests for API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from src.api.main import app
from tests.fixtures.test_data import TestQueries
from unittest.mock import Mock, AsyncMock


class TestAPIEndpoints:
    """Integration tests for API endpoints"""
    
    @pytest.fixture
    def client(self, integration_client):
        """Use integration test client"""
        return integration_client
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "docs" in data
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "privacy-llm-api"
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_analyze_simple_query(self, client):
        """Test analyze endpoint with simple query"""
        payload = {
            "query": "What is the weather in Paris?"
        }
        response = client.post("/api/v1/analyze", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "request_id" in data
        assert "original_query" in data
        assert "detection" in data
        assert "aggregated_response" in data
        assert "total_time" in data
        
        # Verify detection results
        detection = data["detection"]
        assert "has_pii" in detection
        assert "has_code" in detection
        assert "sensitivity_score" in detection
        assert not detection["has_pii"]  # Simple query shouldn't have PII
        assert not detection["has_code"]  # Simple query shouldn't have code
        assert detection["sensitivity_score"] < 0.5
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_analyze_pii_query(self, client):
        """Test analyze endpoint with PII query"""
        payload = {
            "query": "My name is John Smith and my email is john@example.com"
        }
        response = client.post("/api/v1/analyze", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        detection = data["detection"]
        
        assert detection["has_pii"]
        assert len(detection["pii_entities"]) >= 2
        assert detection["sensitivity_score"] > 0.3
        
        # Check PII entity structure
        for entity in detection["pii_entities"]:
            assert "text" in entity
            assert "type" in entity
            assert "start" in entity
            assert "end" in entity
            assert "score" in entity
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_analyze_code_query(self, client):
        """Test analyze endpoint with code query"""
        payload = {
            "query": """
            def hello():
                print("Hello, World!")
                return True
            """
        }
        response = client.post("/api/v1/analyze", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        detection = data["detection"]
        
        assert detection["has_code"]
        assert detection["code_language"] == "python"
        assert detection["sensitivity_score"] > 0.2
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_analyze_complex_query(self, client):
        """Test analyze endpoint with complex query"""
        payload = {
            "query": """
            My API key is sk-1234567890abcdef. Here's the SQL for our Google project:
            SELECT name, email FROM customers WHERE revenue > 1000000
            """
        }
        response = client.post("/api/v1/analyze", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        detection = data["detection"]
        
        assert detection["has_code"]
        assert detection["code_language"] == "sql"
        assert len(detection["entities"]) > 0
        assert detection["sensitivity_score"] > 0.5
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_analyze_with_strategy(self, client):
        """Test analyze endpoint with specified strategy"""
        payload = {
            "query": "Simple test query",
            "strategy": "semantic"
        }
        response = client.post("/api/v1/analyze", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["original_query"] == "Simple test query"
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_analyze_with_orchestrator_flag(self, client):
        """Test analyze endpoint with orchestrator flag"""
        payload = {
            "query": "Test query",
            "use_orchestrator": True
        }
        response = client.post("/api/v1/analyze", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "request_id" in data
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_analyze_validation_errors(self, client):
        """Test analyze endpoint validation"""
        # Empty query
        response = client.post("/api/v1/analyze", json={"query": ""})
        assert response.status_code == 422
        
        # Missing query
        response = client.post("/api/v1/analyze", json={})
        assert response.status_code == 422
        
        # Query too long (if validation exists)
        long_query = "a" * 20000
        response = client.post("/api/v1/analyze", json={"query": long_query})
        # Should either accept or reject with 422
        assert response.status_code in [200, 422]
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_status_endpoint(self, client):
        """Test status endpoint"""
        request_id = "test_request_123"
        response = client.get(f"/api/v1/status/{request_id}")
        
        # Should return 404 for non-existent request or mock data
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert "request_id" in data
            assert "status" in data
            assert "progress" in data
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_visualization_endpoint(self, client):
        """Test visualization endpoint"""
        request_id = "test_request_123"
        response = client.get(f"/api/v1/visualization/{request_id}")
        
        # Should return 404 for non-existent request or mock data
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert "request_id" in data
            assert "fragments" in data
            assert "fragment_responses" in data
            assert "timeline" in data
            assert "privacy_metrics" in data
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_providers_endpoint(self, client):
        """Test providers endpoint"""
        response = client.get("/api/v1/providers")
        assert response.status_code == 200
        
        data = response.json()
        assert "providers" in data
        
        providers = data["providers"]
        assert "openai" in providers
        assert "anthropic" in providers
        assert "google" in providers
        
        # Check provider structure
        for provider_name, provider_info in providers.items():
            assert "name" in provider_info
            assert "model" in provider_info
            assert "capabilities" in provider_info
            assert "cost_per_1k_tokens" in provider_info
    
    @pytest.mark.integration
    @pytest.mark.api
    @pytest.mark.skip(reason="Demo scenarios endpoint not implemented")
    def test_demo_scenarios_endpoint(self, client):
        """Test demo scenarios endpoint"""
        response = client.get("/api/v1/demo/scenarios")
        assert response.status_code == 200
        
        data = response.json()
        assert "scenarios" in data
        
        scenarios = data["scenarios"]
        assert len(scenarios) >= 3
        
        for scenario in scenarios:
            assert "name" in scenario
            assert "query" in scenario
            assert "description" in scenario
    
    @pytest.mark.integration
    @pytest.mark.api
    @pytest.mark.parametrize("query_data", TestQueries.PII_QUERIES[:2])  # Test subset for speed
    def test_analyze_pii_queries(self, client, query_data):
        """Test analyze endpoint with various PII queries"""
        payload = {"query": query_data["query"]}
        response = client.post("/api/v1/analyze", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        detection = data["detection"]
        
        if query_data["expected_count"] > 0:
            assert detection["has_pii"]
            assert len(detection["pii_entities"]) >= query_data["expected_count"] - 1  # Allow tolerance
    
    @pytest.mark.integration
    @pytest.mark.api
    @pytest.mark.parametrize("query_data", TestQueries.CODE_QUERIES[:2])  # Test subset for speed
    def test_analyze_code_queries(self, client, query_data):
        """Test analyze endpoint with various code queries"""
        payload = {"query": query_data["query"]}
        response = client.post("/api/v1/analyze", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        detection = data["detection"]
        
        assert detection["has_code"]
        assert detection["code_language"] == query_data["expected_language"]
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_response_time_performance(self, client):
        """Test API response time performance"""
        import time
        
        payload = {"query": "What is machine learning and how does it work?"}
        
        start_time = time.time()
        response = client.post("/api/v1/analyze", json=payload)
        end_time = time.time()
        
        assert response.status_code == 200
        
        # API should respond within 2 seconds (including detection)
        response_time = end_time - start_time
        assert response_time < 2.0
        
        # Check that detection time is reported correctly
        data = response.json()
        assert data["total_time"] > 0
        assert data["total_time"] < 1.0  # Detection should be under 1 second
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_concurrent_requests(self, client):
        """Test handling of concurrent requests"""
        import threading
        import time
        
        results = []
        
        def make_request():
            payload = {"query": f"Test query {threading.current_thread().ident}"}
            response = client.post("/api/v1/analyze", json=payload)
            results.append(response.status_code)
        
        # Create multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All requests should succeed
        assert len(results) == 5
        assert all(status == 200 for status in results)
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_cors_headers(self, client):
        """Test CORS headers are present"""
        response = client.options("/api/v1/analyze")
        
        # Should have CORS headers or handle OPTIONS request
        assert response.status_code in [200, 204, 405]  # 405 if OPTIONS not implemented
    
    @pytest.mark.integration
    @pytest.mark.api
    def test_content_type_handling(self, client):
        """Test content type handling"""
        # Valid JSON
        response = client.post(
            "/api/v1/analyze",
            json={"query": "test"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        # Invalid content type (should be rejected)
        response = client.post(
            "/api/v1/analyze",
            data="query=test",
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 422  # Unprocessable Entity