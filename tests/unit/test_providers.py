"""
Unit tests for LLM providers
"""

import pytest
import pytest_asyncio
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from src.providers.models import (
    ProviderType, ProviderConfig, LLMRequest, LLMResponse, ProviderError,
    ModelCapability, ProviderLoadBalancingConfig, ProviderSelectionCriteria
)
from src.providers.base import BaseLLMProvider, ProviderFactory
from src.providers.manager import ProviderManager
from src.providers.openai_provider import OpenAIProvider
from src.providers.anthropic_provider import AnthropicProvider
from src.providers.google_provider import GoogleProvider


class MockProvider(BaseLLMProvider):
    """Mock provider for testing"""
    
    def __init__(self, provider_id: str, config: ProviderConfig, should_fail: bool = False):
        super().__init__(provider_id, config)
        self.should_fail = should_fail
        self.initialize_called = False
        self.generate_calls = []
    
    async def initialize(self) -> None:
        self.initialize_called = True
        if self.should_fail:
            raise Exception("Mock initialization failure")
    
    async def generate(self, request: LLMRequest) -> LLMResponse:
        self.generate_calls.append(request)
        
        if self.should_fail:
            raise ProviderError(
                request_id=request.request_id,
                provider_id=self.provider_id,
                error_type="mock_error",
                error_message="Mock provider failure"
            )
        
        return LLMResponse(
            request_id=request.request_id,
            provider_id=self.provider_id,
            content="Mock response",
            finish_reason="stop",
            tokens_used=10,
            latency_ms=100.0,
            model_used="mock-model"
        )
    
    async def health_check(self) -> bool:
        return not self.should_fail
    
    def get_capabilities(self) -> list[ModelCapability]:
        return [ModelCapability.TEXT_GENERATION]
    
    def estimate_tokens(self, text: str) -> int:
        return len(text) // 4


class TestProviderModels:
    """Test provider data models"""
    
    def test_provider_config_creation(self):
        """Test creating provider configuration"""
        config = ProviderConfig(
            provider_type=ProviderType.OPENAI,
            api_key="test-key",
            model_name="gpt-4.1",
            capabilities=[ModelCapability.TEXT_GENERATION, ModelCapability.CODE_ANALYSIS]
        )
        
        assert config.provider_type == ProviderType.OPENAI
        assert config.api_key == "test-key"
        assert config.model_name == "gpt-4.1"
        assert config.max_tokens == 4000  # Default value
        assert ModelCapability.TEXT_GENERATION in config.capabilities
    
    def test_llm_request_creation(self):
        """Test creating LLM request"""
        request = LLMRequest(
            prompt="Test prompt",
            max_tokens=100,
            temperature=0.7,
            requires_sensitive_handling=True
        )
        
        assert request.prompt == "Test prompt"
        assert request.max_tokens == 100
        assert request.temperature == 0.7
        assert request.requires_sensitive_handling is True
        assert request.request_id is not None
        assert request.priority == 5  # Default value
    
    def test_llm_response_creation(self):
        """Test creating LLM response"""
        response = LLMResponse(
            request_id="test-request",
            provider_id="test-provider",
            content="Test response",
            finish_reason="stop",
            tokens_used=50,
            latency_ms=200.0,
            model_used="test-model"
        )
        
        assert response.request_id == "test-request"
        assert response.provider_id == "test-provider"
        assert response.content == "Test response"
        assert response.tokens_used == 50
        assert response.latency_ms == 200.0


class TestProviderFactory:
    """Test provider factory"""
    
    def test_register_provider(self):
        """Test registering a provider type"""
        ProviderFactory.register_provider("mock", MockProvider)
        
        assert "mock" in ProviderFactory.get_supported_providers()
    
    def test_create_provider(self):
        """Test creating a provider instance"""
        config = ProviderConfig(
            provider_type=ProviderType.OPENAI,
            api_key="test-key",
            model_name="test-model"
        )
        
        provider = ProviderFactory.create_provider("test-provider", config)
        assert provider.provider_id == "test-provider"
        assert provider.config.api_key == "test-key"
    
    def test_create_unknown_provider(self):
        """Test creating unknown provider type raises error"""
        # Temporarily clear all providers to test unknown type
        original_providers = ProviderFactory._provider_classes.copy()
        ProviderFactory._provider_classes.clear()
        
        try:
            config = ProviderConfig(
                provider_type=ProviderType.OPENAI,
                api_key="test-key", 
                model_name="test-model"
            )
            
            with pytest.raises(ValueError, match="Unknown provider type"):
                ProviderFactory.create_provider("test-provider", config)
        finally:
            # Restore original providers
            ProviderFactory._provider_classes.update(original_providers)


class TestBaseLLMProvider:
    """Test base provider functionality"""
    
    @pytest.fixture
    def mock_config(self):
        return ProviderConfig(
            provider_type=ProviderType.OPENAI,
            api_key="test-key",
            model_name="test-model"
        )
    
    @pytest.fixture
    def mock_provider(self, mock_config):
        return MockProvider("test-provider", mock_config)
    
    @pytest.fixture
    def sample_request(self):
        return LLMRequest(prompt="Test prompt")
    
    def test_provider_initialization(self, mock_provider):
        """Test provider initialization"""
        assert mock_provider.provider_id == "test-provider"
        assert mock_provider.config.api_key == "test-key"
        assert mock_provider.metrics.provider_id == "test-provider"
        assert mock_provider.health.provider_id == "test-provider"
    
    @pytest.mark.asyncio
    async def test_successful_request_processing(self, mock_provider, sample_request):
        """Test successful request processing"""
        await mock_provider.initialize()
        
        response = await mock_provider.process_request(sample_request)
        
        assert isinstance(response, LLMResponse)
        assert response.request_id == sample_request.request_id
        assert response.provider_id == "test-provider"
        assert response.content == "Mock response"
        
        # Check metrics updated
        assert mock_provider.metrics.total_requests == 1
        assert mock_provider.metrics.successful_requests == 1
        assert mock_provider.metrics.failed_requests == 0
    
    @pytest.mark.asyncio
    async def test_failed_request_processing(self, mock_config, sample_request):
        """Test failed request processing"""
        failing_provider = MockProvider("failing-provider", mock_config, should_fail=False)
        await failing_provider.initialize()
        
        # Make provider fail during request processing, not initialization
        failing_provider.should_fail = True
        
        with pytest.raises(ProviderError):
            await failing_provider.process_request(sample_request)
        
        # Check metrics updated
        assert failing_provider.metrics.total_requests == 1
        assert failing_provider.metrics.successful_requests == 0
        assert failing_provider.metrics.failed_requests == 1
    
    def test_token_estimation(self, mock_provider):
        """Test token estimation"""
        text = "This is a test text with some words"
        tokens = mock_provider.estimate_tokens(text)
        assert tokens > 0
        assert isinstance(tokens, int)
    
    def test_capabilities(self, mock_provider):
        """Test capability checking"""
        capabilities = mock_provider.get_capabilities()
        assert ModelCapability.TEXT_GENERATION in capabilities
    
    @pytest.mark.asyncio
    async def test_health_check(self, mock_provider):
        """Test health check functionality"""
        await mock_provider.initialize()
        
        # Healthy provider
        is_healthy = await mock_provider.health_check()
        assert is_healthy is True
        
        # Unhealthy provider
        mock_provider.should_fail = True
        is_healthy = await mock_provider.health_check()
        assert is_healthy is False


class TestProviderManager:
    """Test provider manager functionality"""
    
    @pytest.fixture
    def manager_config(self):
        return ProviderLoadBalancingConfig(
            strategy="round_robin",
            failover_enabled=True,
            health_check_interval=30
        )
    
    @pytest.fixture
    def provider_configs(self):
        return {
            "provider1": ProviderConfig(
                provider_type=ProviderType.OPENAI,
                api_key="key1",
                model_name="model1"
            ),
            "provider2": ProviderConfig(
                provider_type=ProviderType.ANTHROPIC,
                api_key="key2", 
                model_name="model2"
            )
        }
    
    @pytest_asyncio.fixture
    async def manager(self, manager_config):
        """Create a provider manager for testing"""
        manager = ProviderManager(manager_config)
        yield manager
        await manager.shutdown()
    
    def test_manager_initialization(self, manager_config):
        """Test manager initialization"""
        manager = ProviderManager(manager_config)
        assert manager.config == manager_config
        assert len(manager.providers) == 0
    
    @pytest.mark.asyncio
    async def test_add_provider(self, manager, provider_configs):
        """Test adding a provider to manager"""
        # Register mock provider first
        ProviderFactory.register_provider("mock", MockProvider)
        
        # Override provider type for mock
        config = provider_configs["provider1"]
        config.provider_type = ProviderType.OPENAI  # Will use mock due to registration
        
        with patch.object(ProviderFactory, 'create_provider') as mock_create:
            mock_provider = MockProvider("provider1", config)
            mock_create.return_value = mock_provider
            
            await manager.add_provider("provider1", config)
            
            assert "provider1" in manager.providers
            assert manager.providers["provider1"] == mock_provider
            assert mock_provider.initialize_called
    
    @pytest.mark.asyncio 
    async def test_remove_provider(self, manager, provider_configs):
        """Test removing a provider from manager"""
        # Add a provider first
        ProviderFactory.register_provider("mock", MockProvider)
        config = provider_configs["provider1"]
        
        with patch.object(ProviderFactory, 'create_provider') as mock_create:
            mock_provider = MockProvider("provider1", config)
            mock_create.return_value = mock_provider
            
            await manager.add_provider("provider1", config)
            assert "provider1" in manager.providers
            
            await manager.remove_provider("provider1")
            assert "provider1" not in manager.providers
    
    @pytest.mark.asyncio
    async def test_process_request_success(self, manager, provider_configs):
        """Test successful request processing through manager"""
        # Setup
        ProviderFactory.register_provider("mock", MockProvider)
        config = provider_configs["provider1"]
        
        with patch.object(ProviderFactory, 'create_provider') as mock_create:
            mock_provider = MockProvider("provider1", config)
            mock_create.return_value = mock_provider
            
            await manager.add_provider("provider1", config)
            
            request = LLMRequest(prompt="Test prompt")
            response = await manager.process_request(request)
            
            assert isinstance(response, LLMResponse)
            assert response.provider_id == "provider1"
            assert len(mock_provider.generate_calls) == 1
    
    @pytest.mark.asyncio
    async def test_process_request_failover(self, manager, provider_configs):
        """Test failover when first provider fails during request processing"""
        # Setup with two working providers, but first one fails during requests
        ProviderFactory.register_provider("mock", MockProvider)
        
        with patch.object(ProviderFactory, 'create_provider') as mock_create:
            # Both providers initialize successfully
            failing_provider = MockProvider("provider1", provider_configs["provider1"], should_fail=False)
            working_provider = MockProvider("provider2", provider_configs["provider2"], should_fail=False)
            
            mock_create.side_effect = [failing_provider, working_provider]
            
            await manager.add_provider("provider1", provider_configs["provider1"])
            await manager.add_provider("provider2", provider_configs["provider2"])
            
            # Make first provider fail during request processing
            failing_provider.should_fail = True
            
            request = LLMRequest(prompt="Test prompt")
            response = await manager.process_request(request)
            
            # Should get response from second provider
            assert isinstance(response, LLMResponse)
            assert response.provider_id == "provider2"
    
    @pytest.mark.asyncio
    async def test_no_providers_error(self, manager):
        """Test error when no providers are available"""
        request = LLMRequest(prompt="Test prompt")
        
        with pytest.raises(ProviderError, match="No providers available"):
            await manager.process_request(request)
    
    def test_provider_selection_criteria(self, manager):
        """Test provider selection with criteria"""
        criteria = ProviderSelectionCriteria(
            required_capabilities=[ModelCapability.TEXT_GENERATION],
            preferred_providers=[ProviderType.ANTHROPIC],
            min_success_rate=95.0
        )
        
        # This tests the criteria object creation
        assert criteria.required_capabilities == [ModelCapability.TEXT_GENERATION]
        assert criteria.preferred_providers == [ProviderType.ANTHROPIC]
        assert criteria.min_success_rate == 95.0
    
    def test_get_available_providers(self, manager):
        """Test getting available providers"""
        available = manager.get_available_providers()
        assert isinstance(available, list)
        assert len(available) == 0  # No providers added yet


@pytest.mark.integration
class TestProviderImplementations:
    """Integration tests for specific provider implementations"""
    
    def test_openai_provider_capabilities(self):
        """Test OpenAI provider capabilities"""
        config = ProviderConfig(
            provider_type=ProviderType.OPENAI,
            api_key="test-key",
            model_name="gpt-4.1"
        )
        
        provider = OpenAIProvider("openai-test", config)
        capabilities = provider.get_capabilities()
        
        assert ModelCapability.TEXT_GENERATION in capabilities
        assert ModelCapability.CODE_ANALYSIS in capabilities
    
    def test_anthropic_provider_capabilities(self):
        """Test Anthropic provider capabilities"""
        config = ProviderConfig(
            provider_type=ProviderType.ANTHROPIC,
            api_key="test-key",
            model_name="claude-sonnet-4-20250514"
        )
        
        provider = AnthropicProvider("anthropic-test", config)
        capabilities = provider.get_capabilities()
        
        assert ModelCapability.TEXT_GENERATION in capabilities
        assert ModelCapability.SENSITIVE_DATA in capabilities
    
    def test_google_provider_capabilities(self):
        """Test Google provider capabilities"""
        config = ProviderConfig(
            provider_type=ProviderType.GOOGLE,
            api_key="test-key",
            model_name="gemini-2.5-flash-preview-04-17"
        )
        
        provider = GoogleProvider("google-test", config)
        capabilities = provider.get_capabilities()
        
        assert ModelCapability.TEXT_GENERATION in capabilities
        assert ModelCapability.VISION in capabilities
    
    def test_token_estimation_consistency(self):
        """Test that token estimation is reasonably consistent across providers"""
        test_text = "This is a test text with exactly twenty-five characters and some words."
        
        configs = [
            ProviderConfig(provider_type=ProviderType.OPENAI, api_key="test", model_name="gpt-4"),
            ProviderConfig(provider_type=ProviderType.ANTHROPIC, api_key="test", model_name="claude-sonnet-4-20250514"),
            ProviderConfig(provider_type=ProviderType.GOOGLE, api_key="test", model_name="gemini-2.5-flash-preview-04-17")
        ]
        
        providers = [
            OpenAIProvider("openai", configs[0]),
            AnthropicProvider("anthropic", configs[1]),
            GoogleProvider("google", configs[2])
        ]
        
        estimates = [provider.estimate_tokens(test_text) for provider in providers]
        
        # All estimates should be reasonable (between 10 and 50 for this text)
        for estimate in estimates:
            assert 10 <= estimate <= 50
        
        # Estimates should be relatively close to each other (within factor of 2)
        min_estimate, max_estimate = min(estimates), max(estimates)
        assert max_estimate / min_estimate <= 2.0