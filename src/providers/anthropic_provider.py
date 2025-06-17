"""
Anthropic Claude provider implementation
"""

import logging

import anthropic
from anthropic import AsyncAnthropic

from src.providers.base import BaseLLMProvider
from typing import List, Optional

from src.providers.models import (
    LLMRequest,
    LLMResponse,
    ModelCapability,
    ProviderConfig,
    ProviderError,
    ProviderType,
)

logger = logging.getLogger(__name__)


class AnthropicProvider(BaseLLMProvider):
    """
    Anthropic Claude API provider implementation
    """

    def __init__(self, provider_id: str, config: ProviderConfig):
        """
        Initialize Anthropic provider

        Args:
            provider_id: Unique identifier for this provider
            config: Provider configuration
        """
        super().__init__(provider_id, config)
        self._client: Optional[AsyncAnthropic] = None

        # Claude model capabilities mapping
        self._model_capabilities = {
            "claude-sonnet-4": [
                ModelCapability.TEXT_GENERATION,
                ModelCapability.CODE_ANALYSIS,
                ModelCapability.SENSITIVE_DATA,
                ModelCapability.VISION,
                ModelCapability.FUNCTION_CALLING
            ],
            "claude-4-sonnet": [
                ModelCapability.TEXT_GENERATION,
                ModelCapability.CODE_ANALYSIS,
                ModelCapability.SENSITIVE_DATA,
                ModelCapability.VISION,
                ModelCapability.FUNCTION_CALLING
            ]
        }

    async def initialize(self) -> None:
        """Initialize the Anthropic client"""
        try:
            self._client = AsyncAnthropic(
                api_key=self.config.api_key,
                base_url=self.config.base_url,
                timeout=self.config.timeout
            )

            # Test the connection with a simple request
            await self.health_check()

            logger.info(f"Anthropic provider {self.provider_id} initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Anthropic provider {self.provider_id}: {str(e)}")
            raise ProviderError(
                request_id="init",
                provider_id=self.provider_id,
                error_type="initialization_error",
                error_message=f"Failed to initialize Anthropic client: {str(e)}",
                is_retryable=False
            )

    async def generate(self, request: LLMRequest) -> LLMResponse:
        """
        Generate a response using Anthropic's API

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
                error_message="Anthropic client not initialized",
                is_retryable=False
            )

        try:
            # Prepare messages
            messages = []

            # Claude doesn't use system messages in the same way as OpenAI
            # We'll prepend system prompt to the user message if present
            prompt = request.prompt
            if request.system_prompt:
                prompt = f"System: {request.system_prompt}\n\nHuman: {prompt}"
            else:
                prompt = f"Human: {prompt}"

            messages.append({
                "role": "user",
                "content": prompt
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

            response = await self._client.messages.create(**params)

            latency_ms = (time.time() - start_time) * 1000

            # Extract response data
            content = ""
            if response.content:
                # Claude returns content as a list of blocks
                content = " ".join([block.text for block in response.content if hasattr(block, 'text')])

            finish_reason = response.stop_reason or "unknown"

            # Claude usage tracking
            input_tokens = response.usage.input_tokens if response.usage else 0
            output_tokens = response.usage.output_tokens if response.usage else 0
            tokens_used = input_tokens + output_tokens

            return LLMResponse(
                request_id=request.request_id,
                provider_id=self.provider_id,
                content=content,
                finish_reason=finish_reason,
                tokens_used=tokens_used,
                latency_ms=latency_ms,
                model_used=response.model,
                metadata={
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "stop_reason": response.stop_reason,
                    "response_id": response.id
                }
            )

        except anthropic.APIError as e:
            error_type = "api_error"
            is_retryable = True

            # Handle specific Anthropic errors
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
            response = await self._client.messages.create(
                model=self.config.model_name,
                messages=[{"role": "user", "content": "Human: test"}],
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
        return [ModelCapability.TEXT_GENERATION, ModelCapability.SENSITIVE_DATA]

    def estimate_tokens(self, text: str) -> int:
        """
        Estimate the number of tokens in the given text
        Uses a simple approximation: 1 token ≈ 3.5 characters for Claude

        Args:
            text: Text to estimate tokens for

        Returns:
            Estimated token count
        """
        # Claude typically has a slightly better token efficiency than GPT
        return int(len(text) / 3.5) + 1

    def supports_capability(self, capability: ModelCapability) -> bool:
        """
        Check if the provider supports a specific capability

        Args:
            capability: Capability to check

        Returns:
            True if supported, False otherwise
        """
        return capability in self.get_capabilities()

    def is_preferred_for_sensitive_data(self) -> bool:
        """
        Check if this provider is preferred for sensitive data processing
        Claude is generally preferred for sensitive data due to Constitutional AI

        Returns:
            True if preferred for sensitive data
        """
        return ModelCapability.SENSITIVE_DATA in self.get_capabilities()

    async def shutdown(self) -> None:
        """Shutdown the provider and clean up resources"""
        await super().shutdown()

        if self._client:
            await self._client.close()
            self._client = None

        logger.info(f"Anthropic provider {self.provider_id} shut down")


# Register the provider with the factory
from src.providers.base import ProviderFactory

ProviderFactory.register_provider(ProviderType.ANTHROPIC.value, AnthropicProvider)
