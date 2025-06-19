"""
Unit tests for investor demo data models
Tests validation, serialization, and business logic of investor models
"""

import pytest
from datetime import datetime
from pydantic import ValidationError

from src.api.investor_models import (
    PiiEntity,
    AuditEvent,
    PrivacyMetrics,
    ProviderCost,
    CostMetrics,
    StepTiming,
    ProviderTiming,
    PerformanceMetrics,
    RoutingDecision,
    LoadBalancingStatus,
    ProviderHealth,
    ProviderIntelligence,
    SizeDistribution,
    AssignmentReason,
    FragmentAnalytics,
    ComplianceMetric,
    AdvantageMetric,
    BusinessMetrics,
    InvestorDemoMetrics,
    InvestorWebSocketMessage,
    ComplianceStandard,
    RiskLevel,
    OptimizationStrategy,
    WebSocketMessageType
)


class TestPiiEntity:
    """Test PII entity model validation and business logic"""
    
    def test_valid_pii_entity_creation(self):
        """Test creating a valid PII entity"""
        entity = PiiEntity(
            text="john.doe@example.com",
            type="EMAIL_ADDRESS",
            start=0,
            end=19,
            confidence=0.95,
            risk_level=RiskLevel.MODERATE,
            anonymization_method="placeholder_substitution",
            compliance_impact=[ComplianceStandard.GDPR, ComplianceStandard.CCPA]
        )
        
        assert entity.text == "john.doe@example.com"
        assert entity.type == "EMAIL_ADDRESS"
        assert entity.confidence == 0.95
        assert entity.risk_level == RiskLevel.MODERATE
        assert ComplianceStandard.GDPR in entity.compliance_impact
    
    def test_pii_entity_confidence_validation(self):
        """Test confidence score validation"""
        # Valid confidence scores
        PiiEntity(
            text="test",
            type="TEST",
            start=0,
            end=4,
            confidence=0.0,
            risk_level=RiskLevel.LOW,
            anonymization_method="test",
            compliance_impact=[ComplianceStandard.GDPR]
        )
        
        PiiEntity(
            text="test",
            type="TEST", 
            start=0,
            end=4,
            confidence=1.0,
            risk_level=RiskLevel.LOW,
            anonymization_method="test",
            compliance_impact=[ComplianceStandard.GDPR]
        )


class TestPrivacyMetrics:
    """Test privacy metrics model and calculations"""
    
    def test_privacy_metrics_creation(self):
        """Test creating privacy metrics with valid data"""
        pii_entity = PiiEntity(
            text="test@example.com",
            type="EMAIL_ADDRESS",
            start=0,
            end=16,
            confidence=0.9,
            risk_level=RiskLevel.MODERATE,
            anonymization_method="masking",
            compliance_impact=[ComplianceStandard.GDPR]
        )
        
        audit_event = AuditEvent(
            timestamp=datetime.utcnow(),
            event_type="pii_detection",
            description="Email address detected and anonymized",
            compliance_verification=True,
            risk_mitigation="Data anonymized using secure masking"
        )
        
        metrics = PrivacyMetrics(
            privacy_score=92.5,
            pii_entities=[pii_entity],
            context_fragmentation=75.0,
            anonymization_effectiveness=95.0,
            privacy_risk_reduction=85.0,
            audit_trail=[audit_event],
            compliance_score={
                ComplianceStandard.GDPR: 95.0,
                ComplianceStandard.HIPAA: 88.0
            },
            data_sovereignty_maintained=True
        )
        
        assert metrics.privacy_score == 92.5
        assert len(metrics.pii_entities) == 1
        assert metrics.compliance_score[ComplianceStandard.GDPR] == 95.0
        assert metrics.data_sovereignty_maintained is True
    
    def test_privacy_score_validation(self):
        """Test privacy score bounds validation"""
        with pytest.raises(ValidationError):
            PrivacyMetrics(
                privacy_score=150.0,  # Invalid: > 100
                pii_entities=[],
                context_fragmentation=75.0,
                anonymization_effectiveness=95.0,
                privacy_risk_reduction=85.0,
                audit_trail=[],
                compliance_score={},
                data_sovereignty_maintained=True
            )
        
        with pytest.raises(ValidationError):
            PrivacyMetrics(
                privacy_score=-10.0,  # Invalid: < 0
                pii_entities=[],
                context_fragmentation=75.0,
                anonymization_effectiveness=95.0,
                privacy_risk_reduction=85.0,
                audit_trail=[],
                compliance_score={},
                data_sovereignty_maintained=True
            )


class TestCostMetrics:
    """Test cost optimization metrics"""
    
    def test_cost_metrics_calculation(self):
        """Test cost metrics with provider breakdown"""
        provider_costs = [
            ProviderCost(
                provider_id="openai",
                provider_name="OpenAI GPT-4",
                fragment_count=2,
                tokens_used=500,
                cost_per_token=0.00001,
                total_cost=0.005,
                cost_efficiency_score=85.0
            ),
            ProviderCost(
                provider_id="anthropic",
                provider_name="Claude Sonnet",
                fragment_count=1,
                tokens_used=300,
                cost_per_token=0.000003,
                total_cost=0.0009,
                cost_efficiency_score=92.0
            )
        ]
        
        metrics = CostMetrics(
            total_cost=0.0059,
            single_provider_cost=0.015,
            savings_percentage=60.7,
            cost_per_provider=provider_costs,
            roi_calculation=120.5,
            pricing_optimization_reason="Multi-provider routing for cost efficiency",
            cost_efficiency_score=88.5,
            budget_utilization=45.2,
            projected_monthly_savings=1250.0
        )
        
        assert metrics.savings_percentage == 60.7
        assert len(metrics.cost_per_provider) == 2
        assert metrics.roi_calculation == 120.5
        assert metrics.total_cost < metrics.single_provider_cost


class TestPerformanceMetrics:
    """Test performance analytics"""
    
    def test_performance_metrics_with_timings(self):
        """Test performance metrics with step and provider timings"""
        step_timings = [
            StepTiming(
                step_name="pii_detection",
                step_number=1,
                start_time=datetime.utcnow(),
                end_time=datetime.utcnow(),
                duration_ms=250.0,
                efficiency_score=92.0
            ),
            StepTiming(
                step_name="fragmentation", 
                step_number=2,
                start_time=datetime.utcnow(),
                end_time=datetime.utcnow(),
                duration_ms=180.0,
                efficiency_score=88.0
            )
        ]
        
        provider_timings = [
            ProviderTiming(
                provider_id="openai",
                request_time=datetime.utcnow(),
                response_time=datetime.utcnow(),
                latency_ms=850.0,
                tokens_per_second=45.2,
                reliability_score=98.5
            )
        ]
        
        metrics = PerformanceMetrics(
            total_processing_time=1.8,
            step_timings=step_timings,
            provider_response_times=provider_timings,
            throughput_rate=33.3,
            system_efficiency=91.5,
            scalability_score=94.0,
            sla_compliance=True,
            performance_percentile=96.2
        )
        
        assert metrics.total_processing_time == 1.8
        assert len(metrics.step_timings) == 2
        assert metrics.sla_compliance is True
        assert metrics.performance_percentile > 90.0


class TestProviderIntelligence:
    """Test provider intelligence and routing decisions"""
    
    def test_provider_intelligence_creation(self):
        """Test creating provider intelligence with routing decisions"""
        routing_decisions = [
            RoutingDecision(
                fragment_id="frag_1",
                provider_selected="anthropic",
                reasoning="High sensitivity content requires Claude's safety features",
                confidence_score=0.92,
                alternative_providers=["openai", "google"],
                optimization_factors=["privacy", "safety", "accuracy"]
            )
        ]
        
        load_balancing = LoadBalancingStatus(
            total_capacity=1000,
            current_load=350,
            utilization_percentage=35.0,
            auto_scaling_active=False,
            predicted_capacity_needed=400
        )
        
        provider_health = [
            ProviderHealth(
                provider_id="openai",
                status="online",
                uptime_percentage=99.8,
                average_latency=850.0,
                success_rate=99.2,
                last_health_check=datetime.utcnow(),
                issues_detected=[]
            )
        ]
        
        intelligence = ProviderIntelligence(
            routing_decisions=routing_decisions,
            provider_selection_reasoning="AI-powered optimal routing for query characteristics",
            load_balancing_status=load_balancing,
            provider_health=provider_health,
            smart_fallback_triggered=False,
            optimization_strategies=[OptimizationStrategy.BALANCED_APPROACH],
            ai_decision_confidence=0.89
        )
        
        assert len(intelligence.routing_decisions) == 1
        assert intelligence.load_balancing_status.utilization_percentage == 35.0
        assert intelligence.smart_fallback_triggered is False


class TestBusinessMetrics:
    """Test business intelligence metrics"""
    
    def test_business_metrics_creation(self):
        """Test creating comprehensive business metrics"""
        compliance_metrics = [
            ComplianceMetric(
                standard=ComplianceStandard.GDPR,
                compliance_level=95.0,
                verification_status="verified",
                audit_trail_complete=True,
                certification_ready=True
            )
        ]
        
        advantage_metrics = [
            AdvantageMetric(
                feature="Zero-trust Architecture",
                advantage_description="No single provider sees complete query context",
                quantified_benefit=92.5,
                competitor_comparison="Unique in market - no direct competitors",
                market_differentiation=8.5
            )
        ]
        
        metrics = BusinessMetrics(
            query_complexity_score=7.2,
            market_differentiation_factors=["Privacy-first", "Cost optimization", "Enterprise-ready"],
            enterprise_readiness_score=94.0,
            compliance_indicators=compliance_metrics,
            competitive_advantage=advantage_metrics,
            scalability_potential=96.0,
            revenue_opportunity=8.5,
            customer_acquisition_impact=7.8
        )
        
        assert metrics.query_complexity_score == 7.2
        assert metrics.enterprise_readiness_score == 94.0
        assert len(metrics.compliance_indicators) == 1
        assert metrics.scalability_potential == 96.0


class TestInvestorDemoMetrics:
    """Test complete investor demo metrics package"""
    
    def test_complete_investor_demo_metrics(self):
        """Test creating complete investor demo metrics"""
        # Create minimal valid components
        privacy_metrics = PrivacyMetrics(
            privacy_score=92.5,
            pii_entities=[],
            context_fragmentation=75.0,
            anonymization_effectiveness=95.0,
            privacy_risk_reduction=85.0,
            audit_trail=[],
            compliance_score={ComplianceStandard.GDPR: 95.0},
            data_sovereignty_maintained=True
        )
        
        cost_metrics = CostMetrics(
            total_cost=0.005,
            single_provider_cost=0.015,
            savings_percentage=66.7,
            cost_per_provider=[],
            roi_calculation=120.0,
            pricing_optimization_reason="Multi-provider efficiency",
            cost_efficiency_score=88.0,
            budget_utilization=45.0,
            projected_monthly_savings=1200.0
        )
        
        performance_metrics = PerformanceMetrics(
            total_processing_time=1.8,
            step_timings=[],
            provider_response_times=[],
            throughput_rate=33.3,
            system_efficiency=91.5,
            scalability_score=94.0,
            sla_compliance=True,
            performance_percentile=96.2
        )
        
        provider_intelligence = ProviderIntelligence(
            routing_decisions=[],
            provider_selection_reasoning="AI optimization",
            load_balancing_status=LoadBalancingStatus(
                total_capacity=1000,
                current_load=350,
                utilization_percentage=35.0,
                auto_scaling_active=False,
                predicted_capacity_needed=400
            ),
            provider_health=[],
            smart_fallback_triggered=False,
            optimization_strategies=[OptimizationStrategy.BALANCED_APPROACH],
            ai_decision_confidence=0.89
        )
        
        fragment_analytics = FragmentAnalytics(
            fragment_count=3,
            fragment_size_distribution=SizeDistribution(
                min_size=50,
                max_size=200,
                average_size=125.0,
                median_size=120.0,
                size_variance=15.5,
                optimal_distribution=True
            ),
            context_preservation_per_fragment=[0.33, 0.33, 0.34],
            anonymization_per_fragment=[True, False, True],
            provider_assignment_logic=[],
            semantic_coherence_score=0.89,
            fragment_dependency_graph={},
            reconstruction_difficulty=0.95
        )
        
        business_metrics = BusinessMetrics(
            query_complexity_score=7.2,
            market_differentiation_factors=["Privacy-first", "Cost optimization"],
            enterprise_readiness_score=94.0,
            compliance_indicators=[],
            competitive_advantage=[],
            scalability_potential=96.0,
            revenue_opportunity=8.5,
            customer_acquisition_impact=7.8
        )
        
        demo_metrics = InvestorDemoMetrics(
            request_id="demo_test_123",
            timestamp=datetime.utcnow(),
            privacy_metrics=privacy_metrics,
            cost_metrics=cost_metrics,
            performance_metrics=performance_metrics,
            provider_intelligence=provider_intelligence,
            fragment_analytics=fragment_analytics,
            business_metrics=business_metrics,
            executive_summary={
                "privacy_protection": "92.5% privacy score achieved",
                "cost_optimization": "66.7% savings vs traditional",
                "performance": "1.8s processing time"
            },
            key_value_propositions=[
                "Unique privacy-preserving technology",
                "Proven cost optimization",
                "Enterprise-ready architecture"
            ],
            investment_highlights=[
                "Strong IP portfolio",
                "Regulatory compliance built-in",
                "Scalable SaaS model"
            ],
            processing_status="completed",
            completion_percentage=100.0
        )
        
        assert demo_metrics.request_id == "demo_test_123"
        assert demo_metrics.privacy_metrics.privacy_score == 92.5
        assert demo_metrics.cost_metrics.savings_percentage == 66.7
        assert demo_metrics.completion_percentage == 100.0
        assert len(demo_metrics.key_value_propositions) == 3


class TestWebSocketMessages:
    """Test WebSocket message formats for investor demo"""
    
    def test_investor_websocket_message_creation(self):
        """Test creating investor WebSocket messages"""
        message = InvestorWebSocketMessage(
            message_type=WebSocketMessageType.PRIVACY_UPDATE,
            timestamp=datetime.utcnow(),
            request_id="req_123",
            data={
                "privacy_score": 92.5,
                "pii_entities_detected": 2,
                "risk_level": "moderate"
            },
            narrative="🔒 Privacy analysis complete - 92.5% protection achieved",
            visualization_hint="update_privacy_gauge"
        )
        
        assert message.message_type == WebSocketMessageType.PRIVACY_UPDATE
        assert message.data["privacy_score"] == 92.5
        assert "92.5%" in message.narrative
        
    def test_all_websocket_message_types(self):
        """Test all WebSocket message types are valid"""
        message_types = [
            WebSocketMessageType.STEP_PROGRESS,
            WebSocketMessageType.PRIVACY_UPDATE,
            WebSocketMessageType.COST_CALCULATION,
            WebSocketMessageType.PERFORMANCE_METRIC,
            WebSocketMessageType.PROVIDER_ROUTING,
            WebSocketMessageType.BUSINESS_INSIGHT,
            WebSocketMessageType.EXECUTIVE_SUMMARY,
            WebSocketMessageType.DEMO_COMPLETE
        ]
        
        for msg_type in message_types:
            message = InvestorWebSocketMessage(
                message_type=msg_type,
                timestamp=datetime.utcnow(),
                request_id="test",
                data={"test": "data"}
            )
            assert message.message_type == msg_type