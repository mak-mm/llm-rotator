"""
Base provider interface and abstract classes
"""

from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
import asyncio
import time
import logging
from datetime import datetime

from src.providers.models import (
    ProviderConfig, ProviderMetrics, ProviderHealth, ProviderStatus,
    LLMRequest, LLMResponse, ProviderError, ModelCapability
)

logger = logging.getLogger(__name__)


class BaseLLMProvider(ABC):
    """
    Abstract base class for all LLM providers
    """
    
    def __init__(self, provider_id: str, config: ProviderConfig):
        """
        Initialize the provider
        
        Args:
            provider_id: Unique identifier for this provider instance
            config: Provider configuration
        """
        self.provider_id = provider_id
        self.config = config
        self.metrics = ProviderMetrics(provider_id=provider_id)
        self.health = ProviderHealth(
            provider_id=provider_id,
            status=ProviderStatus.AVAILABLE
        )
        self._client = None
        
        logger.info(f"Initialized {self.__class__.__name__} provider: {provider_id}")
    
    @abstractmethod
    async def initialize(self) -> None:
        """
        Initialize the provider's client and validate configuration
        Should be called before making any requests
        """
        pass
    
    @abstractmethod
    async def generate(self, request: LLMRequest) -> LLMResponse:
        """
        Generate a response for the given request
        
        Args:
            request: The LLM request to process
            
        Returns:
            LLM response
            
        Raises:
            ProviderError: If the request fails
        """
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """
        Perform a health check on the provider
        
        Returns:
            True if provider is healthy, False otherwise
        """
        pass
    
    @abstractmethod
    def get_capabilities(self) -> List[ModelCapability]:
        """
        Get the capabilities of this provider's model
        
        Returns:
            List of supported capabilities
        """
        pass
    
    @abstractmethod
    def estimate_tokens(self, text: str) -> int:
        """
        Estimate the number of tokens in the given text
        
        Args:
            text: Text to estimate tokens for
            
        Returns:
            Estimated token count
        """
        pass
    
    async def process_request(self, request: LLMRequest) -> LLMResponse:
        """
        Process a request with metrics tracking and error handling
        
        Args:
            request: The request to process
            
        Returns:
            LLM response
            
        Raises:
            ProviderError: If the request fails after retries
        """
        start_time = time.time()
        
        try:
            # Check if provider is healthy
            if not self.health.is_healthy():
                raise ProviderError(
                    request_id=request.request_id,
                    provider_id=self.provider_id,
                    error_type="provider_unhealthy",
                    error_message=f"Provider {self.provider_id} is not healthy: {self.health.status}",
                    is_retryable=False
                )
            
            # Validate request
            self._validate_request(request)
            
            # Generate response
            response = await self.generate(request)
            
            # Update metrics
            latency_ms = (time.time() - start_time) * 1000
            self.metrics.update_metrics(
                success=True,
                latency_ms=latency_ms,
                tokens_used=response.tokens_used
            )
            
            # Update health status
            self.health.mark_success(latency_ms)
            
            logger.debug(f"Request {request.request_id} processed successfully by {self.provider_id}")
            return response
            
        except Exception as e:
            # Update metrics
            latency_ms = (time.time() - start_time) * 1000
            self.metrics.update_metrics(success=False, latency_ms=latency_ms)
            
            # Update health status
            self.health.mark_failure(str(e))
            
            # Convert to ProviderError if not already
            if isinstance(e, ProviderError):
                raise e
            else:
                raise ProviderError(
                    request_id=request.request_id,
                    provider_id=self.provider_id,
                    error_type="generation_error",
                    error_message=str(e),
                    is_retryable=True
                )
    
    def _validate_request(self, request: LLMRequest) -> None:
        """
        Validate a request before processing
        
        Args:
            request: Request to validate
            
        Raises:
            ValueError: If request is invalid
        """
        if not request.prompt.strip():
            raise ValueError("Request prompt cannot be empty")
        
        max_tokens = request.max_tokens or self.config.max_tokens
        estimated_tokens = self.estimate_tokens(request.prompt)
        
        if estimated_tokens > max_tokens:
            raise ValueError(f"Prompt too long: {estimated_tokens} tokens > {max_tokens} limit")
    
    def get_metrics(self) -> ProviderMetrics:
        """Get current provider metrics"""
        return self.metrics
    
    def get_health(self) -> ProviderHealth:
        """Get current provider health status"""
        return self.health
    
    def reset_metrics(self) -> None:
        """Reset provider metrics"""
        self.metrics = ProviderMetrics(provider_id=self.provider_id)
    
    def is_available(self) -> bool:
        """Check if provider is available for requests"""
        return self.health.status == ProviderStatus.AVAILABLE
    
    def is_rate_limited(self) -> bool:
        """Check if provider is currently rate limited"""
        return self.health.status == ProviderStatus.RATE_LIMITED
    
    async def shutdown(self) -> None:
        """
        Gracefully shutdown the provider
        Clean up any resources
        """
        logger.info(f"Shutting down provider {self.provider_id}")
        if self._client:
            # Close client connections if applicable
            pass


class ProviderFactory:
    """
    Factory class for creating provider instances
    """
    
    _provider_classes: Dict[str, type] = {}
    
    @classmethod
    def register_provider(cls, provider_type: str, provider_class: type) -> None:
        """
        Register a provider class
        
        Args:
            provider_type: Type identifier for the provider
            provider_class: The provider class to register
        """
        cls._provider_classes[provider_type] = provider_class
        logger.info(f"Registered provider type: {provider_type}")
    
    @classmethod
    def create_provider(cls, provider_id: str, config: ProviderConfig) -> BaseLLMProvider:
        """
        Create a provider instance
        
        Args:
            provider_id: Unique identifier for the provider
            config: Provider configuration
            
        Returns:
            Provider instance
            
        Raises:
            ValueError: If provider type is not registered
        """
        provider_type = config.provider_type.value
        
        if provider_type not in cls._provider_classes:
            raise ValueError(f"Unknown provider type: {provider_type}")
        
        provider_class = cls._provider_classes[provider_type]
        return provider_class(provider_id, config)
    
    @classmethod
    def get_supported_providers(cls) -> List[str]:
        """Get list of supported provider types"""
        return list(cls._provider_classes.keys())


class CircuitBreaker:
    """
    Circuit breaker implementation for provider fault tolerance
    """
    
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        """
        Initialize circuit breaker
        
        Args:
            failure_threshold: Number of failures before opening circuit
            timeout: Time to wait before attempting to close circuit
        """
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half_open
    
    async def call(self, func, *args, **kwargs):
        """
        Execute function with circuit breaker protection
        
        Args:
            func: Function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments
            
        Returns:
            Function result
            
        Raises:
            Exception: If circuit is open or function fails
        """
        if self.state == "open":
            if self._should_attempt_reset():
                self.state = "half_open"
            else:
                raise Exception("Circuit breaker is open")
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset"""
        if self.last_failure_time is None:
            return False
        
        return (datetime.utcnow() - self.last_failure_time).total_seconds() >= self.timeout
    
    def _on_success(self) -> None:
        """Handle successful call"""
        self.failure_count = 0
        self.state = "closed"
    
    def _on_failure(self) -> None:
        """Handle failed call"""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "open"