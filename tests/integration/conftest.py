"""
Integration test configuration and fixtures
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from fastapi.testclient import TestClient

from src.api.main import app
from src.providers.manager import ProviderManager
from src.providers.models import ProviderConfig, ProviderType


@pytest.fixture
def integration_app(mock_env_vars, mock_provider_manager):
    """Create FastAPI app with mocked dependencies for integration tests"""
    # Set up provider manager
    app.state.provider_manager = mock_provider_manager
    
    # Mock orchestrator if needed
    app.state.orchestrator = None
    
    # Mock Redis
    mock_redis = AsyncMock()
    mock_redis.ping.return_value = "PONG"
    mock_redis.get.return_value = None
    mock_redis.set.return_value = True
    app.state.redis = mock_redis
    
    return app


@pytest.fixture
def integration_client(integration_app):
    """Create test client with proper app setup"""
    return TestClient(integration_app)


@pytest.fixture
def mock_orchestrator_response():
    """Mock orchestrator response for tests"""
    return {
        "fragments": [
            {
                "id": "frag_001",
                "content": "What is machine learning",
                "provider": "openai",
                "requires_context": False,
                "metadata": {"fragment_type": "general_query"}
            },
            {
                "id": "frag_002", 
                "content": "and how does it work",
                "provider": "google",
                "requires_context": True,
                "metadata": {"fragment_type": "follow_up"}
            }
        ],
        "aggregation_strategy": "sequential",
        "reasoning": "Split query for testing"
    }