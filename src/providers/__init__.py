"""
LLM Providers Module

This module provides abstractions and implementations for different LLM providers
including OpenAI, Anthropic Claude, and Google Gemini with load balancing,
failover, and health monitoring capabilities.
"""

# Import provider implementations to ensure they're registered
from src.providers.anthropic_provider import AnthropicProvider

# Import main interfaces and classes
from src.providers.base import BaseLLMProvider, CircuitBreaker, ProviderFactory
from src.providers.google_provider import GoogleProvider
from src.providers.manager import ProviderManager
from src.providers.models import (
    LLMRequest,
    LLMResponse,
    ModelCapability,
    ProviderConfig,
    ProviderError,
    ProviderHealth,
    ProviderLoadBalancingConfig,
    ProviderMetrics,
    ProviderSelectionCriteria,
    ProviderStatus,
    ProviderType,
)
from src.providers.openai_provider import OpenAIProvider

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
