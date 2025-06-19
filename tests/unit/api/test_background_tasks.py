"""
Unit tests for background tasks and SSE integration
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from src.api.background_tasks import process_query_task
from src.api.models import QueryRequest
from src.api.sse import SSEManager, SSEMessage


class TestBackgroundTasks:
    """Tests for background task processing with SSE"""
    
    @pytest.fixture
    def mock_sse_manager(self):
        """Create mock SSE manager"""
        manager = Mock(spec=SSEManager)
        manager.send = AsyncMock(return_value=True)
        manager.register = AsyncMock()
        manager.unregister = AsyncMock()
        return manager
    
    @pytest.fixture
    def mock_state_manager(self):
        """Create mock state manager"""
        manager = Mock()
        manager.create_request = AsyncMock()
        manager.update_request = AsyncMock()
        manager.get_request = AsyncMock()
        return manager
    
    @pytest.fixture
    def mock_detection_engine(self):
        """Create mock detection engine"""
        engine = Mock()
        engine.analyze = AsyncMock(return_value={
            "has_pii": True,
            "has_code": False,
            "sensitivity_score": 0.7,
            "pii_entities": [
                {"text": "John Doe", "type": "PERSON", "start": 0, "end": 8}
            ],
            "entities": ["Acme Corp"],
            "code_language": None
        })
        return engine
    
    @pytest.fixture
    def mock_orchestrator(self):
        """Create mock orchestrator"""
        orchestrator = Mock()
        orchestrator.should_fragment = AsyncMock(return_value=True)
        orchestrator.determine_strategy = AsyncMock(return_value={
            "strategy": "entity_based",
            "reasoning": "Contains PII entities"
        })
        return orchestrator
    
    @pytest.fixture
    def mock_fragmenter(self):
        """Create mock fragmenter"""
        fragmenter = Mock()
        fragmenter.fragment = AsyncMock(return_value=[
            {
                "content": "What information about [PERSON]?",
                "metadata": {"index": 0, "has_pii": True}
            },
            {
                "content": "Works at [ORGANIZATION]",
                "metadata": {"index": 1, "has_pii": True}
            }
        ])
        return fragmenter
    
    @pytest.fixture
    def mock_fragment_processor(self):
        """Create mock fragment processor"""
        processor = Mock()
        processor.process_fragments = AsyncMock(return_value={
            "fragments": [
                {"provider": "openai", "response": "Information about person"},
                {"provider": "anthropic", "response": "Organization details"}
            ],
            "responses": ["Information about person", "Organization details"]
        })
        return processor
    
    @pytest.fixture
    def mock_response_aggregator(self):
        """Create mock response aggregator"""
        aggregator = Mock()
        aggregator.aggregate = AsyncMock(return_value={
            "response": "Combined response about John Doe at Acme Corp",
            "quality_score": 0.9,
            "coherence_score": 0.85
        })
        return aggregator
    
    @pytest.mark.asyncio
    async def test_process_query_with_sse_events(
        self,
        mock_sse_manager,
        mock_state_manager,
        mock_detection_engine,
        mock_orchestrator,
        mock_fragmenter,
        mock_fragment_processor,
        mock_response_aggregator
    ):
        """Test that process_query_task sends correct SSE events"""
        request_id = "test_123"
        query_request = QueryRequest(
            query="My name is John Doe and I work at Acme Corp"
        )
        
        # Mock dependencies
        with patch("src.api.background_tasks.sse_manager", mock_sse_manager):
            with patch("src.api.background_tasks.state_manager", mock_state_manager):
                with patch("src.api.background_tasks.detection_engine", mock_detection_engine):
                    with patch("src.api.background_tasks.orchestrator", mock_orchestrator):
                        with patch("src.api.background_tasks.get_fragmenter", return_value=mock_fragmenter):
                            with patch("src.api.background_tasks.fragment_processor", mock_fragment_processor):
                                with patch("src.api.background_tasks.response_aggregator", mock_response_aggregator):
                                    # Run task
                                    await process_query_task(request_id, query_request)
        
        # Verify SSE events were sent
        assert mock_sse_manager.send.called
        
        # Check specific event types were sent
        call_args_list = mock_sse_manager.send.call_args_list
        events_sent = []
        
        for call in call_args_list:
            args = call[0]
            if len(args) >= 2:
                message = args[1]
                if hasattr(message, 'event'):
                    events_sent.append(message.event)
        
        # Verify key events were sent
        expected_events = [
            "progress",  # Multiple progress events
            "detection_complete",
            "fragmentation_complete",
            "routing_complete",
            "processing_complete",
            "aggregation_complete",
            "complete"
        ]
        
        for expected_event in expected_events:
            assert any(expected_event in event for event in events_sent), \
                f"Expected event '{expected_event}' not found in {events_sent}"
    
    @pytest.mark.asyncio
    async def test_sse_progress_event_structure(self, mock_sse_manager):
        """Test SSE progress event data structure"""
        request_id = "test_123"
        
        # Simulate sending a progress event
        progress_message = SSEMessage(
            event="progress",
            data={
                "step": 1,
                "total_steps": 7,
                "current_step": "detection",
                "message": "Analyzing query for sensitive content",
                "progress_percentage": 14.3
            },
            id=f"{request_id}_progress_1"
        )
        
        await mock_sse_manager.send(request_id, progress_message)
        
        # Verify call
        mock_sse_manager.send.assert_called_with(request_id, progress_message)
        
        # Verify data structure
        call_args = mock_sse_manager.send.call_args[0]
        message = call_args[1]
        
        assert message.event == "progress"
        assert message.data["step"] == 1
        assert message.data["total_steps"] == 7
        assert "current_step" in message.data
        assert "message" in message.data
        assert "progress_percentage" in message.data
    
    @pytest.mark.asyncio
    async def test_sse_error_event(self, mock_sse_manager, mock_state_manager):
        """Test SSE error event emission"""
        request_id = "test_123"
        query_request = QueryRequest(query="Test query")
        
        # Mock detection engine to raise error
        mock_detection_engine = Mock()
        mock_detection_engine.analyze = AsyncMock(
            side_effect=Exception("Detection failed")
        )
        
        with patch("src.api.background_tasks.sse_manager", mock_sse_manager):
            with patch("src.api.background_tasks.state_manager", mock_state_manager):
                with patch("src.api.background_tasks.detection_engine", mock_detection_engine):
                    # Run task - should handle error
                    await process_query_task(request_id, query_request)
        
        # Verify error event was sent
        call_args_list = mock_sse_manager.send.call_args_list
        error_event_sent = False
        
        for call in call_args_list:
            args = call[0]
            if len(args) >= 2:
                message = args[1]
                if hasattr(message, 'event') and message.event == "error":
                    error_event_sent = True
                    # Verify error data
                    assert "error" in message.data
                    assert "step" in message.data
                    break
        
        assert error_event_sent, "Error event was not sent"
    
    @pytest.mark.asyncio
    async def test_sse_complete_event_data(
        self,
        mock_sse_manager,
        mock_state_manager,
        mock_detection_engine,
        mock_orchestrator,
        mock_fragmenter,
        mock_fragment_processor,
        mock_response_aggregator
    ):
        """Test complete event contains summary data"""
        request_id = "test_123"
        query_request = QueryRequest(query="Test query")
        
        with patch("src.api.background_tasks.sse_manager", mock_sse_manager):
            with patch("src.api.background_tasks.state_manager", mock_state_manager):
                with patch("src.api.background_tasks.detection_engine", mock_detection_engine):
                    with patch("src.api.background_tasks.orchestrator", mock_orchestrator):
                        with patch("src.api.background_tasks.get_fragmenter", return_value=mock_fragmenter):
                            with patch("src.api.background_tasks.fragment_processor", mock_fragment_processor):
                                with patch("src.api.background_tasks.response_aggregator", mock_response_aggregator):
                                    await process_query_task(request_id, query_request)
        
        # Find complete event
        complete_event = None
        for call in mock_sse_manager.send.call_args_list:
            args = call[0]
            if len(args) >= 2:
                message = args[1]
                if hasattr(message, 'event') and message.event == "complete":
                    complete_event = message
                    break
        
        assert complete_event is not None, "Complete event was not sent"
        
        # Verify complete event data
        assert "total_time" in complete_event.data
        assert "privacy_score" in complete_event.data
        assert "fragments_created" in complete_event.data
        assert "providers_used" in complete_event.data
    
    @pytest.mark.asyncio
    async def test_sse_connection_cleanup_on_error(
        self,
        mock_sse_manager,
        mock_state_manager
    ):
        """Test SSE connection cleanup when task fails"""
        request_id = "test_123"
        query_request = QueryRequest(query="Test query")
        
        # Mock to raise exception
        with patch("src.api.background_tasks.sse_manager", mock_sse_manager):
            with patch("src.api.background_tasks.state_manager", mock_state_manager):
                with patch("src.api.background_tasks.detection_engine") as mock_det:
                    mock_det.analyze = AsyncMock(side_effect=Exception("Fatal error"))
                    
                    await process_query_task(request_id, query_request)
        
        # Should still send error event
        assert mock_sse_manager.send.called
        
        # Should update state to failed
        mock_state_manager.update_request.assert_called()
        update_calls = mock_state_manager.update_request.call_args_list
        
        # Find the failure update
        failure_update_found = False
        for call in update_calls:
            if len(call[0]) >= 2:
                update_data = call[0][1]
                if update_data.get("status") == "failed":
                    failure_update_found = True
                    break
        
        assert failure_update_found, "Failed status update not found"