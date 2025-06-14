"""
OpenAI provider implementation
"""

import asyncio
import logging
from typing import List, Optional
import openai
from openai import AsyncOpenAI

from src.providers.base import BaseLLMProvider
from src.providers.models import (
    ProviderConfig, LLMRequest, LLMResponse, ProviderError,
    ModelCapability, ProviderType
)

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseLLMProvider):
    """
    OpenAI API provider implementation
    """
    
    def __init__(self, provider_id: str, config: ProviderConfig):
        """
        Initialize OpenAI provider
        
        Args:
            provider_id: Unique identifier for this provider
            config: Provider configuration
        """
        super().__init__(provider_id, config)
        self._client: Optional[AsyncOpenAI] = None
        
        # OpenAI model capabilities mapping
        self._model_capabilities = {
            "gpt-4": [
                ModelCapability.TEXT_GENERATION,
                ModelCapability.CODE_ANALYSIS,
                ModelCapability.FUNCTION_CALLING
            ],
            "gpt-4-turbo": [
                ModelCapability.TEXT_GENERATION,
                ModelCapability.CODE_ANALYSIS,
                ModelCapability.FUNCTION_CALLING,
                ModelCapability.VISION
            ],
            "gpt-3.5-turbo": [
                ModelCapability.TEXT_GENERATION,
                ModelCapability.CODE_ANALYSIS,
                ModelCapability.FUNCTION_CALLING
            ],
            "text-embedding-ada-002": [
                ModelCapability.EMBEDDING
            ]
        }
    
    async def initialize(self) -> None:
        """Initialize the OpenAI client"""
        try:
            self._client = AsyncOpenAI(
                api_key=self.config.api_key,
                base_url=self.config.base_url,
                timeout=self.config.timeout
            )
            
            # Test the connection with a simple request
            await self.health_check()
            
            logger.info(f"OpenAI provider {self.provider_id} initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI provider {self.provider_id}: {str(e)}")
            raise ProviderError(
                request_id="init",
                provider_id=self.provider_id,
                error_type="initialization_error",
                error_message=f"Failed to initialize OpenAI client: {str(e)}",
                is_retryable=False
            )
    
    async def generate(self, request: LLMRequest) -> LLMResponse:
        """
        Generate a response using OpenAI's API
        
        Args:
            request: The LLM request to process
            
        Returns:
            LLM response
            
        Raises:
            ProviderError: If the request fails
        """
        if not self._client:
            raise ProviderError(
                request_id=request.request_id,
                provider_id=self.provider_id,
                error_type="client_not_initialized",
                error_message="OpenAI client not initialized",
                is_retryable=False
            )
        
        try:
            # Prepare messages
            messages = []
            
            if request.system_prompt:
                messages.append({
                    "role": "system",
                    "content": request.system_prompt
                })
            
            messages.append({
                "role": "user",
                "content": request.prompt
            })
            
            # Prepare request parameters
            params = {
                "model": self.config.model_name,
                "messages": messages,
                "max_tokens": request.max_tokens or self.config.max_tokens,
                "temperature": request.temperature or self.config.temperature,
                **self.config.extra_params
            }
            
            # Make the API call
            import time
            start_time = time.time()
            
            response = await self._client.chat.completions.create(**params)
            
            latency_ms = (time.time() - start_time) * 1000
            
            # Extract response data
            choice = response.choices[0]
            content = choice.message.content or ""
            finish_reason = choice.finish_reason or "unknown"
            tokens_used = response.usage.total_tokens if response.usage else 0
            
            return LLMResponse(
                request_id=request.request_id,
                provider_id=self.provider_id,
                content=content,
                finish_reason=finish_reason,
                tokens_used=tokens_used,
                latency_ms=latency_ms,
                model_used=response.model,
                metadata={
                    "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "response_id": response.id
                }
            )
            
        except openai.APIError as e:
            error_type = "api_error"
            is_retryable = True
            
            # Handle specific OpenAI errors
            if hasattr(e, 'status_code'):
                if e.status_code == 429:  # Rate limit
                    error_type = "rate_limit"
                    is_retryable = True
                elif e.status_code in [401, 403]:  # Authentication
                    error_type = "authentication_error"
                    is_retryable = False
                elif e.status_code >= 500:  # Server error
                    error_type = "server_error"
                    is_retryable = True
            
            raise ProviderError(
                request_id=request.request_id,
                provider_id=self.provider_id,
                error_type=error_type,
                error_message=str(e),
                error_code=getattr(e, 'code', None),
                is_retryable=is_retryable,
                retry_after=getattr(e, 'retry_after', None)
            )
            
        except Exception as e:
            raise ProviderError(
                request_id=request.request_id,
                provider_id=self.provider_id,
                error_type="unexpected_error",
                error_message=str(e),
                is_retryable=True
            )
    
    async def health_check(self) -> bool:
        """
        Perform a health check by making a simple API call
        
        Returns:
            True if healthy, False otherwise
        """
        try:
            if not self._client:
                return False
            
            # Make a minimal request to test connectivity
            response = await self._client.chat.completions.create(
                model=self.config.model_name,
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1,
                temperature=0
            )
            
            return response is not None
            
        except Exception as e:
            logger.warning(f"Health check failed for provider {self.provider_id}: {str(e)}")
            return False
    
    def get_capabilities(self) -> List[ModelCapability]:
        """
        Get the capabilities of the configured model
        
        Returns:
            List of supported capabilities
        """
        model_name = self.config.model_name.lower()
        
        # Check for exact match first
        if model_name in self._model_capabilities:
            return self._model_capabilities[model_name]
        
        # Check for partial matches
        for model_pattern, capabilities in self._model_capabilities.items():
            if model_pattern in model_name:
                return capabilities
        
        # Default capabilities for unknown models
        return [ModelCapability.TEXT_GENERATION]
    
    def estimate_tokens(self, text: str) -> int:
        """
        Estimate the number of tokens in the given text
        Uses a simple approximation: 1 token ≈ 4 characters
        
        Args:
            text: Text to estimate tokens for
            
        Returns:
            Estimated token count
        """
        # Simple approximation for OpenAI models
        # More accurate estimation would use tiktoken library
        return len(text) // 4 + 1
    
    def supports_capability(self, capability: ModelCapability) -> bool:
        """
        Check if the provider supports a specific capability
        
        Args:
            capability: Capability to check
            
        Returns:
            True if supported, False otherwise
        """
        return capability in self.get_capabilities()
    
    async def shutdown(self) -> None:
        """Shutdown the provider and clean up resources"""
        await super().shutdown()
        
        if self._client:
            await self._client.close()
            self._client = None
            
        logger.info(f"OpenAI provider {self.provider_id} shut down")


# Register the provider with the factory
from src.providers.base import ProviderFactory
ProviderFactory.register_provider(ProviderType.OPENAI.value, OpenAIProvider)