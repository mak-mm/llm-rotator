"""
Google Gemini provider implementation
"""

import asyncio
import logging

import google.generativeai as genai
from google.generativeai.types import GenerateContentResponse

from src.providers.base import BaseLLMProvider
from typing import List

from src.providers.models import (
    LLMRequest,
    LLMResponse,
    ModelCapability,
    ProviderConfig,
    ProviderError,
    ProviderType,
)

logger = logging.getLogger(__name__)


class GoogleProvider(BaseLLMProvider):
    """
    Google Gemini API provider implementation
    """

    def __init__(self, provider_id: str, config: ProviderConfig):
        """
        Initialize Google provider

        Args:
            provider_id: Unique identifier for this provider
            config: Provider configuration
        """
        super().__init__(provider_id, config)
        self._model = None

        # Gemini model capabilities mapping
        self._model_capabilities = {
            "gemini-2.5-flash": [
                ModelCapability.TEXT_GENERATION,
                ModelCapability.CODE_ANALYSIS,
                ModelCapability.VISION,
                ModelCapability.FUNCTION_CALLING
            ],
            "gemini-2.5-flash-preview": [
                ModelCapability.TEXT_GENERATION,
                ModelCapability.CODE_ANALYSIS,
                ModelCapability.VISION,
                ModelCapability.FUNCTION_CALLING
            ]
        }

    async def initialize(self) -> None:
        """Initialize the Google Gemini client"""
        try:
            # Configure the API key
            genai.configure(api_key=self.config.api_key)

            # Initialize the model
            generation_config = {
                "temperature": self.config.temperature,
                "max_output_tokens": self.config.max_tokens,
                **self.config.extra_params
            }

            self._model = genai.GenerativeModel(
                model_name=self.config.model_name,
                generation_config=generation_config
            )

            # Test the connection with a simple request
            await self.health_check()

            logger.info(f"Google provider {self.provider_id} initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Google provider {self.provider_id}: {str(e)}")
            raise ProviderError(
                request_id="init",
                provider_id=self.provider_id,
                error_type="initialization_error",
                error_message=f"Failed to initialize Google client: {str(e)}",
                is_retryable=False
            )

    async def generate(self, request: LLMRequest) -> LLMResponse:
        """
        Generate a response using Google's Gemini API

        Args:
            request: The LLM request to process

        Returns:
            LLM response

        Raises:
            ProviderError: If the request fails
        """
        if not self._model:
            raise ProviderError(
                request_id=request.request_id,
                provider_id=self.provider_id,
                error_type="client_not_initialized",
                error_message="Google model not initialized",
                is_retryable=False
            )

        try:
            # Prepare the prompt
            prompt = request.prompt
            if request.system_prompt:
                prompt = f"System instructions: {request.system_prompt}\n\n{prompt}"

            # Override generation config for this request if specified
            generation_config = {}
            if request.max_tokens:
                generation_config["max_output_tokens"] = request.max_tokens
            if request.temperature is not None:
                generation_config["temperature"] = request.temperature

            # Handle Gemini 2.5 Flash thinking capabilities
            if "2.5-flash" in self.config.model_name.lower():
                # Default thinking budget for 2.5 Flash models
                self.config.extra_params.get("thinking_budget", 1024)

            # Make the API call
            import time
            start_time = time.time()

            # Google's API is inherently async, but we need to wrap it
            loop = asyncio.get_event_loop()

            if generation_config:
                # Create a temporary model with custom config
                # Get the base generation config from our initial config
                base_config = {
                    "temperature": self.config.temperature,
                    "max_output_tokens": self.config.max_tokens,
                    **self.config.extra_params
                }
                temp_model = genai.GenerativeModel(
                    model_name=self.config.model_name,
                    generation_config={**base_config, **generation_config}
                )
                response = await loop.run_in_executor(
                    None,
                    temp_model.generate_content,
                    prompt
                )
            else:
                response = await loop.run_in_executor(
                    None,
                    self._model.generate_content,
                    prompt
                )

            latency_ms = (time.time() - start_time) * 1000

            # Extract response data
            content = response.text if response.text else ""
            finish_reason = self._map_finish_reason(response)

            # Token counting for Gemini
            tokens_used = 0
            if hasattr(response, 'usage_metadata') and response.usage_metadata:
                tokens_used = (response.usage_metadata.prompt_token_count +
                             response.usage_metadata.candidates_token_count)
            else:
                # Fallback estimation
                tokens_used = self.estimate_tokens(prompt + content)

            return LLMResponse(
                request_id=request.request_id,
                provider_id=self.provider_id,
                content=content,
                finish_reason=finish_reason,
                tokens_used=tokens_used,
                latency_ms=latency_ms,
                model_used=self.config.model_name,
                metadata={
                    "prompt_token_count": getattr(response.usage_metadata, 'prompt_token_count', 0) if hasattr(response, 'usage_metadata') else 0,
                    "candidates_token_count": getattr(response.usage_metadata, 'candidates_token_count', 0) if hasattr(response, 'usage_metadata') else 0,
                    "safety_ratings": [rating.category.name + ":" + rating.probability.name for rating in response.candidates[0].safety_ratings] if response.candidates else []
                }
            )

        except Exception as e:
            error_type = "api_error"
            is_retryable = True

            error_message = str(e)

            # Handle specific Google API errors
            if "quota" in error_message.lower() or "rate" in error_message.lower():
                error_type = "rate_limit"
                is_retryable = True
            elif "auth" in error_message.lower() or "permission" in error_message.lower():
                error_type = "authentication_error"
                is_retryable = False
            elif "safety" in error_message.lower():
                error_type = "safety_filter"
                is_retryable = False

            raise ProviderError(
                request_id=request.request_id,
                provider_id=self.provider_id,
                error_type=error_type,
                error_message=error_message,
                is_retryable=is_retryable
            )

    def _map_finish_reason(self, response: GenerateContentResponse) -> str:
        """
        Map Google's finish reason to our standard format

        Args:
            response: Google API response

        Returns:
            Standardized finish reason
        """
        if not response.candidates:
            return "unknown"

        candidate = response.candidates[0]
        if hasattr(candidate, 'finish_reason'):
            finish_reason = candidate.finish_reason.name.lower()

            # Map to our standard reasons
            if finish_reason == "stop":
                return "stop"
            elif finish_reason == "max_tokens":
                return "length"
            elif finish_reason == "safety":
                return "content_filter"
            else:
                return finish_reason

        return "unknown"

    async def health_check(self) -> bool:
        """
        Perform a health check by making a simple API call

        Returns:
            True if healthy, False otherwise
        """
        try:
            if not self._model:
                return False

            # Make a minimal request to test connectivity
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                self._model.generate_content,
                "test"
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
        Uses a simple approximation: 1 token ≈ 4 characters for Gemini

        Args:
            text: Text to estimate tokens for

        Returns:
            Estimated token count
        """
        # Similar to OpenAI's tokenization
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

        self._model = None

        logger.info(f"Google provider {self.provider_id} shut down")


# Register the provider with the factory
from src.providers.base import ProviderFactory

ProviderFactory.register_provider(ProviderType.GOOGLE.value, GoogleProvider)
