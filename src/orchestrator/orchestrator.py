"""
Main orchestrator component that coordinates the entire privacy-preserving workflow
"""

import asyncio
import logging
import time
from typing import List, Dict, Optional, Any
from datetime import datetime

from src.orchestrator.models import (
    OrchestrationRequest, OrchestrationResponse, OrchestrationConfig,
    ProcessingStage, FragmentProcessingResult, OrchestrationMetrics,
    PrivacyLevel
)
from src.orchestrator.response_aggregator import ResponseAggregator
from src.orchestrator.intelligence import (
    PrivacyIntelligence, CostOptimizer, PerformanceMonitor
)
from src.detection.engine import DetectionEngine
from src.fragmentation.fragmenter import QueryFragmenter
from src.providers.manager import ProviderManager
from src.providers.models import (
    LLMRequest, ProviderSelectionCriteria, ProviderType, ModelCapability
)

logger = logging.getLogger(__name__)


class QueryOrchestrator:
    """
    Main orchestrator that coordinates the entire privacy-preserving LLM workflow
    """
    
    def __init__(
        self,
        config: OrchestrationConfig,
        provider_manager: ProviderManager,
        detection_engine: Optional[DetectionEngine] = None,
        fragmenter: Optional[QueryFragmenter] = None
    ):
        """
        Initialize the query orchestrator
        
        Args:
            config: Orchestration configuration
            provider_manager: Provider manager instance
            detection_engine: Detection engine instance (optional)
            fragmenter: Query fragmenter instance (optional)
        """
        self.config = config
        self.provider_manager = provider_manager
        
        # Initialize components
        self.detection_engine = detection_engine or DetectionEngine()
        self.fragmenter = fragmenter or QueryFragmenter()
        self.response_aggregator = ResponseAggregator()
        
        # Initialize intelligence components
        self.privacy_intelligence = PrivacyIntelligence()
        self.cost_optimizer = CostOptimizer()
        self.performance_monitor = PerformanceMonitor()
        
        # Metrics tracking
        self.metrics = OrchestrationMetrics()
        
        # Request tracking
        self.active_requests: Dict[str, Dict[str, Any]] = {}
        
        logger.info("Query orchestrator initialized")
    
    async def process_query(self, request: OrchestrationRequest) -> OrchestrationResponse:
        """
        Process a query through the complete privacy-preserving workflow
        
        Args:
            request: The orchestration request to process
            
        Returns:
            Orchestration response with aggregated results
            
        Raises:
            Exception: If processing fails at any stage
        """
        start_time = time.time()
        request_context = {
            "request_id": request.request_id,
            "stage": ProcessingStage.RECEIVED,
            "start_time": start_time,
            "fragments": [],
            "results": []
        }
        
        self.active_requests[request.request_id] = request_context
        
        try:
            logger.info(f"Starting orchestration for request {request.request_id}")
            
            # Stage 1: Detection
            request_context["stage"] = ProcessingStage.DETECTION
            detection_report = await self._run_detection(request)
            logger.debug(f"Detection completed: PII={detection_report.has_pii}, Code={detection_report.code_detection.has_code}")
            
            # Stage 2: Fragmentation
            request_context["stage"] = ProcessingStage.FRAGMENTATION
            fragments = await self._run_fragmentation(request, detection_report)
            request_context["fragments"] = fragments
            logger.debug(f"Fragmentation completed: {len(fragments.fragments)} fragments created")
            
            # Stage 3: Intelligence Analysis
            request_context["stage"] = ProcessingStage.ROUTING
            intelligence_decisions = await self._run_intelligence_analysis(
                request, detection_report, fragments
            )
            logger.debug(f"Intelligence analysis completed: {len(intelligence_decisions)} decisions made")
            
            # Stage 4: Process Fragments
            request_context["stage"] = ProcessingStage.PROCESSING
            fragment_results = await self._process_fragments(
                request, fragments, intelligence_decisions
            )
            request_context["results"] = fragment_results
            logger.debug(f"Fragment processing completed: {len(fragment_results)} results")
            
            # Stage 5: Aggregate Responses
            request_context["stage"] = ProcessingStage.AGGREGATION
            aggregated_response = await self._aggregate_responses(
                request, fragments, fragment_results
            )
            logger.debug("Response aggregation completed")
            
            # Stage 6: Complete Processing
            request_context["stage"] = ProcessingStage.COMPLETED
            total_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Build final response
            response = await self._build_response(
                request, detection_report, fragments, fragment_results,
                aggregated_response, intelligence_decisions, total_time
            )
            
            # Update metrics
            self.metrics.update_metrics(response, True, total_time)
            
            # Run performance monitoring
            await self._run_performance_monitoring(request, fragment_results, total_time)
            
            logger.info(f"Orchestration completed for request {request.request_id} in {total_time:.0f}ms")
            return response
            
        except Exception as e:
            request_context["stage"] = ProcessingStage.FAILED
            total_time = (time.time() - start_time) * 1000
            
            logger.error(f"Orchestration failed for request {request.request_id}: {str(e)}")
            
            # Update metrics for failure
            self.metrics.total_requests += 1
            self.metrics.failed_requests += 1
            self.metrics.last_request_time = datetime.utcnow()
            
            raise
        
        finally:
            # Clean up request context
            self.active_requests.pop(request.request_id, None)
    
    async def _run_detection(self, request: OrchestrationRequest):
        """Run detection analysis on the query"""
        try:
            if self.config.enable_pii_detection or self.config.enable_code_detection:
                detection_report = self.detection_engine.detect(request.query)
                return detection_report
            else:
                # Return empty detection report if detection is disabled
                from src.detection.models import DetectionReport, CodeDetection
                return DetectionReport(
                    has_pii=False,
                    pii_entities=[],
                    pii_density=0.0,
                    code_detection=CodeDetection(
                        has_code=False,
                        language=None,
                        confidence=0.0,
                        code_blocks=[]
                    ),
                    named_entities=[],
                    sensitivity_score=0.0,
                    processing_time=0.0,
                    analyzers_used=[]
                )
                
        except Exception as e:
            logger.error(f"Detection failed for request {request.request_id}: {str(e)}")
            raise
    
    async def _run_fragmentation(self, request: OrchestrationRequest, detection_report):
        """Run query fragmentation"""
        try:
            # Determine fragmentation strategy
            strategy = request.fragmentation_strategy or self.config.default_strategy
            
            # Configure fragmentation
            from src.fragmentation.models import FragmentationConfig
            frag_config = FragmentationConfig(
                strategy=strategy,
                max_fragment_size=self.config.max_fragment_size,
                overlap_tokens=self.config.overlap_tokens
            )
            
            # Fragment the query
            fragments = self.fragmenter.fragment_query(
                request.query, frag_config
            )
            
            return fragments
            
        except Exception as e:
            logger.error(f"Fragmentation failed for request {request.request_id}: {str(e)}")
            raise
    
    async def _run_intelligence_analysis(self, request, detection_report, fragments):
        """Run intelligence analysis for routing and optimization"""
        try:
            intelligence_decisions = []
            
            # Privacy intelligence analysis
            if self.config.enable_privacy_routing:
                privacy_decisions = await self.privacy_intelligence.analyze_privacy_requirements(
                    request, detection_report, fragments
                )
                intelligence_decisions.extend(privacy_decisions)
            
            # Cost optimization analysis
            if self.config.enable_cost_optimization:
                # Build available providers map
                available_providers = {}
                for fragment in fragments.fragments:
                    available_providers[fragment.fragment_id] = [
                        ProviderType.OPENAI, ProviderType.ANTHROPIC, ProviderType.GOOGLE
                    ]
                
                cost_decisions = await self.cost_optimizer.optimize_cost(
                    request, fragments, available_providers
                )
                intelligence_decisions.extend(cost_decisions)
            
            return intelligence_decisions
            
        except Exception as e:
            logger.error(f"Intelligence analysis failed for request {request.request_id}: {str(e)}")
            # Return empty decisions list to continue processing
            return []
    
    async def _process_fragments(self, request, fragments, intelligence_decisions):
        """Process all fragments through selected providers"""
        try:
            # Create processing tasks
            tasks = []
            semaphore = asyncio.Semaphore(self.config.max_concurrent_requests)
            
            for fragment in fragments.fragments:
                task = self._process_single_fragment(
                    request, fragment, intelligence_decisions, semaphore
                )
                tasks.append(task)
            
            # Wait for all fragments to complete
            fragment_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out exceptions and log them
            valid_results = []
            for i, result in enumerate(fragment_results):
                if isinstance(result, Exception):
                    logger.error(f"Fragment {fragments.fragments[i].fragment_id} failed: {str(result)}")
                else:
                    valid_results.append(result)
            
            if not valid_results:
                raise Exception("All fragments failed to process")
            
            return valid_results
            
        except Exception as e:
            logger.error(f"Fragment processing failed for request {request.request_id}: {str(e)}")
            raise
    
    async def _process_single_fragment(self, request, fragment, intelligence_decisions, semaphore):
        """Process a single fragment"""
        async with semaphore:
            try:
                start_time = time.time()
                
                # Select provider based on intelligence decisions
                provider_selection = self._select_provider_for_fragment(
                    fragment, intelligence_decisions, request
                )
                
                # Create LLM request
                llm_request = LLMRequest(
                    prompt=fragment.content,
                    fragment_id=fragment.fragment_id,
                    max_tokens=self.config.max_fragment_size,
                    requires_sensitive_handling=(
                        fragment.fragment_type.value in ["pii", "code"] or
                        request.privacy_level in [PrivacyLevel.RESTRICTED, PrivacyLevel.TOP_SECRET]
                    ),
                    metadata={
                        "fragment_type": fragment.fragment_type.value,
                        "privacy_level": request.privacy_level.value
                    }
                )
                
                # Process through provider manager
                llm_response = await asyncio.wait_for(
                    self.provider_manager.process_request(llm_request, provider_selection),
                    timeout=self.config.request_timeout
                )
                
                processing_time = (time.time() - start_time) * 1000
                
                # Estimate cost (simplified)
                cost_estimate = self._estimate_fragment_cost(
                    llm_response.provider_id, llm_response.tokens_used
                )
                
                return FragmentProcessingResult(
                    fragment_id=fragment.fragment_id,
                    provider_id=llm_response.provider_id,
                    response=llm_response,
                    processing_time_ms=processing_time,
                    cost_estimate=cost_estimate,
                    privacy_score=self._calculate_privacy_score(
                        llm_response.provider_id, fragment.fragment_type
                    )
                )
                
            except Exception as e:
                logger.error(f"Failed to process fragment {fragment.fragment_id}: {str(e)}")
                raise
    
    def _select_provider_for_fragment(self, fragment, intelligence_decisions, request):
        """Select provider based on intelligence decisions"""
        
        # Look for provider routing decisions for this fragment
        for decision in intelligence_decisions:
            if (decision.decision_type == "provider_routing" and 
                decision.metadata.get("fragment_id") == fragment.fragment_id):
                
                recommended_providers = decision.metadata.get("recommended_providers", [])
                if recommended_providers:
                    provider_types = [ProviderType(p) for p in recommended_providers]
                    return ProviderSelectionCriteria(
                        preferred_providers=provider_types,
                        required_capabilities=[ModelCapability.TEXT_GENERATION]
                    )
        
        # Fallback to configured sensitive data providers for sensitive fragments
        if (fragment.fragment_type.value in ["pii", "code"] or 
            request.privacy_level in [PrivacyLevel.RESTRICTED, PrivacyLevel.TOP_SECRET]):
            return ProviderSelectionCriteria(
                preferred_providers=self.config.sensitive_data_providers,
                required_capabilities=[ModelCapability.TEXT_GENERATION, ModelCapability.SENSITIVE_DATA]
            )
        
        # Default selection criteria
        return ProviderSelectionCriteria(
            required_capabilities=[ModelCapability.TEXT_GENERATION]
        )
    
    async def _aggregate_responses(self, request, fragments, fragment_results):
        """Aggregate responses from all fragments"""
        try:
            aggregated_response = await self.response_aggregator.aggregate_responses(
                fragment_results, fragments, request
            )
            return aggregated_response
            
        except Exception as e:
            logger.error(f"Response aggregation failed for request {request.request_id}: {str(e)}")
            raise
    
    async def _build_response(
        self, request, detection_report, fragments, fragment_results,
        aggregated_response, intelligence_decisions, total_time
    ):
        """Build the final orchestration response"""
        
        providers_used = list(set(result.provider_id for result in fragment_results))
        total_cost = sum(result.cost_estimate for result in fragment_results)
        total_tokens = sum(result.response.tokens_used for result in fragment_results)
        
        # Determine achieved privacy level
        privacy_level_achieved = self._determine_achieved_privacy_level(
            request, fragment_results, intelligence_decisions
        )
        
        return OrchestrationResponse(
            request_id=request.request_id,
            aggregated_response=aggregated_response,
            total_processing_time_ms=total_time,
            fragments_processed=len(fragment_results),
            providers_used=providers_used,
            detection_report=detection_report,
            fragmentation_strategy=request.fragmentation_strategy or self.config.default_strategy,
            privacy_level_achieved=privacy_level_achieved,
            total_cost_estimate=total_cost,
            tokens_used=total_tokens,
            fragment_results=fragment_results
        )
    
    async def _run_performance_monitoring(self, request, fragment_results, total_time):
        """Run performance monitoring analysis"""
        try:
            await self.performance_monitor.monitor_performance(
                request, fragment_results, total_time
            )
        except Exception as e:
            logger.warning(f"Performance monitoring failed: {str(e)}")
    
    def _estimate_fragment_cost(self, provider_id: str, tokens_used: int) -> float:
        """Estimate cost for a fragment processing"""
        # Simplified cost estimation
        cost_per_1k_tokens = {
            "openai": 0.03,
            "anthropic": 0.025,
            "google": 0.02
        }
        
        base_cost = cost_per_1k_tokens.get(provider_id.lower(), 0.025)
        return (tokens_used / 1000.0) * base_cost
    
    def _calculate_privacy_score(self, provider_id: str, fragment_type) -> float:
        """Calculate privacy score for fragment processing"""
        # Provider privacy scores
        provider_scores = {
            "anthropic": 0.95,
            "openai": 0.80,
            "google": 0.70
        }
        
        base_score = provider_scores.get(provider_id.lower(), 0.75)
        
        # Adjust for fragment sensitivity
        if fragment_type.value in ["pii", "code"]:
            base_score *= 1.1  # Bonus for handling sensitive data well
        
        return min(base_score, 1.0)
    
    def _determine_achieved_privacy_level(self, request, fragment_results, intelligence_decisions):
        """Determine the privacy level achieved during processing"""
        
        # Check if high-privacy providers were used for sensitive data
        sensitive_fragments = sum(1 for result in fragment_results 
                                if result.privacy_score >= 0.8)
        
        if sensitive_fragments == len(fragment_results):
            return PrivacyLevel.RESTRICTED
        elif sensitive_fragments >= len(fragment_results) * 0.7:
            return PrivacyLevel.CONFIDENTIAL
        else:
            return request.privacy_level
    
    def get_metrics(self) -> OrchestrationMetrics:
        """Get current orchestration metrics"""
        return self.metrics
    
    def get_active_requests(self) -> Dict[str, Dict[str, Any]]:
        """Get currently active requests"""
        return self.active_requests.copy()
    
    async def shutdown(self):
        """Shutdown the orchestrator and clean up resources"""
        logger.info("Shutting down query orchestrator")
        
        # Wait for active requests to complete (with timeout)
        if self.active_requests:
            logger.info(f"Waiting for {len(self.active_requests)} active requests to complete")
            await asyncio.sleep(2)  # Give requests time to complete
        
        # Clean up
        self.active_requests.clear()
        
        logger.info("Query orchestrator shutdown complete")