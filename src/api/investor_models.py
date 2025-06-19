"""
Comprehensive data models for investor demo
High-fidelity metrics and analytics for showcasing system capabilities
"""

from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from enum import Enum


class ComplianceStandard(str, Enum):
    """Compliance standards supported"""
    GDPR = "gdpr"
    HIPAA = "hipaa"
    SOC2 = "soc2" 
    PCI_DSS = "pci_dss"
    ISO27001 = "iso27001"
    CCPA = "ccpa"


class RiskLevel(str, Enum):
    """Privacy risk levels"""
    MINIMAL = "minimal"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class OptimizationStrategy(str, Enum):
    """Cost optimization strategies"""
    COST_MINIMIZATION = "cost_minimization"
    PERFORMANCE_MAXIMIZATION = "performance_maximization"
    BALANCED_APPROACH = "balanced_approach"
    PRIVACY_FIRST = "privacy_first"


# Privacy & Security Intelligence
class PiiEntity(BaseModel):
    """Enhanced PII entity with investor-relevant metrics"""
    text: str
    type: str
    start: int
    end: int
    confidence: float
    risk_level: RiskLevel
    anonymization_method: str
    compliance_impact: List[ComplianceStandard]


class AuditEvent(BaseModel):
    """Security audit trail event"""
    timestamp: datetime
    event_type: str
    description: str
    compliance_verification: bool
    risk_mitigation: str


class PrivacyMetrics(BaseModel):
    """Comprehensive privacy protection metrics"""
    privacy_score: float = Field(..., ge=0, le=100, description="Overall privacy protection percentage")
    pii_entities: List[PiiEntity]
    context_fragmentation: float = Field(..., description="Percentage of original context distributed")
    anonymization_effectiveness: float = Field(..., description="Effectiveness of PII masking")
    privacy_risk_reduction: float = Field(..., description="Risk reduction vs single provider")
    audit_trail: List[AuditEvent]
    compliance_score: Dict[ComplianceStandard, float]
    data_sovereignty_maintained: bool


# Cost Optimization Intelligence  
class ProviderCost(BaseModel):
    """Per-provider cost breakdown"""
    provider_id: str
    provider_name: str
    fragment_count: int
    tokens_used: int
    cost_per_token: float
    total_cost: float
    cost_efficiency_score: float


class CostMetrics(BaseModel):
    """Advanced cost optimization metrics"""
    total_cost: float
    single_provider_cost: float
    savings_percentage: float
    cost_per_provider: List[ProviderCost]
    roi_calculation: float
    pricing_optimization_reason: str
    cost_efficiency_score: float
    budget_utilization: float
    projected_monthly_savings: float


# Performance Analytics
class StepTiming(BaseModel):
    """Detailed timing for each processing step"""
    step_name: str
    step_number: int
    start_time: datetime
    end_time: datetime
    duration_ms: float
    efficiency_score: float
    bottleneck_identified: Optional[str] = None


class ProviderTiming(BaseModel):
    """Provider-specific performance metrics"""
    provider_id: str
    request_time: datetime
    response_time: datetime
    latency_ms: float
    tokens_per_second: float
    reliability_score: float


class PerformanceMetrics(BaseModel):
    """Enterprise-grade performance analytics"""
    total_processing_time: float
    step_timings: List[StepTiming]
    provider_response_times: List[ProviderTiming]
    throughput_rate: float = Field(..., description="Queries per minute capability")
    system_efficiency: float = Field(..., description="Resource utilization percentage")
    scalability_score: float = Field(..., description="System load capacity")
    sla_compliance: bool
    performance_percentile: float


# Provider Intelligence
class RoutingDecision(BaseModel):
    """AI routing decision explanation"""
    fragment_id: str
    provider_selected: str
    reasoning: str
    confidence_score: float
    alternative_providers: List[str]
    optimization_factors: List[str]


class LoadBalancingStatus(BaseModel):
    """Real-time load balancing status"""
    total_capacity: int
    current_load: int
    utilization_percentage: float
    auto_scaling_active: bool
    predicted_capacity_needed: int


class ProviderHealth(BaseModel):
    """Provider health and reliability metrics"""
    provider_id: str
    status: str
    uptime_percentage: float
    average_latency: float
    success_rate: float
    last_health_check: datetime
    issues_detected: List[str]


class ProviderIntelligence(BaseModel):
    """Intelligent provider management metrics"""
    routing_decisions: List[RoutingDecision]
    provider_selection_reasoning: str
    load_balancing_status: LoadBalancingStatus
    provider_health: List[ProviderHealth]
    smart_fallback_triggered: bool
    optimization_strategies: List[OptimizationStrategy]
    ai_decision_confidence: float


# Fragment Analytics
class SizeDistribution(BaseModel):
    """Fragment size distribution analytics"""
    min_size: int
    max_size: int
    average_size: float
    median_size: float
    size_variance: float
    optimal_distribution: bool


class AssignmentReason(BaseModel):
    """Fragment-to-provider assignment reasoning"""
    fragment_id: str
    provider_assigned: str
    primary_reason: str
    secondary_factors: List[str]
    confidence_score: float


class FragmentAnalytics(BaseModel):
    """Advanced fragment analysis metrics"""
    fragment_count: int
    fragment_size_distribution: SizeDistribution
    context_preservation_per_fragment: List[float]
    anonymization_per_fragment: List[bool]
    provider_assignment_logic: List[AssignmentReason]
    semantic_coherence_score: float
    fragment_dependency_graph: Dict[str, List[str]]
    reconstruction_difficulty: float


# Business Intelligence
class ComplianceMetric(BaseModel):
    """Compliance verification metrics"""
    standard: ComplianceStandard
    compliance_level: float
    verification_status: str
    audit_trail_complete: bool
    certification_ready: bool


class AdvantageMetric(BaseModel):
    """Competitive advantage metrics"""
    feature: str
    advantage_description: str
    quantified_benefit: float
    competitor_comparison: str
    market_differentiation: float


class BusinessMetrics(BaseModel):
    """Strategic business intelligence"""
    query_complexity_score: float = Field(..., description="Technical complexity assessment")
    market_differentiation_factors: List[str]
    enterprise_readiness_score: float = Field(..., description="Production deployment readiness")
    compliance_indicators: List[ComplianceMetric]
    competitive_advantage: List[AdvantageMetric]
    scalability_potential: float
    revenue_opportunity: float
    customer_acquisition_impact: float


# Comprehensive Investor Demo Response
class InvestorDemoMetrics(BaseModel):
    """Complete investor demonstration metrics package"""
    request_id: str
    timestamp: datetime
    
    # Core metrics
    privacy_metrics: PrivacyMetrics
    cost_metrics: CostMetrics
    performance_metrics: PerformanceMetrics
    provider_intelligence: ProviderIntelligence
    fragment_analytics: FragmentAnalytics
    business_metrics: BusinessMetrics
    
    # Executive summary
    executive_summary: Dict[str, Any]
    key_value_propositions: List[str]
    investment_highlights: List[str]
    
    # Real-time status
    processing_status: str
    completion_percentage: float
    
    # Demo-specific enhancements
    visual_demo_data: Dict[str, Any] = Field(default_factory=dict)
    narrative_explanations: Dict[str, str] = Field(default_factory=dict)


# WebSocket models removed - using SSE instead