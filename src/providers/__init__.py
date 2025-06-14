"""
LLM Providers Module

This module provides abstractions and implementations for different LLM providers
including OpenAI, Anthropic Claude, and Google Gemini with load balancing,
failover, and health monitoring capabilities.
"""

# Import provider implementations to ensure they're registered
from src.providers.openai_provider import OpenAIProvider
from src.providers.anthropic_provider import AnthropicProvider
from src.providers.google_provider import GoogleProvider

# Import main interfaces and classes
from src.providers.base import BaseLLMProvider, ProviderFactory, CircuitBreaker
from src.providers.manager import ProviderManager
from src.providers.models import (
    ProviderType,
    ProviderStatus,
    ModelCapability,
    ProviderConfig,
    ProviderMetrics,
    ProviderHealth,
    LLMRequest,
    LLMResponse,
    ProviderError,
    ProviderLoadBalancingConfig,
    ProviderSelectionCriteria
)

__all__ = [
    # Base classes
    "BaseLLMProvider",
    "ProviderFactory",
    "CircuitBreaker",
    
    # Provider implementations
    "OpenAIProvider",
    "AnthropicProvider", 
    "GoogleProvider",
    
    # Manager
    "ProviderManager",
    
    # Models and enums
    "ProviderType",
    "ProviderStatus",
    "ModelCapability",
    "ProviderConfig",
    "ProviderMetrics",
    "ProviderHealth",
    "LLMRequest",
    "LLMResponse",
    "ProviderError",
    "ProviderLoadBalancingConfig",
    "ProviderSelectionCriteria"
]