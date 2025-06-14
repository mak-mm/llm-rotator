"""
Provider manager for load balancing and routing requests
"""

import asyncio
import random
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from src.providers.base import BaseLLMProvider, ProviderFactory, CircuitBreaker
from src.providers.models import (
    ProviderConfig, ProviderLoadBalancingConfig, ProviderSelectionCriteria,
    LLMRequest, LLMResponse, ProviderError, ProviderHealth, ProviderMetrics,
    ModelCapability, ProviderStatus
)

logger = logging.getLogger(__name__)


class ProviderManager:
    """
    Manages multiple LLM providers with load balancing and failover
    """
    
    def __init__(self, config: ProviderLoadBalancingConfig):
        """
        Initialize the provider manager
        
        Args:
            config: Load balancing configuration
        """
        self.config = config
        self.providers: Dict[str, BaseLLMProvider] = {}
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self._provider_order = []
        self._current_index = 0
        self._health_check_task = None
        
        logger.info("Provider manager initialized")
    
    async def add_provider(self, provider_id: str, provider_config: ProviderConfig) -> None:
        """
        Add a provider to the manager
        
        Args:
            provider_id: Unique identifier for the provider
            provider_config: Provider configuration
        """
        try:
            # Create provider instance
            provider = ProviderFactory.create_provider(provider_id, provider_config)
            
            # Initialize the provider
            await provider.initialize()
            
            # Add to manager
            self.providers[provider_id] = provider
            self.circuit_breakers[provider_id] = CircuitBreaker(
                failure_threshold=self.config.circuit_breaker_threshold,
                timeout=self.config.circuit_breaker_timeout
            )
            self._provider_order.append(provider_id)
            
            logger.info(f"Added provider {provider_id} to manager")
            
        except Exception as e:
            logger.error(f"Failed to add provider {provider_id}: {str(e)}")
            raise
    
    async def remove_provider(self, provider_id: str) -> None:
        """
        Remove a provider from the manager
        
        Args:
            provider_id: Provider to remove
        """
        if provider_id in self.providers:
            await self.providers[provider_id].shutdown()
            del self.providers[provider_id]
            del self.circuit_breakers[provider_id]
            self._provider_order.remove(provider_id)
            
            logger.info(f"Removed provider {provider_id} from manager")
    
    async def process_request(self, request: LLMRequest, 
                            criteria: Optional[ProviderSelectionCriteria] = None) -> LLMResponse:
        """
        Process a request using the best available provider
        
        Args:
            request: Request to process
            criteria: Selection criteria for choosing provider
            
        Returns:
            LLM response
            
        Raises:
            ProviderError: If all providers fail
        """
        if not self.providers:
            raise ProviderError(
                request_id=request.request_id,
                provider_id="manager",
                error_type="no_providers",
                error_message="No providers available",
                is_retryable=False
            )
        
        # Select providers based on criteria
        candidate_providers = self._select_providers(criteria)
        
        last_error = None
        
        for provider_id in candidate_providers:
            provider = self.providers[provider_id]
            circuit_breaker = self.circuit_breakers[provider_id]
            
            try:
                # Check if provider is available
                if not provider.is_available():
                    logger.debug(f"Provider {provider_id} is not available, skipping")
                    continue
                
                # Use circuit breaker to call provider
                response = await circuit_breaker.call(provider.process_request, request)
                
                logger.debug(f"Request {request.request_id} processed by {provider_id}")
                return response
                
            except Exception as e:
                last_error = e
                logger.warning(f"Provider {provider_id} failed for request {request.request_id}: {str(e)}")
                
                # If this was the last provider, re-raise the error
                if provider_id == candidate_providers[-1]:
                    break
                
                # Otherwise, continue to next provider
                continue
        
        # All providers failed
        if last_error:
            if isinstance(last_error, ProviderError):
                raise last_error
            else:
                raise ProviderError(
                    request_id=request.request_id,
                    provider_id="manager",
                    error_type="all_providers_failed",
                    error_message=f"All providers failed. Last error: {str(last_error)}",
                    is_retryable=True
                )
        else:
            raise ProviderError(
                request_id=request.request_id,
                provider_id="manager",
                error_type="no_available_providers",
                error_message="No providers are currently available",
                is_retryable=True
            )
    
    def _select_providers(self, criteria: Optional[ProviderSelectionCriteria] = None) -> List[str]:
        """
        Select and order providers based on criteria and load balancing strategy
        
        Args:
            criteria: Selection criteria
            
        Returns:
            Ordered list of provider IDs to try
        """
        if not criteria:
            criteria = ProviderSelectionCriteria()
        
        # Filter providers by capabilities
        candidate_providers = []
        for provider_id, provider in self.providers.items():
            # Check required capabilities
            if criteria.required_capabilities:
                provider_capabilities = provider.get_capabilities()
                if not all(cap in provider_capabilities for cap in criteria.required_capabilities):
                    continue
            
            # Check preferred providers
            if criteria.preferred_providers:
                if provider.config.provider_type not in criteria.preferred_providers:
                    continue
            
            # Check success rate
            metrics = provider.get_metrics()
            if metrics.success_rate() < criteria.min_success_rate:
                continue
            
            # Check latency requirements
            if criteria.max_latency_ms:
                if metrics.average_latency_ms > criteria.max_latency_ms:
                    continue
            
            candidate_providers.append(provider_id)
        
        if not candidate_providers:
            # If no providers match criteria, use all available providers
            candidate_providers = [pid for pid, p in self.providers.items() if p.is_available()]
        
        # Apply load balancing strategy
        return self._apply_load_balancing(candidate_providers, criteria)
    
    def _apply_load_balancing(self, providers: List[str], 
                            criteria: ProviderSelectionCriteria) -> List[str]:
        """
        Apply load balancing strategy to order providers
        
        Args:
            providers: List of candidate providers
            criteria: Selection criteria
            
        Returns:
            Ordered list of providers
        """
        if not providers:
            return []
        
        if self.config.strategy == "round_robin":
            # Round robin - rotate through providers
            ordered = []
            start_index = self._current_index % len(providers)
            
            for i in range(len(providers)):
                index = (start_index + i) % len(providers)
                ordered.append(providers[index])
            
            self._current_index += 1
            return ordered
        
        elif self.config.strategy == "random":
            # Random selection
            shuffled = providers.copy()
            random.shuffle(shuffled)
            return shuffled
        
        elif self.config.strategy == "weighted":
            # Weighted selection based on configuration
            weighted_providers = []
            for provider_id in providers:
                weight = self.config.weights.get(provider_id, 1.0)
                weighted_providers.extend([provider_id] * int(weight * 10))
            
            if weighted_providers:
                selected = random.choice(weighted_providers)
                # Put selected provider first, then randomize the rest
                remaining = [p for p in providers if p != selected]
                random.shuffle(remaining)
                return [selected] + remaining
        
        elif self.config.strategy == "performance":
            # Sort by performance metrics
            def performance_score(provider_id: str) -> float:
                provider = self.providers[provider_id]
                metrics = provider.get_metrics()
                
                # Calculate score based on success rate and latency
                success_rate = metrics.success_rate() / 100.0
                latency_score = 1.0 / (1.0 + metrics.average_latency_ms / 1000.0)
                
                return success_rate * 0.7 + latency_score * 0.3
            
            return sorted(providers, key=performance_score, reverse=True)
        
        elif self.config.strategy == "cost_optimized":
            # Sort by cost preference
            def cost_score(provider_id: str) -> float:
                # This would require cost data - simplified for now
                provider = self.providers[provider_id]
                
                # Rough cost estimates (lower is better)
                cost_map = {
                    "openai": 1.0,
                    "anthropic": 1.2,
                    "google": 0.8
                }
                
                base_cost = cost_map.get(provider.config.provider_type.value, 1.0)
                
                if criteria.cost_preference == "low":
                    return -base_cost  # Negative for ascending sort
                elif criteria.cost_preference == "high":
                    return base_cost   # Positive for descending sort
                else:  # balanced
                    # Balance cost with performance
                    metrics = provider.get_metrics()
                    performance = metrics.success_rate() / 100.0
                    return performance - base_cost * 0.5
            
            if criteria.cost_preference == "low":
                return sorted(providers, key=cost_score)
            else:
                return sorted(providers, key=cost_score, reverse=True)
        
        # Default: return providers as-is
        return providers
    
    async def start_health_monitoring(self) -> None:
        """Start background health monitoring of providers"""
        if self._health_check_task:
            return
        
        self._health_check_task = asyncio.create_task(self._health_check_loop())
        logger.info("Started provider health monitoring")
    
    async def stop_health_monitoring(self) -> None:
        """Stop background health monitoring"""
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
            self._health_check_task = None
            
        logger.info("Stopped provider health monitoring")
    
    async def _health_check_loop(self) -> None:
        """Background health check loop"""
        while True:
            try:
                await asyncio.sleep(self.config.health_check_interval)
                
                # Check all providers
                tasks = []
                for provider_id, provider in self.providers.items():
                    tasks.append(self._check_provider_health(provider_id, provider))
                
                await asyncio.gather(*tasks, return_exceptions=True)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health check loop: {str(e)}")
    
    async def _check_provider_health(self, provider_id: str, provider: BaseLLMProvider) -> None:
        """Check health of a specific provider"""
        try:
            import time
            start_time = time.time()
            
            is_healthy = await provider.health_check()
            response_time = (time.time() - start_time) * 1000
            
            if is_healthy:
                provider.health.mark_success(response_time)
            else:
                provider.health.mark_failure("Health check failed")
                
        except Exception as e:
            provider.health.mark_failure(str(e))
            logger.warning(f"Health check failed for provider {provider_id}: {str(e)}")
    
    def get_provider_metrics(self) -> Dict[str, ProviderMetrics]:
        """Get metrics for all providers"""
        return {pid: provider.get_metrics() for pid, provider in self.providers.items()}
    
    def get_provider_health(self) -> Dict[str, ProviderHealth]:
        """Get health status for all providers"""
        return {pid: provider.get_health() for pid, provider in self.providers.items()}
    
    def get_available_providers(self) -> List[str]:
        """Get list of currently available providers"""
        return [pid for pid, provider in self.providers.items() if provider.is_available()]
    
    async def shutdown(self) -> None:
        """Shutdown the manager and all providers"""
        await self.stop_health_monitoring()
        
        # Shutdown all providers
        shutdown_tasks = []
        for provider in self.providers.values():
            shutdown_tasks.append(provider.shutdown())
        
        await asyncio.gather(*shutdown_tasks, return_exceptions=True)
        
        self.providers.clear()
        self.circuit_breakers.clear()
        self._provider_order.clear()
        
        logger.info("Provider manager shut down")