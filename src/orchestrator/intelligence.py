"""
Intelligence components for privacy-aware routing, cost optimization, and performance monitoring
"""

import logging
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from src.detection.models import DetectionReport
from src.fragmentation.models import FragmentationType, QueryFragment
from src.orchestrator.models import (
    FragmentProcessingResult,
    IntelligenceDecision,
    OrchestrationRequest,
    PrivacyLevel,
)
from src.providers.models import ProviderType

logger = logging.getLogger(__name__)


class PrivacyIntelligence:
    """
    Intelligence component for privacy-aware routing decisions
    """

    def __init__(self):
        """Initialize privacy intelligence"""
        self.privacy_rules = self._initialize_privacy_rules()
        self.provider_privacy_scores = self._initialize_provider_scores()

    async def analyze_privacy_requirements(
        self,
        request: OrchestrationRequest,
        detection_report: DetectionReport,
        fragments: list[QueryFragment]
    ) -> list[IntelligenceDecision]:
        """
        Analyze privacy requirements and make routing decisions

        Args:
            request: Original orchestration request
            detection_report: Detection analysis results
            fragments: Query fragments to be processed

        Returns:
            List of privacy-related decisions
        """
        decisions = []

        try:
            # Analyze overall privacy level
            privacy_decision = await self._assess_privacy_level(
                request, detection_report, fragments
            )
            decisions.append(privacy_decision)

            # Make provider routing decisions for each fragment
            for fragment in fragments:
                routing_decision = await self._recommend_provider_routing(
                    fragment, detection_report, request.privacy_level
                )
                decisions.append(routing_decision)

            # Check for privacy policy compliance
            compliance_decision = await self._check_compliance(
                request, detection_report, fragments
            )
            decisions.append(compliance_decision)

            logger.info(f"Generated {len(decisions)} privacy decisions for request {request.request_id}")
            return decisions

        except Exception as e:
            logger.error(f"Failed to analyze privacy requirements: {str(e)}")
            # Return conservative default decision
            return [IntelligenceDecision(
                component="privacy_intelligence",
                decision_type="privacy_assessment",
                recommendation="use_highest_privacy_providers",
                confidence=0.5,
                reasoning=f"Error in privacy analysis: {str(e)}. Defaulting to conservative approach."
            )]

    async def _assess_privacy_level(
        self,
        request: OrchestrationRequest,
        detection_report: DetectionReport,
        fragments: list[QueryFragment]
    ) -> IntelligenceDecision:
        """Assess the required privacy level for the request"""

        privacy_score = 0.0
        reasoning_factors = []

        # Factor 1: PII detection
        if detection_report.has_pii:
            pii_score = len(detection_report.pii_entities) * 0.2
            privacy_score += min(pii_score, 1.0)
            reasoning_factors.append(f"PII detected ({len(detection_report.pii_entities)} entities)")

        # Factor 2: Code detection
        if detection_report.code_detection.has_code:
            code_score = detection_report.code_detection.confidence * 0.3
            privacy_score += code_score
            reasoning_factors.append(f"Code detected (confidence: {detection_report.code_detection.confidence:.2f})")

        # Factor 3: User-specified privacy level
        level_scores = {
            PrivacyLevel.PUBLIC: 0.0,
            PrivacyLevel.INTERNAL: 0.2,
            PrivacyLevel.CONFIDENTIAL: 0.5,
            PrivacyLevel.RESTRICTED: 0.8,
            PrivacyLevel.TOP_SECRET: 1.0
        }
        user_score = level_scores.get(request.privacy_level, 0.5)
        privacy_score += user_score
        reasoning_factors.append(f"User privacy level: {request.privacy_level.value}")

        # Factor 4: Fragment sensitivity
        sensitive_fragments = sum(1 for f in fragments
                                if f.fragment_type in [FragmentationType.PII, FragmentationType.CODE])
        if sensitive_fragments > 0:
            fragment_score = (sensitive_fragments / len(fragments)) * 0.3
            privacy_score += fragment_score
            reasoning_factors.append(f"Sensitive fragments: {sensitive_fragments}/{len(fragments)}")

        # Normalize to 0-1 range
        privacy_score = min(privacy_score / 2.0, 1.0)

        # Determine recommendation
        if privacy_score >= 0.8:
            recommendation = "require_top_tier_privacy_providers"
        elif privacy_score >= 0.6:
            recommendation = "prefer_privacy_focused_providers"
        elif privacy_score >= 0.4:
            recommendation = "use_standard_privacy_measures"
        else:
            recommendation = "standard_routing_acceptable"

        reasoning = f"Privacy score: {privacy_score:.2f}. Factors: {', '.join(reasoning_factors)}"

        return IntelligenceDecision(
            component="privacy_intelligence",
            decision_type="privacy_level_assessment",
            recommendation=recommendation,
            confidence=0.9,
            reasoning=reasoning,
            metadata={"privacy_score": privacy_score, "factors": reasoning_factors}
        )

    async def _recommend_provider_routing(
        self,
        fragment: QueryFragment,
        detection_report: DetectionReport,
        privacy_level: PrivacyLevel
    ) -> IntelligenceDecision:
        """Recommend provider routing for a specific fragment"""

        # Analyze fragment sensitivity
        fragment_sensitivity = self._calculate_fragment_sensitivity(fragment, detection_report)

        # Get provider recommendations based on sensitivity and privacy level
        recommended_providers = []

        if fragment_sensitivity >= 0.8 or privacy_level in [PrivacyLevel.RESTRICTED, PrivacyLevel.TOP_SECRET]:
            # High sensitivity - use only privacy-focused providers
            recommended_providers = [ProviderType.ANTHROPIC]
            reasoning = "High sensitivity detected - routing to privacy-focused providers only"
        elif fragment_sensitivity >= 0.5 or privacy_level == PrivacyLevel.CONFIDENTIAL:
            # Medium sensitivity - prefer privacy-focused but allow others
            recommended_providers = [ProviderType.ANTHROPIC, ProviderType.OPENAI]
            reasoning = "Medium sensitivity - preferring privacy-focused providers"
        else:
            # Low sensitivity - all providers acceptable
            recommended_providers = [ProviderType.ANTHROPIC, ProviderType.OPENAI, ProviderType.GOOGLE]
            reasoning = "Low sensitivity - all providers acceptable"

        return IntelligenceDecision(
            component="privacy_intelligence",
            decision_type="provider_routing",
            recommendation=f"route_to_{','.join([p.value for p in recommended_providers])}",
            confidence=0.85,
            reasoning=reasoning,
            metadata={
                "fragment_id": fragment.fragment_id,
                "sensitivity_score": fragment_sensitivity,
                "recommended_providers": [p.value for p in recommended_providers]
            }
        )

    async def _check_compliance(
        self,
        request: OrchestrationRequest,
        detection_report: DetectionReport,
        fragments: list[QueryFragment]
    ) -> IntelligenceDecision:
        """Check compliance with privacy policies"""

        compliance_issues = []

        # Check for PII handling compliance
        if detection_report.has_pii:
            for entity in detection_report.pii_entities:
                if entity.type.value in ["CREDIT_CARD", "US_SSN", "US_PASSPORT"]:
                    compliance_issues.append(f"High-risk PII detected: {entity.type.value}")

        # Check for code compliance
        if detection_report.code_detection.has_code and detection_report.code_detection.confidence > 0.8:
            compliance_issues.append("High-confidence proprietary code detected")

        # Check cross-border data restrictions
        if request.metadata.get("user_location") and request.metadata.get("user_location") == "EU":
            compliance_issues.append("GDPR compliance required for EU user")

        if compliance_issues:
            recommendation = "enforce_strict_compliance_measures"
            reasoning = f"Compliance issues detected: {', '.join(compliance_issues)}"
            confidence = 0.95
        else:
            recommendation = "standard_compliance_sufficient"
            reasoning = "No specific compliance issues detected"
            confidence = 0.8

        return IntelligenceDecision(
            component="privacy_intelligence",
            decision_type="compliance_check",
            recommendation=recommendation,
            confidence=confidence,
            reasoning=reasoning,
            metadata={"compliance_issues": compliance_issues}
        )

    def _calculate_fragment_sensitivity(
        self,
        fragment: QueryFragment,
        detection_report: DetectionReport
    ) -> float:
        """Calculate sensitivity score for a fragment"""

        sensitivity = 0.0

        # Fragment type sensitivity
        type_scores = {
            FragmentationType.PII: 0.8,
            FragmentationType.CODE: 0.7,
            FragmentationType.SEMANTIC: 0.3,
            FragmentationType.GENERAL: 0.1
        }
        sensitivity += type_scores.get(fragment.fragment_type, 0.1)

        # Content-based sensitivity
        if fragment.metadata.get("contains_pii"):
            sensitivity += 0.4
        if fragment.metadata.get("contains_code"):
            sensitivity += 0.3

        return min(sensitivity, 1.0)

    def _initialize_privacy_rules(self) -> dict[str, Any]:
        """Initialize privacy routing rules"""
        return {
            "pii_routing": {
                "high_risk_entities": ["CREDIT_CARD", "US_SSN", "US_PASSPORT"],
                "preferred_providers": [ProviderType.ANTHROPIC]
            },
            "code_routing": {
                "confidence_threshold": 0.7,
                "preferred_providers": [ProviderType.ANTHROPIC, ProviderType.OPENAI]
            },
            "geo_restrictions": {
                "EU": {"gdpr_compliant_only": True},
                "US": {"hipaa_compliant_preferred": True}
            }
        }

    def _initialize_provider_scores(self) -> dict[ProviderType, float]:
        """Initialize provider privacy scores"""
        return {
            ProviderType.ANTHROPIC: 0.95,  # Highest privacy focus
            ProviderType.OPENAI: 0.80,     # Good privacy practices
            ProviderType.GOOGLE: 0.70,     # Standard privacy practices
            ProviderType.AZURE_OPENAI: 0.85  # Enterprise-focused privacy
        }


class CostOptimizer:
    """
    Intelligence component for cost optimization decisions
    """

    def __init__(self):
        """Initialize cost optimizer"""
        self.provider_costs = self._initialize_provider_costs()
        self.cost_history = defaultdict(list)

    async def optimize_cost(
        self,
        request: OrchestrationRequest,
        fragments: list[QueryFragment],
        available_providers: dict[str, list[ProviderType]]
    ) -> list[IntelligenceDecision]:
        """
        Optimize cost while maintaining quality and privacy requirements

        Args:
            request: Original orchestration request
            fragments: Query fragments to be processed
            available_providers: Available providers for each fragment

        Returns:
            List of cost optimization decisions
        """
        decisions = []

        try:
            # Calculate cost estimates for different routing strategies
            cost_analysis = await self._analyze_cost_options(
                fragments, available_providers, request
            )

            # Make routing decisions based on cost optimization
            for fragment_id, options in cost_analysis.items():
                optimization_decision = await self._select_cost_optimal_provider(
                    fragment_id, options, request
                )
                decisions.append(optimization_decision)

            # Overall budget compliance check
            budget_decision = await self._check_budget_compliance(
                request, cost_analysis
            )
            decisions.append(budget_decision)

            logger.info(f"Generated {len(decisions)} cost optimization decisions")
            return decisions

        except Exception as e:
            logger.error(f"Failed to optimize cost: {str(e)}")
            return [IntelligenceDecision(
                component="cost_optimizer",
                decision_type="cost_optimization",
                recommendation="use_default_providers",
                confidence=0.5,
                reasoning=f"Cost optimization failed: {str(e)}"
            )]

    async def _analyze_cost_options(
        self,
        fragments: list[QueryFragment],
        available_providers: dict[str, list[ProviderType]],
        request: OrchestrationRequest
    ) -> dict[str, list[dict[str, Any]]]:
        """Analyze cost options for each fragment"""

        cost_analysis = {}

        for fragment in fragments:
            fragment_options = []
            providers = available_providers.get(fragment.fragment_id, [])

            for provider_type in providers:
                # Estimate tokens for this fragment
                estimated_tokens = self._estimate_fragment_tokens(fragment)

                # Calculate cost estimate
                cost_estimate = self._calculate_cost(provider_type, estimated_tokens)

                # Calculate performance score
                performance_score = self._get_provider_performance_score(provider_type)

                # Calculate cost-performance ratio
                cost_performance_ratio = cost_estimate / max(performance_score, 0.1)

                fragment_options.append({
                    "provider": provider_type,
                    "cost_estimate": cost_estimate,
                    "performance_score": performance_score,
                    "cost_performance_ratio": cost_performance_ratio,
                    "estimated_tokens": estimated_tokens
                })

            # Sort by cost-performance ratio
            fragment_options.sort(key=lambda x: x["cost_performance_ratio"])
            cost_analysis[fragment.fragment_id] = fragment_options

        return cost_analysis

    async def _select_cost_optimal_provider(
        self,
        fragment_id: str,
        options: List[Dict[str, Any]],
        request: OrchestrationRequest
    ) -> IntelligenceDecision:
        """Select the most cost-optimal provider for a fragment"""

        if not options:
            return IntelligenceDecision(
                component="cost_optimizer",
                decision_type="provider_selection",
                recommendation="no_providers_available",
                confidence=0.0,
                reasoning="No providers available for cost optimization"
            )

        # Get the most cost-effective option
        best_option = options[0]

        # Check if it fits within budget constraints
        max_cost = request.metadata.get("max_cost_per_fragment", 0.1)

        if best_option["cost_estimate"] <= max_cost:
            recommendation = f"use_provider_{best_option['provider'].value}"
            reasoning = f"Most cost-effective option: ${best_option['cost_estimate']:.4f} " \
                       f"with performance score {best_option['performance_score']:.2f}"
            confidence = 0.9
        else:
            # All options exceed budget - recommend cheapest anyway with warning
            recommendation = f"use_provider_{best_option['provider'].value}_budget_exceeded"
            reasoning = f"All options exceed budget. Cheapest option: ${best_option['cost_estimate']:.4f} " \
                       f"(budget: ${max_cost:.4f})"
            confidence = 0.6

        return IntelligenceDecision(
            component="cost_optimizer",
            decision_type="provider_selection",
            recommendation=recommendation,
            confidence=confidence,
            reasoning=reasoning,
            metadata={
                "fragment_id": fragment_id,
                "selected_provider": best_option["provider"].value,
                "cost_estimate": best_option["cost_estimate"],
                "alternatives": [opt["provider"].value for opt in options[1:3]]  # Top 3 alternatives
            }
        )

    async def _check_budget_compliance(
        self,
        request: OrchestrationRequest,
        cost_analysis: dict[str, list[dict[str, Any]]]
    ) -> IntelligenceDecision:
        """Check overall budget compliance"""

        total_estimated_cost = 0.0
        fragment_costs = {}

        for fragment_id, options in cost_analysis.items():
            if options:
                best_cost = options[0]["cost_estimate"]
                total_estimated_cost += best_cost
                fragment_costs[fragment_id] = best_cost

        max_budget = request.metadata.get("max_total_cost", 1.0)

        if total_estimated_cost <= max_budget:
            recommendation = "budget_compliant"
            reasoning = f"Total estimated cost ${total_estimated_cost:.4f} within budget ${max_budget:.4f}"
            confidence = 0.9
        else:
            recommendation = "budget_exceeded_optimization_needed"
            reasoning = f"Total estimated cost ${total_estimated_cost:.4f} exceeds budget ${max_budget:.4f}. " \
                       f"Consider reducing fragment complexity or using cheaper providers."
            confidence = 0.8

        return IntelligenceDecision(
            component="cost_optimizer",
            decision_type="budget_compliance",
            recommendation=recommendation,
            confidence=confidence,
            reasoning=reasoning,
            metadata={
                "total_estimated_cost": total_estimated_cost,
                "budget_limit": max_budget,
                "fragment_costs": fragment_costs
            }
        )

    def _estimate_fragment_tokens(self, fragment: QueryFragment) -> int:
        """Estimate tokens for a fragment"""
        # Simple estimation: 4 characters per token
        return len(fragment.content) // 4 + 10  # Add some overhead

    def _calculate_cost(self, provider_type: ProviderType, tokens: int) -> float:
        """Calculate cost for a provider and token count"""
        cost_per_1k_tokens = self.provider_costs.get(provider_type, 0.01)
        return (tokens / 1000.0) * cost_per_1k_tokens

    def _get_provider_performance_score(self, provider_type: ProviderType) -> float:
        """Get performance score for a provider"""
        # Simplified performance scores
        scores = {
            ProviderType.OPENAI: 0.95,
            ProviderType.ANTHROPIC: 0.90,
            ProviderType.GOOGLE: 0.85,
            ProviderType.AZURE_OPENAI: 0.88
        }
        return scores.get(provider_type, 0.75)

    def _initialize_provider_costs(self) -> dict[ProviderType, float]:
        """Initialize provider cost estimates (per 1K tokens)"""
        return {
            ProviderType.OPENAI: 0.03,      # GPT-4 pricing
            ProviderType.ANTHROPIC: 0.025,  # Claude pricing
            ProviderType.GOOGLE: 0.02,      # Gemini pricing
            ProviderType.AZURE_OPENAI: 0.035  # Azure premium
        }


class PerformanceMonitor:
    """
    Intelligence component for performance monitoring and optimization
    """

    def __init__(self):
        """Initialize performance monitor"""
        self.performance_history = defaultdict(list)
        self.performance_thresholds = {
            "max_latency_ms": 30000,  # 30 seconds
            "min_success_rate": 0.95,
            "max_error_rate": 0.05
        }

    async def monitor_performance(
        self,
        request: OrchestrationRequest,
        fragment_results: list[FragmentProcessingResult],
        total_processing_time: float
    ) -> list[IntelligenceDecision]:
        """
        Monitor performance and make optimization recommendations

        Args:
            request: Original orchestration request
            fragment_results: Processing results from fragments
            total_processing_time: Total processing time in milliseconds

        Returns:
            List of performance-related decisions
        """
        decisions = []

        try:
            # Analyze overall performance
            performance_decision = await self._analyze_overall_performance(
                request, fragment_results, total_processing_time
            )
            decisions.append(performance_decision)

            # Analyze provider performance
            provider_decisions = await self._analyze_provider_performance(
                fragment_results
            )
            decisions.extend(provider_decisions)

            # Check for performance bottlenecks
            bottleneck_decision = await self._identify_bottlenecks(
                fragment_results, total_processing_time
            )
            decisions.append(bottleneck_decision)

            # Update performance history
            self._update_performance_history(request.request_id, {
                "total_time": total_processing_time,
                "fragment_count": len(fragment_results),
                "success_rate": self._calculate_success_rate(fragment_results),
                "timestamp": datetime.utcnow()
            })

            logger.info(f"Generated {len(decisions)} performance monitoring decisions")
            return decisions

        except Exception as e:
            logger.error(f"Failed to monitor performance: {str(e)}")
            return [IntelligenceDecision(
                component="performance_monitor",
                decision_type="performance_analysis",
                recommendation="performance_monitoring_failed",
                confidence=0.5,
                reasoning=f"Performance monitoring failed: {str(e)}"
            )]

    async def _analyze_overall_performance(
        self,
        request: OrchestrationRequest,
        fragment_results: list[FragmentProcessingResult],
        total_processing_time: float
    ) -> IntelligenceDecision:
        """Analyze overall performance metrics"""

        performance_issues = []
        recommendations = []

        # Check latency
        if total_processing_time > self.performance_thresholds["max_latency_ms"]:
            performance_issues.append(f"High latency: {total_processing_time:.0f}ms")
            recommendations.append("consider_fragment_reduction")

        # Check success rate
        success_rate = self._calculate_success_rate(fragment_results)
        if success_rate < self.performance_thresholds["min_success_rate"]:
            performance_issues.append(f"Low success rate: {success_rate:.2%}")
            recommendations.append("review_provider_selection")

        # Check fragment efficiency
        avg_fragment_time = total_processing_time / max(len(fragment_results), 1)
        if avg_fragment_time > 10000:  # 10 seconds per fragment
            performance_issues.append(f"Slow fragment processing: {avg_fragment_time:.0f}ms avg")
            recommendations.append("optimize_fragmentation_strategy")

        if performance_issues:
            recommendation = ";".join(recommendations)
            reasoning = f"Performance issues detected: {', '.join(performance_issues)}"
            confidence = 0.85
        else:
            recommendation = "performance_acceptable"
            reasoning = f"Good performance: {total_processing_time:.0f}ms total, " \
                       f"{success_rate:.2%} success rate"
            confidence = 0.9

        return IntelligenceDecision(
            component="performance_monitor",
            decision_type="overall_performance",
            recommendation=recommendation,
            confidence=confidence,
            reasoning=reasoning,
            metadata={
                "total_time_ms": total_processing_time,
                "success_rate": success_rate,
                "fragment_count": len(fragment_results),
                "avg_fragment_time_ms": avg_fragment_time
            }
        )

    async def _analyze_provider_performance(
        self,
        fragment_results: list[FragmentProcessingResult]
    ) -> list[IntelligenceDecision]:
        """Analyze performance by provider"""

        provider_stats = defaultdict(lambda: {"times": [], "successes": 0, "total": 0})

        # Collect provider statistics
        for result in fragment_results:
            provider_id = result.provider_id
            provider_stats[provider_id]["times"].append(result.processing_time_ms)
            provider_stats[provider_id]["total"] += 1
            if result.response.finish_reason == "stop":
                provider_stats[provider_id]["successes"] += 1

        decisions = []

        for provider_id, stats in provider_stats.items():
            avg_time = sum(stats["times"]) / len(stats["times"])
            success_rate = stats["successes"] / stats["total"]

            # Evaluate provider performance
            if avg_time > 15000:  # 15 seconds
                recommendation = f"provider_{provider_id}_slow"
                reasoning = f"Provider {provider_id} average time: {avg_time:.0f}ms"
                confidence = 0.8
            elif success_rate < 0.9:
                recommendation = f"provider_{provider_id}_unreliable"
                reasoning = f"Provider {provider_id} success rate: {success_rate:.2%}"
                confidence = 0.85
            else:
                recommendation = f"provider_{provider_id}_performing_well"
                reasoning = f"Provider {provider_id}: {avg_time:.0f}ms avg, {success_rate:.2%} success"
                confidence = 0.9

            decisions.append(IntelligenceDecision(
                component="performance_monitor",
                decision_type="provider_performance",
                recommendation=recommendation,
                confidence=confidence,
                reasoning=reasoning,
                metadata={
                    "provider_id": provider_id,
                    "avg_time_ms": avg_time,
                    "success_rate": success_rate,
                    "request_count": stats["total"]
                }
            ))

        return decisions

    async def _identify_bottlenecks(
        self,
        fragment_results: list[FragmentProcessingResult],
        total_processing_time: float
    ) -> IntelligenceDecision:
        """Identify performance bottlenecks"""

        bottlenecks = []

        # Check for slow fragments
        times = [result.processing_time_ms for result in fragment_results]
        if times:
            max_time = max(times)
            avg_time = sum(times) / len(times)

            if max_time > avg_time * 2:  # Slowest fragment is 2x average
                slowest_result = max(fragment_results, key=lambda x: x.processing_time_ms)
                bottlenecks.append(f"Slow fragment: {slowest_result.fragment_id} "
                                 f"({slowest_result.processing_time_ms:.0f}ms)")

        # Check for provider imbalance
        provider_counts = defaultdict(int)
        for result in fragment_results:
            provider_counts[result.provider_id] += 1

        if len(provider_counts) > 1:
            max_load = max(provider_counts.values())
            min_load = min(provider_counts.values())
            if max_load > min_load * 2:  # Imbalanced load
                bottlenecks.append("Uneven provider load distribution")

        if bottlenecks:
            recommendation = "address_identified_bottlenecks"
            reasoning = f"Bottlenecks identified: {', '.join(bottlenecks)}"
            confidence = 0.8
        else:
            recommendation = "no_significant_bottlenecks"
            reasoning = "No significant performance bottlenecks detected"
            confidence = 0.7

        return IntelligenceDecision(
            component="performance_monitor",
            decision_type="bottleneck_analysis",
            recommendation=recommendation,
            confidence=confidence,
            reasoning=reasoning,
            metadata={"bottlenecks": bottlenecks}
        )

    def _calculate_success_rate(self, fragment_results: list[FragmentProcessingResult]) -> float:
        """Calculate success rate from fragment results"""
        if not fragment_results:
            return 0.0

        successful = sum(1 for result in fragment_results
                        if result.response.finish_reason == "stop")
        return successful / len(fragment_results)

    def _update_performance_history(self, request_id: str, metrics: dict[str, Any]):
        """Update performance history"""
        self.performance_history[request_id].append(metrics)

        # Keep only last 100 entries per request
        if len(self.performance_history[request_id]) > 100:
            self.performance_history[request_id] = self.performance_history[request_id][-100:]
