"""
Unit tests for orchestrator components
"""

import pytest
import pytest_asyncio
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from src.orchestrator.models import (
    OrchestrationRequest, OrchestrationResponse, OrchestrationConfig,
    ProcessingStage, FragmentProcessingResult, PrivacyLevel,
    IntelligenceDecision
)
from src.orchestrator.orchestrator import QueryOrchestrator
from src.orchestrator.response_aggregator import ResponseAggregator
from src.orchestrator.intelligence import (
    PrivacyIntelligence, CostOptimizer, PerformanceMonitor
)
from src.fragmentation.models import (
    QueryFragment, FragmentationType, FragmentationStrategy
)
from src.providers.models import (
    LLMResponse, ProviderType, ProviderLoadBalancingConfig
)
from src.providers.manager import ProviderManager
from src.detection.models import DetectionReport, PIIEntity, PIIEntityType, CodeDetection


class TestOrchestrationModels:
    """Test orchestration data models"""
    
    def test_orchestration_config_creation(self):
        """Test creating orchestration configuration"""
        config = OrchestrationConfig(
            enable_pii_detection=True,
            enable_code_detection=True,
            default_strategy=FragmentationStrategy.PII_ISOLATION,
            max_fragment_size=1500
        )
        
        assert config.enable_pii_detection is True
        assert config.enable_code_detection is True
        assert config.default_strategy == FragmentationStrategy.PII_ISOLATION
        assert config.max_fragment_size == 1500
        assert config.max_concurrent_requests == 10  # Default value
    
    def test_orchestration_request_creation(self):
        """Test creating orchestration request"""
        request = OrchestrationRequest(
            query="Test query with sensitive data",
            user_id="user123",
            privacy_level=PrivacyLevel.CONFIDENTIAL,
            preferred_providers=[ProviderType.ANTHROPIC]
        )
        
        assert request.query == "Test query with sensitive data"
        assert request.user_id == "user123"
        assert request.privacy_level == PrivacyLevel.CONFIDENTIAL
        assert ProviderType.ANTHROPIC in request.preferred_providers
        assert request.request_id is not None
        assert request.priority == 5  # Default value
    
    def test_fragment_processing_result_creation(self):
        """Test creating fragment processing result"""
        llm_response = LLMResponse(
            request_id="test-request",
            provider_id="test-provider",
            content="Test response",
            finish_reason="stop",
            tokens_used=50,
            latency_ms=200.0,
            model_used="test-model"
        )
        
        result = FragmentProcessingResult(
            fragment_id="fragment-1",
            provider_id="test-provider",
            response=llm_response,
            processing_time_ms=250.0,
            cost_estimate=0.05,
            privacy_score=0.9
        )
        
        assert result.fragment_id == "fragment-1"
        assert result.provider_id == "test-provider"
        assert result.response == llm_response
        assert result.processing_time_ms == 250.0
        assert result.cost_estimate == 0.05
        assert result.privacy_score == 0.9
    
    def test_intelligence_decision_creation(self):
        """Test creating intelligence decision"""
        decision = IntelligenceDecision(
            component="privacy_intelligence",
            decision_type="provider_routing",
            recommendation="use_anthropic_for_pii",
            confidence=0.95,
            reasoning="PII detected requiring high privacy provider"
        )
        
        assert decision.component == "privacy_intelligence"
        assert decision.decision_type == "provider_routing"
        assert decision.recommendation == "use_anthropic_for_pii"
        assert decision.confidence == 0.95
        assert decision.reasoning == "PII detected requiring high privacy provider"


class TestResponseAggregator:
    """Test response aggregation functionality"""
    
    @pytest.fixture
    def aggregator(self):
        return ResponseAggregator()
    
    @pytest.fixture
    def sample_fragments(self):
        return [
            QueryFragment(
                fragment_id="frag-1",
                content="What is artificial intelligence?",
                fragment_type=FragmentationType.GENERAL,
                order=0
            ),
            QueryFragment(
                fragment_id="frag-2", 
                content="My name is <PERSON> and I work at <ORGANIZATION>",
                fragment_type=FragmentationType.PII,
                order=1
            )
        ]
    
    @pytest.fixture
    def sample_results(self):
        return [
            FragmentProcessingResult(
                fragment_id="frag-1",
                provider_id="openai",
                response=LLMResponse(
                    request_id="req-1",
                    provider_id="openai", 
                    content="AI is a field of computer science...",
                    finish_reason="stop",
                    tokens_used=25,
                    latency_ms=150.0,
                    model_used="gpt-4"
                ),
                processing_time_ms=150.0,
                cost_estimate=0.02
            ),
            FragmentProcessingResult(
                fragment_id="frag-2",
                provider_id="anthropic",
                response=LLMResponse(
                    request_id="req-1",
                    provider_id="anthropic",
                    content="Your information has been processed securely.",
                    finish_reason="stop", 
                    tokens_used=15,
                    latency_ms=120.0,
                    model_used="claude-sonnet-4-20250514"
                ),
                processing_time_ms=120.0,
                cost_estimate=0.01
            )
        ]
    
    @pytest.fixture
    def sample_request(self):
        return OrchestrationRequest(
            query="Test query",
            privacy_level=PrivacyLevel.INTERNAL
        )
    
    @pytest.mark.asyncio
    async def test_sequential_aggregation(self, aggregator, sample_fragments, sample_results, sample_request):
        """Test sequential response aggregation"""
        aggregated = await aggregator.aggregate_responses(
            sample_results, sample_fragments, sample_request
        )
        
        assert isinstance(aggregated, str)
        assert len(aggregated) > 0
        assert "AI is a field" in aggregated
        assert "processed securely" in aggregated
    
    @pytest.mark.asyncio
    async def test_pii_reassembly_strategy(self, aggregator, sample_fragments, sample_results, sample_request):
        """Test PII reassembly strategy selection"""
        # Update fragment to have PII
        sample_fragments[1].fragment_type = FragmentationType.PII
        
        strategy = aggregator._select_aggregation_strategy(sample_fragments, sample_request)
        assert strategy == "pii_reassembly"
    
    def test_sort_fragments_by_order(self, aggregator, sample_fragments, sample_results):
        """Test fragment sorting by order"""
        # Reverse the results order
        reversed_results = list(reversed(sample_results))
        
        sorted_pairs = aggregator._sort_fragments_by_order(reversed_results, sample_fragments)
        
        # Should be sorted by fragment order (0, 1)
        assert sorted_pairs[0][1].order == 0
        assert sorted_pairs[1][1].order == 1
        assert sorted_pairs[0][0].fragment_id == "frag-1"
        assert sorted_pairs[1][0].fragment_id == "frag-2"


class TestPrivacyIntelligence:
    """Test privacy intelligence component"""
    
    @pytest.fixture
    def privacy_intelligence(self):
        return PrivacyIntelligence()
    
    @pytest.fixture
    def sample_detection_report(self):
        return DetectionReport(
            has_pii=True,
            pii_entities=[
                PIIEntity(
                    text="123-45-6789",
                    type=PIIEntityType.SSN,
                    start=10,
                    end=21,
                    score=0.95
                )
            ],
            pii_density=0.2,
            code_detection=CodeDetection(
                has_code=False,
                language=None,
                confidence=0.0,
                code_blocks=[]
            ),
            named_entities=[],
            sensitivity_score=0.8,
            processing_time=100.0,
            analyzers_used=["presidio"]
        )
    
    @pytest.fixture
    def sample_request(self):
        return OrchestrationRequest(
            query="My SSN is 123-45-6789",
            privacy_level=PrivacyLevel.CONFIDENTIAL
        )
    
    @pytest.fixture
    def sample_fragments(self):
        return [
            QueryFragment(
                fragment_id="frag-1",
                content="My SSN is <SSN>",
                fragment_type=FragmentationType.PII,
                order=0
            )
        ]
    
    @pytest.mark.asyncio
    async def test_analyze_privacy_requirements(
        self, privacy_intelligence, sample_request, sample_detection_report, sample_fragments
    ):
        """Test privacy requirements analysis"""
        decisions = await privacy_intelligence.analyze_privacy_requirements(
            sample_request, sample_detection_report, sample_fragments
        )
        
        assert len(decisions) >= 2  # Should have privacy assessment and routing decisions
        
        # Check privacy assessment decision
        privacy_decision = next(
            (d for d in decisions if d.decision_type == "privacy_level_assessment"), None
        )
        assert privacy_decision is not None
        assert privacy_decision.component == "privacy_intelligence"
        assert privacy_decision.confidence > 0.5
    
    @pytest.mark.asyncio
    async def test_recommend_provider_routing_high_sensitivity(
        self, privacy_intelligence, sample_fragments, sample_detection_report
    ):
        """Test provider routing for high sensitivity data"""
        fragment = sample_fragments[0]
        
        decision = await privacy_intelligence._recommend_provider_routing(
            fragment, sample_detection_report, PrivacyLevel.RESTRICTED
        )
        
        assert decision.decision_type == "provider_routing"
        assert "anthropic" in decision.recommendation.lower()
        assert decision.confidence > 0.8
    
    def test_calculate_fragment_sensitivity(self, privacy_intelligence, sample_fragments, sample_detection_report):
        """Test fragment sensitivity calculation"""
        fragment = sample_fragments[0]  # PII fragment
        
        sensitivity = privacy_intelligence._calculate_fragment_sensitivity(
            fragment, sample_detection_report
        )
        
        assert 0.0 <= sensitivity <= 1.0
        assert sensitivity > 0.5  # Should be high for PII fragment


class TestCostOptimizer:
    """Test cost optimization component"""
    
    @pytest.fixture
    def cost_optimizer(self):
        return CostOptimizer()
    
    @pytest.fixture
    def sample_request(self):
        return OrchestrationRequest(
            query="Test query",
            metadata={"max_total_cost": 0.5}
        )
    
    @pytest.fixture
    def sample_fragments(self):
        return [
            QueryFragment(
                fragment_id="frag-1",
                content="Short query",
                fragment_type=FragmentationType.GENERAL,
                order=0
            )
        ]
    
    @pytest.fixture
    def available_providers(self):
        return {
            "frag-1": [ProviderType.OPENAI, ProviderType.ANTHROPIC, ProviderType.GOOGLE]
        }
    
    @pytest.mark.asyncio
    async def test_optimize_cost(self, cost_optimizer, sample_request, sample_fragments, available_providers):
        """Test cost optimization analysis"""
        decisions = await cost_optimizer.optimize_cost(
            sample_request, sample_fragments, available_providers
        )
        
        assert len(decisions) >= 2  # Provider selection + budget compliance
        
        # Check provider selection decision
        provider_decision = next(
            (d for d in decisions if d.decision_type == "provider_selection"), None
        )
        assert provider_decision is not None
        assert provider_decision.component == "cost_optimizer"
    
    def test_estimate_fragment_tokens(self, cost_optimizer, sample_fragments):
        """Test token estimation for fragments"""
        fragment = sample_fragments[0]
        
        tokens = cost_optimizer._estimate_fragment_tokens(fragment)
        
        assert isinstance(tokens, int)
        assert tokens > 0
    
    def test_calculate_cost(self, cost_optimizer):
        """Test cost calculation"""
        cost = cost_optimizer._calculate_cost(ProviderType.OPENAI, 1000)
        
        assert isinstance(cost, float)
        assert cost > 0
    
    def test_provider_performance_score(self, cost_optimizer):
        """Test provider performance scoring"""
        score = cost_optimizer._get_provider_performance_score(ProviderType.OPENAI)
        
        assert 0.0 <= score <= 1.0


class TestPerformanceMonitor:
    """Test performance monitoring component"""
    
    @pytest.fixture
    def performance_monitor(self):
        return PerformanceMonitor()
    
    @pytest.fixture
    def sample_request(self):
        return OrchestrationRequest(query="Test query")
    
    @pytest.fixture
    def sample_fragment_results(self):
        return [
            FragmentProcessingResult(
                fragment_id="frag-1",
                provider_id="openai",
                response=LLMResponse(
                    request_id="req-1",
                    provider_id="openai",
                    content="Response 1",
                    finish_reason="stop",
                    tokens_used=25,
                    latency_ms=150.0,
                    model_used="gpt-4"
                ),
                processing_time_ms=150.0,
                cost_estimate=0.02
            ),
            FragmentProcessingResult(
                fragment_id="frag-2",
                provider_id="anthropic",
                response=LLMResponse(
                    request_id="req-1",
                    provider_id="anthropic", 
                    content="Response 2",
                    finish_reason="stop",
                    tokens_used=30,
                    latency_ms=200.0,
                    model_used="claude-sonnet-4-20250514"
                ),
                processing_time_ms=200.0,
                cost_estimate=0.025
            )
        ]
    
    @pytest.mark.asyncio
    async def test_monitor_performance(
        self, performance_monitor, sample_request, sample_fragment_results
    ):
        """Test performance monitoring"""
        total_time = 500.0  # milliseconds
        
        decisions = await performance_monitor.monitor_performance(
            sample_request, sample_fragment_results, total_time
        )
        
        assert len(decisions) >= 3  # Overall + per-provider + bottleneck analysis
        
        # Check overall performance decision
        overall_decision = next(
            (d for d in decisions if d.decision_type == "overall_performance"), None
        )
        assert overall_decision is not None
        assert overall_decision.component == "performance_monitor"
    
    def test_calculate_success_rate(self, performance_monitor, sample_fragment_results):
        """Test success rate calculation"""
        success_rate = performance_monitor._calculate_success_rate(sample_fragment_results)
        
        assert 0.0 <= success_rate <= 1.0
        assert success_rate == 1.0  # All fragments successful
    
    def test_calculate_success_rate_with_failures(self, performance_monitor):
        """Test success rate calculation with failures"""
        failed_result = FragmentProcessingResult(
            fragment_id="frag-fail",
            provider_id="test",
            response=LLMResponse(
                request_id="req-1",
                provider_id="test",
                content="",
                finish_reason="error",
                tokens_used=0,
                latency_ms=0.0,
                model_used="test"
            ),
            processing_time_ms=1000.0,
            cost_estimate=0.0
        )
        
        success_rate = performance_monitor._calculate_success_rate([failed_result])
        assert success_rate == 0.0


@pytest.mark.integration 
class TestQueryOrchestrator:
    """Integration tests for the main orchestrator"""
    
    @pytest_asyncio.fixture
    async def orchestrator(self):
        """Create a test orchestrator with mocked dependencies"""
        config = OrchestrationConfig(
            enable_pii_detection=True,
            enable_code_detection=True,
            max_concurrent_requests=2
        )
        
        # Mock provider manager
        provider_manager = Mock(spec=ProviderManager)
        provider_manager.process_request = AsyncMock()
        
        # Create orchestrator
        orchestrator = QueryOrchestrator(config, provider_manager)
        
        yield orchestrator
        
        await orchestrator.shutdown()
    
    @pytest.fixture
    def sample_request(self):
        return OrchestrationRequest(
            query="What is machine learning? My email is john@example.com",
            privacy_level=PrivacyLevel.INTERNAL
        )
    
    @pytest.mark.asyncio
    async def test_process_query_end_to_end(self, orchestrator, sample_request):
        """Test end-to-end query processing"""
        # Mock the provider manager response
        mock_response = LLMResponse(
            request_id="test-request",
            provider_id="anthropic",
            content="Machine learning is a subset of AI that enables computers to learn...",
            finish_reason="stop",
            tokens_used=50,
            latency_ms=300.0,
            model_used="claude-sonnet-4-20250514"
        )
        orchestrator.provider_manager.process_request.return_value = mock_response
        
        # Process the query
        response = await orchestrator.process_query(sample_request)
        
        # Verify response
        assert isinstance(response, OrchestrationResponse)
        assert response.request_id == sample_request.request_id
        assert response.aggregated_response is not None
        assert len(response.aggregated_response) > 0
        assert response.fragments_processed > 0
        assert response.total_processing_time_ms > 0
        assert len(response.providers_used) > 0
    
    @pytest.mark.asyncio
    async def test_detection_stage(self, orchestrator, sample_request):
        """Test detection stage"""
        detection_report = await orchestrator._run_detection(sample_request)
        
        assert detection_report is not None
        assert hasattr(detection_report, 'has_pii')
        assert hasattr(detection_report, 'code_detection')
        assert hasattr(detection_report.code_detection, 'has_code')
    
    @pytest.mark.asyncio
    async def test_fragmentation_stage(self, orchestrator, sample_request):
        """Test fragmentation stage"""
        # First run detection
        detection_report = await orchestrator._run_detection(sample_request)
        
        # Then fragment
        fragmentation_result = await orchestrator._run_fragmentation(sample_request, detection_report)
        
        assert hasattr(fragmentation_result, 'fragments')
        assert len(fragmentation_result.fragments) > 0
        assert all(hasattr(f, 'fragment_id') for f in fragmentation_result.fragments)
        assert all(hasattr(f, 'content') for f in fragmentation_result.fragments)
    
    def test_provider_selection_for_sensitive_fragment(self, orchestrator):
        """Test provider selection for sensitive fragments"""
        # Create a PII fragment
        pii_fragment = QueryFragment(
            fragment_id="pii-frag",
            content="My SSN is <SSN>",
            fragment_type=FragmentationType.PII,
            order=0
        )
        
        request = OrchestrationRequest(
            query="Test",
            privacy_level=PrivacyLevel.RESTRICTED
        )
        
        criteria = orchestrator._select_provider_for_fragment(pii_fragment, [], request)
        
        assert criteria is not None
        assert len(criteria.preferred_providers) > 0
        # Should prefer privacy-focused providers for sensitive data
    
    def test_cost_estimation(self, orchestrator):
        """Test cost estimation"""
        cost = orchestrator._estimate_fragment_cost("anthropic", 100)
        
        assert isinstance(cost, float)
        assert cost > 0
    
    def test_privacy_score_calculation(self, orchestrator):
        """Test privacy score calculation"""
        score = orchestrator._calculate_privacy_score(
            "anthropic", FragmentationType.PII
        )
        
        assert 0.0 <= score <= 1.0
        assert score > 0.5  # Should be high for privacy-focused provider with PII
    
    def test_get_metrics(self, orchestrator):
        """Test metrics retrieval"""
        metrics = orchestrator.get_metrics()
        
        assert hasattr(metrics, 'total_requests')
        assert hasattr(metrics, 'successful_requests')
        assert hasattr(metrics, 'success_rate')
    
    def test_get_active_requests(self, orchestrator):
        """Test active requests tracking"""
        active = orchestrator.get_active_requests()
        
        assert isinstance(active, dict)