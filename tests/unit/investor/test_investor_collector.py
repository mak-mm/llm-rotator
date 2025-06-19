"""
Unit tests for investor metrics collector
Tests the collection, processing, and broadcasting of investor demo metrics
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch, MagicMock

from src.api.investor_collector import (
    InvestorMetricsCollector,
    MetricsCollectionSession,
    investor_metrics_collector
)
from src.api.investor_models import (
    WebSocketMessageType,
    RiskLevel,
    ComplianceStandard
)


class TestMetricsCollectionSession:
    """Test the metrics collection session data structure"""
    
    def test_session_creation(self):
        """Test creating a new metrics collection session"""
        request_id = "test_req_123"
        session = MetricsCollectionSession(request_id=request_id)
        
        assert session.request_id == request_id
        assert isinstance(session.start_time, datetime)
        assert session.step_timings == {}
        assert session.provider_timings == {}
        assert session.routing_decisions == []
        assert session.cost_breakdown == {}
        assert session.privacy_events == []
        assert session.performance_data == {}


class TestInvestorMetricsCollector:
    """Test the investor metrics collector functionality"""
    
    @pytest.fixture
    def collector(self):
        """Create a fresh collector instance for each test"""
        return InvestorMetricsCollector()
    
    @pytest.fixture
    def mock_websocket_broadcaster(self):
        """Create a mock WebSocket broadcaster"""
        mock_broadcaster = Mock()
        mock_broadcaster.broadcast_investor_update = AsyncMock()
        return mock_broadcaster
    
    def test_collector_initialization(self, collector):
        """Test collector initialization"""
        assert collector.active_sessions == {}
        assert collector.websocket_broadcaster is None
    
    @pytest.mark.asyncio
    async def test_start_collection(self, collector, mock_websocket_broadcaster):
        """Test starting metrics collection for a new request"""
        collector.websocket_broadcaster = mock_websocket_broadcaster
        request_id = "test_req_123"
        
        # Mock the broadcast method to avoid asyncio.create_task issues
        with patch.object(collector, '_broadcast_demo_message', new_callable=AsyncMock):
            session = collector.start_collection(request_id)
            
            assert session.request_id == request_id
            assert request_id in collector.active_sessions
            assert collector.active_sessions[request_id] == session
    
    @pytest.mark.asyncio
    async def test_record_step_start(self, collector, mock_websocket_broadcaster):
        """Test recording step start with WebSocket broadcast"""
        collector.websocket_broadcaster = mock_websocket_broadcaster
        request_id = "test_req_123"
        
        # Start collection first
        session = collector.start_collection(request_id)
        
        # Record step start
        await collector.record_step_start(request_id, "pii_detection", 1)
        
        # Verify step timing recorded
        assert "pii_detection" in session.step_timings
        assert session.step_timings["pii_detection"]["step_number"] == 1
        assert "start" in session.step_timings["pii_detection"]
        
        # Verify WebSocket broadcast called
        mock_websocket_broadcaster.broadcast_investor_update.assert_called()
        call_args = mock_websocket_broadcaster.broadcast_investor_update.call_args[0][0]
        assert call_args["message_type"] == WebSocketMessageType.STEP_PROGRESS
        assert call_args["data"]["step"] == "pii_detection"
        assert call_args["data"]["status"] == "processing"
    
    @pytest.mark.asyncio
    async def test_record_step_completion(self, collector, mock_websocket_broadcaster):
        """Test recording step completion with duration calculation"""
        collector.websocket_broadcaster = mock_websocket_broadcaster
        request_id = "test_req_123"
        
        # Start collection and record step start
        session = collector.start_collection(request_id)
        await collector.record_step_start(request_id, "pii_detection", 1)
        
        # Small delay to ensure duration > 0
        await asyncio.sleep(0.01)
        
        # Record step completion
        additional_data = {"pii_entities_found": 2}
        await collector.record_step_completion(request_id, "pii_detection", additional_data)
        
        # Verify step completion recorded
        assert "end" in session.step_timings["pii_detection"]
        assert "duration_ms" in session.step_timings["pii_detection"]
        assert session.step_timings["pii_detection"]["duration_ms"] > 0
        
        # Verify WebSocket broadcast
        mock_websocket_broadcaster.broadcast_investor_update.assert_called()
        call_args = mock_websocket_broadcaster.broadcast_investor_update.call_args[0][0]
        assert call_args["data"]["status"] == "completed"
        assert call_args["data"]["pii_entities_found"] == 2
    
    @pytest.mark.asyncio
    async def test_record_privacy_analysis(self, collector, mock_websocket_broadcaster):
        """Test recording privacy analysis with PII detection"""
        collector.websocket_broadcaster = mock_websocket_broadcaster
        request_id = "test_req_123"
        
        # Mock detection result
        mock_detection_result = Mock()
        mock_detection_result.pii_entities = [
            Mock(text="test@example.com", type=Mock(value="EMAIL_ADDRESS"), score=0.95, start=0, end=16),
            Mock(text="John Doe", type=Mock(value="PERSON"), score=0.88, start=20, end=28)
        ]
        mock_detection_result.sensitivity_score = 0.7
        
        collector.start_collection(request_id)
        await collector.record_privacy_analysis(request_id, mock_detection_result)
        
        # Verify WebSocket broadcast with privacy data
        mock_websocket_broadcaster.broadcast_investor_update.assert_called()
        call_args = mock_websocket_broadcaster.broadcast_investor_update.call_args[0][0]
        assert call_args["message_type"] == WebSocketMessageType.PRIVACY_UPDATE
        assert call_args["data"]["pii_entities_found"] == 2
        assert "privacy_score" in call_args["data"]
        assert "🔒" in call_args["data"]["narrative"]
    
    @pytest.mark.asyncio
    async def test_record_cost_optimization(self, collector, mock_websocket_broadcaster):
        """Test recording cost optimization metrics"""
        collector.websocket_broadcaster = mock_websocket_broadcaster
        request_id = "test_req_123"
        
        # Mock fragments
        mock_fragments = [
            Mock(provider="openai", content="Fragment 1 content"),
            Mock(provider="anthropic", content="Fragment 2 content"),
            Mock(provider="google", content="Fragment 3 content")
        ]
        
        collector.start_collection(request_id)
        await collector.record_cost_optimization(request_id, mock_fragments)
        
        # Verify WebSocket broadcast with cost data
        mock_websocket_broadcaster.broadcast_investor_update.assert_called()
        call_args = mock_websocket_broadcaster.broadcast_investor_update.call_args[0][0]
        assert call_args["message_type"] == WebSocketMessageType.COST_CALCULATION
        assert "total_cost" in call_args["data"]
        assert "savings_percentage" in call_args["data"]
        assert "provider_breakdown" in call_args["data"]
        assert "💰" in call_args["data"]["narrative"]
    
    @pytest.mark.asyncio
    async def test_record_provider_routing(self, collector, mock_websocket_broadcaster):
        """Test recording provider routing decisions"""
        collector.websocket_broadcaster = mock_websocket_broadcaster
        request_id = "test_req_123"
        fragment_id = "frag_001"
        provider_id = "anthropic"
        reasoning = "High sensitivity content requires Claude's safety features"
        
        session = collector.start_collection(request_id)
        await collector.record_provider_routing(request_id, fragment_id, provider_id, reasoning)
        
        # Verify routing decision recorded in session
        assert len(session.routing_decisions) == 1
        routing_decision = session.routing_decisions[0]
        assert routing_decision.fragment_id == fragment_id
        assert routing_decision.provider_selected == provider_id
        assert routing_decision.reasoning == reasoning
        
        # Verify WebSocket broadcast
        mock_websocket_broadcaster.broadcast_investor_update.assert_called()
        call_args = mock_websocket_broadcaster.broadcast_investor_update.call_args[0][0]
        assert call_args["message_type"] == WebSocketMessageType.PROVIDER_ROUTING
        assert call_args["data"]["provider_selected"] == provider_id
        assert "🧠" in call_args["data"]["narrative"]
    
    @pytest.mark.asyncio
    async def test_record_performance_metrics(self, collector, mock_websocket_broadcaster):
        """Test recording performance metrics"""
        collector.websocket_broadcaster = mock_websocket_broadcaster
        request_id = "test_req_123"
        total_time = 1.85
        
        collector.start_collection(request_id)
        await collector.record_performance_metrics(request_id, total_time)
        
        # Verify WebSocket broadcast with performance data
        mock_websocket_broadcaster.broadcast_investor_update.assert_called()
        call_args = mock_websocket_broadcaster.broadcast_investor_update.call_args[0][0]
        assert call_args["message_type"] == WebSocketMessageType.PERFORMANCE_METRIC
        assert call_args["data"]["total_processing_time"] == 1.85
        assert "throughput_rate" in call_args["data"]
        assert "system_efficiency" in call_args["data"]
        assert "⚡" in call_args["data"]["narrative"]
    
    @pytest.mark.asyncio
    async def test_generate_executive_summary(self, collector, mock_websocket_broadcaster):
        """Test generating executive summary"""
        collector.websocket_broadcaster = mock_websocket_broadcaster
        request_id = "test_req_123"
        
        collector.start_collection(request_id)
        
        # Generate executive summary
        summary = await collector.generate_executive_summary(request_id)
        
        # Verify summary structure
        assert "executive_summary" in summary
        assert "business_insights" in summary
        assert "privacy_protection" in summary["executive_summary"]
        assert "cost_optimization" in summary["executive_summary"]
        assert "key_differentiators" in summary["business_insights"]
        assert "market_validation" in summary["business_insights"]
        
        # Verify WebSocket broadcast
        mock_websocket_broadcaster.broadcast_investor_update.assert_called()
        call_args = mock_websocket_broadcaster.broadcast_investor_update.call_args[0][0]
        assert call_args["message_type"] == WebSocketMessageType.EXECUTIVE_SUMMARY
        assert "📊" in call_args["data"]["narrative"]
    
    def test_calculate_risk_level(self, collector):
        """Test PII risk level calculation"""
        # High risk entities
        assert collector._calculate_risk_level("CREDIT_CARD", 0.95) == RiskLevel.HIGH
        assert collector._calculate_risk_level("SSN", 0.85) == RiskLevel.HIGH
        assert collector._calculate_risk_level("EMAIL_ADDRESS", 0.95) == RiskLevel.HIGH
        
        # Moderate risk entities
        assert collector._calculate_risk_level("EMAIL_ADDRESS", 0.8) == RiskLevel.MODERATE
        assert collector._calculate_risk_level("PHONE_NUMBER", 0.75) == RiskLevel.MODERATE
        
        # Low risk entities
        assert collector._calculate_risk_level("PERSON", 0.6) == RiskLevel.LOW
        assert collector._calculate_risk_level("UNKNOWN_TYPE", 0.5) == RiskLevel.LOW
    
    def test_determine_compliance_impact(self, collector):
        """Test compliance impact determination"""
        # Credit card impacts PCI DSS and GDPR
        compliance = collector._determine_compliance_impact("CREDIT_CARD")
        assert ComplianceStandard.PCI_DSS in compliance
        assert ComplianceStandard.GDPR in compliance
        
        # SSN impacts HIPAA and SOC2
        compliance = collector._determine_compliance_impact("SSN")
        assert ComplianceStandard.HIPAA in compliance
        assert ComplianceStandard.SOC2 in compliance
        
        # Email impacts GDPR and CCPA
        compliance = collector._determine_compliance_impact("EMAIL_ADDRESS")
        assert ComplianceStandard.GDPR in compliance
        assert ComplianceStandard.CCPA in compliance
        
        # Unknown types default to GDPR
        compliance = collector._determine_compliance_impact("UNKNOWN_TYPE")
        assert ComplianceStandard.GDPR in compliance
    
    def test_get_step_narrative(self, collector):
        """Test step narrative generation"""
        # Start narratives
        start_narrative = collector._get_step_narrative("pii_detection", "start")
        assert "🔍" in start_narrative
        assert "enterprise-grade" in start_narrative.lower()
        
        # Completion narratives
        complete_narrative = collector._get_step_narrative("pii_detection", "complete")
        assert "✅" in complete_narrative
        assert "complete" in complete_narrative.lower()
        
        # Fragmentation narratives
        frag_start = collector._get_step_narrative("fragmentation", "start")
        assert "⚡" in frag_start
        assert "semantic" in frag_start.lower()
        
        # Distribution narratives
        dist_complete = collector._get_step_narrative("distribution", "complete")
        assert "✅" in dist_complete
        assert "67%" in dist_complete
    
    @pytest.mark.asyncio
    async def test_broadcast_without_websocket_broadcaster(self, collector):
        """Test broadcasting when no WebSocket broadcaster is set"""
        # Should not raise exception when broadcaster is None
        request_id = "test_req_123"
        collector.start_collection(request_id)
        
        # These should complete without error even with no broadcaster
        await collector.record_step_start(request_id, "test_step", 1)
        await collector.record_step_completion(request_id, "test_step")
    
    @pytest.mark.asyncio
    async def test_operations_with_invalid_request_id(self, collector, mock_websocket_broadcaster):
        """Test operations with non-existent request IDs"""
        collector.websocket_broadcaster = mock_websocket_broadcaster
        invalid_request_id = "non_existent_request"
        
        # These operations should handle invalid request IDs gracefully
        await collector.record_step_start(invalid_request_id, "test_step", 1)
        await collector.record_step_completion(invalid_request_id, "test_step")
        await collector.record_privacy_analysis(invalid_request_id, Mock())
        await collector.record_cost_optimization(invalid_request_id, [])
        await collector.record_provider_routing(invalid_request_id, "frag", "provider", "reason")
        await collector.record_performance_metrics(invalid_request_id, 1.0)
        
        # Should not have created any sessions
        assert invalid_request_id not in collector.active_sessions
    
    @pytest.mark.asyncio
    async def test_concurrent_session_handling(self, collector, mock_websocket_broadcaster):
        """Test handling multiple concurrent sessions"""
        collector.websocket_broadcaster = mock_websocket_broadcaster
        
        # Start multiple sessions
        request_ids = ["req_1", "req_2", "req_3"]
        sessions = []
        
        for req_id in request_ids:
            session = collector.start_collection(req_id)
            sessions.append(session)
            await collector.record_step_start(req_id, "pii_detection", 1)
        
        # Verify all sessions are tracked
        assert len(collector.active_sessions) == 3
        for req_id in request_ids:
            assert req_id in collector.active_sessions
            assert "pii_detection" in collector.active_sessions[req_id].step_timings
        
        # Complete steps for different sessions
        await collector.record_step_completion("req_1", "pii_detection")
        await collector.record_step_start("req_2", "fragmentation", 2)
        
        # Verify individual session state
        assert "end" in collector.active_sessions["req_1"].step_timings["pii_detection"]
        assert "fragmentation" in collector.active_sessions["req_2"].step_timings
        assert "fragmentation" not in collector.active_sessions["req_3"].step_timings


class TestGlobalCollectorInstance:
    """Test the global collector instance"""
    
    def test_global_instance_exists(self):
        """Test that global collector instance exists and is properly initialized"""
        assert investor_metrics_collector is not None
        assert isinstance(investor_metrics_collector, InvestorMetricsCollector)
        # Clear any existing sessions from other tests
        investor_metrics_collector.active_sessions.clear()
        assert investor_metrics_collector.active_sessions == {}
    
    def test_global_instance_singleton_behavior(self):
        """Test that we're working with the same global instance"""
        from src.api.investor_collector import investor_metrics_collector as collector1
        from src.api.investor_collector import investor_metrics_collector as collector2
        
        assert collector1 is collector2
        assert id(collector1) == id(collector2)