"""
Shared test configuration and fixtures
"""

import pytest
import asyncio
import os
from unittest.mock import Mock, AsyncMock
from typing import Generator, Any

# Import fixtures from test_data
from tests.fixtures.test_data import (
    simple_queries,
    pii_queries,
    code_queries,
    entity_queries,
    complex_queries,
    detection_thresholds,
    strategy_mapping,
    mock_api_responses
)


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_env_vars(monkeypatch):
    """Mock environment variables for testing"""
    test_env = {
        "OPENAI_API_KEY": "test-openai-key",
        "ANTHROPIC_API_KEY": "test-anthropic-key",
        "GOOGLE_API_KEY": "test-google-key",
        "REDIS_URL": "redis://localhost:6379",
        "DEBUG": "true",
        "ENVIRONMENT": "test"
    }
    
    for key, value in test_env.items():
        monkeypatch.setenv(key, value)
    
    return test_env


@pytest.fixture
def mock_redis_client():
    """Mock Redis client for testing"""
    mock_client = AsyncMock()
    mock_client.ping.return_value = "PONG"
    mock_client.get.return_value = None
    mock_client.set.return_value = True
    mock_client.setex.return_value = True
    mock_client.incr.return_value = 1
    mock_client.expire.return_value = True
    mock_client.ttl.return_value = -1
    return mock_client


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client for testing"""
    mock_client = Mock()
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = "Mock OpenAI response"
    mock_response.usage.total_tokens = 25
    
    mock_client.chat.completions.create.return_value = mock_response
    return mock_client


@pytest.fixture
def mock_anthropic_client():
    """Mock Anthropic client for testing"""
    mock_client = AsyncMock()
    mock_response = Mock()
    mock_response.content = [Mock()]
    mock_response.content[0].text = "Mock Anthropic response"
    mock_response.usage.input_tokens = 15
    mock_response.usage.output_tokens = 10
    
    mock_client.messages.create.return_value = mock_response
    return mock_client


@pytest.fixture
def mock_google_client():
    """Mock Google client for testing"""
    mock_client = Mock()
    mock_response = Mock()
    mock_response.candidates = [Mock()]
    mock_response.candidates[0].content.parts = [Mock()]
    mock_response.candidates[0].content.parts[0].text = "Mock Google response"
    mock_response.usage_metadata.total_token_count = 20
    
    mock_client.generate_content.return_value = mock_response
    return mock_client


@pytest.fixture
def temp_test_files(tmp_path):
    """Create temporary test files"""
    test_files = {}
    
    # Create a test text file
    text_file = tmp_path / "test.txt"
    text_file.write_text("This is a test file for testing purposes.")
    test_files["text"] = str(text_file)
    
    # Create a test JSON file
    json_file = tmp_path / "test.json"
    json_file.write_text('{"test": "data", "number": 42}')
    test_files["json"] = str(json_file)
    
    return test_files


@pytest.fixture(autouse=True)
def setup_test_logging():
    """Configure logging for tests"""
    import logging
    
    # Set logging level to WARNING to reduce noise in tests
    logging.getLogger("src").setLevel(logging.WARNING)
    logging.getLogger("presidio").setLevel(logging.ERROR)
    logging.getLogger("spacy").setLevel(logging.ERROR)
    
    yield
    
    # Reset logging after tests
    logging.getLogger("src").setLevel(logging.INFO)


@pytest.fixture
def performance_monitor():
    """Monitor test performance"""
    import time
    
    class PerformanceMonitor:
        def __init__(self):
            self.start_time = None
            self.end_time = None
        
        def start(self):
            self.start_time = time.time()
        
        def stop(self):
            self.end_time = time.time()
        
        @property
        def elapsed_time(self):
            if self.start_time and self.end_time:
                return self.end_time - self.start_time
            return None
        
        def assert_under_threshold(self, threshold_seconds):
            assert self.elapsed_time is not None, "Timer not stopped"
            assert self.elapsed_time < threshold_seconds, f"Operation took {self.elapsed_time:.3f}s, expected < {threshold_seconds}s"
    
    return PerformanceMonitor()


@pytest.fixture
def sample_detection_report():
    """Create a sample detection report for testing"""
    from src.detection.models import DetectionReport, CodeDetection, PIIEntity, NamedEntity, PIIEntityType
    
    return DetectionReport(
        has_pii=True,
        pii_entities=[
            PIIEntity(
                text="john@example.com",
                type=PIIEntityType.EMAIL,
                start=20,
                end=36,
                score=0.99
            )
        ],
        pii_density=0.15,
        code_detection=CodeDetection(
            has_code=True,
            language="python",
            confidence=0.95,
            code_blocks=[]
        ),
        named_entities=[
            NamedEntity(
                text="Google",
                label="ORG",
                start=45,
                end=51
            )
        ],
        sensitivity_score=0.75,
        processing_time=85.3,
        analyzers_used=["presidio", "guesslang", "spacy"],
        recommended_strategy="semantic",
        requires_orchestrator=True
    )


def pytest_configure(config):
    """Configure pytest"""
    # Add custom markers
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
    config.addinivalue_line(
        "markers", "api: marks tests as API tests"
    )
    config.addinivalue_line(
        "markers", "detection: marks tests as detection engine tests"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection"""
    # Mark tests based on their location
    for item in items:
        # Mark all tests in unit/ directory as unit tests
        if "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        
        # Mark all tests in integration/ directory as integration tests
        if "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        
        # Mark detection tests
        if "detection" in str(item.fspath):
            item.add_marker(pytest.mark.detection)
        
        # Mark API tests
        if "api" in str(item.fspath):
            item.add_marker(pytest.mark.api)