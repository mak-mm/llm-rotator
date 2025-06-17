"""
End-to-end tests using real OpenAI GPT-4o-mini
These tests verify the complete workflow with actual LLM providers
"""

import os
import pytest
import pytest_asyncio
import asyncio
import json
from datetime import datetime
from typing import List, Dict, Any

from src.orchestrator.orchestrator import QueryOrchestrator
from src.orchestrator.models import (
    OrchestrationConfig, OrchestrationRequest, PrivacyLevel
)
from src.providers.manager import ProviderManager
from src.providers.models import ProviderConfig, ProviderType
from src.fragmentation.models import FragmentationStrategy


class TestRealWorkflow:
    """
    End-to-end tests using real OpenAI GPT-4o-mini
    
    Requirements:
    - OPENAI_API_KEY environment variable must be set
    - Internet connection for API calls
    - These tests make actual API calls and may incur costs
    """
    
    @pytest.fixture(scope="class")
    def openai_api_key(self):
        """Get OpenAI API key from environment"""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            pytest.skip("OPENAI_API_KEY not set - skipping real API tests")
        return api_key
    
    @pytest_asyncio.fixture(scope="class")
    async def orchestrator(self, openai_api_key):
        """Create orchestrator with real OpenAI provider"""
        
        # Configure provider manager
        from src.providers.models import ProviderLoadBalancingConfig
        manager_config = ProviderLoadBalancingConfig(
            strategy="round_robin",
            failover_enabled=True,
            health_check_interval=60
        )
        
        provider_manager = ProviderManager(manager_config)
        
        # Add OpenAI provider
        openai_config = ProviderConfig(
            provider_type=ProviderType.OPENAI,
            api_key=openai_api_key,
            base_url="https://api.openai.com/v1",
            model_name="gpt-4o-mini",  # Cost-effective model for testing
            max_tokens=1000,
            temperature=0.1,  # Low temperature for consistent responses
            timeout=30
        )
        
        await provider_manager.add_provider("openai", openai_config)
        
        # Configure orchestrator
        config = OrchestrationConfig(
            enable_pii_detection=True,
            enable_code_detection=True,
            enable_privacy_routing=True,
            enable_cost_optimization=True,
            max_concurrent_requests=3,
            request_timeout=60,
            sensitive_data_providers=[ProviderType.OPENAI]  # Use OpenAI for all in tests
        )
        
        orchestrator = QueryOrchestrator(config, provider_manager)
        
        yield orchestrator
        
        await orchestrator.shutdown()
    
    @pytest.fixture
    def test_queries(self) -> List[Dict[str, Any]]:
        """Test queries with expected behavior"""
        return [
            {
                "name": "simple_factual",
                "query": "What is the capital of France?",
                "expected_fragments": 1,
                "expected_strategy": FragmentationStrategy.NONE,
                "privacy_level": PrivacyLevel.PUBLIC,
                "should_contain": ["Paris"],
                "should_not_contain": ["<PII>", "<CODE>"]
            },
            {
                "name": "pii_query",
                "query": "My name is John Smith and my email is john.smith@example.com. What's a good password manager?",
                "expected_fragments": 3,  # Redacted query + 2 PII fragments
                "expected_strategy": FragmentationStrategy.PII_ISOLATION,
                "privacy_level": PrivacyLevel.CONFIDENTIAL,
                "should_contain": ["password manager"],
                "should_not_contain": ["john.smith@example.com", "John Smith"]
            },
            {
                "name": "code_query",
                "query": "How can I improve this Python function: def hello(): print('Hello world')",
                "expected_fragments": 2,  # Text + code fragment
                "expected_strategy": FragmentationStrategy.CODE_ISOLATION,
                "privacy_level": PrivacyLevel.INTERNAL,
                "should_contain": ["improve", "function"],
                "should_not_contain": ["print('Hello world')"]  # Code should be in separate fragment
            },
            {
                "name": "complex_mixed",
                "query": "I'm John Doe (john@company.com) working on a Python script: import os; os.getenv('SECRET'). Can you help optimize it for security?",
                "expected_fragments": 4,  # Redacted text + name + email + code
                "expected_strategy": FragmentationStrategy.MAXIMUM_ISOLATION,
                "privacy_level": PrivacyLevel.RESTRICTED,
                "should_contain": ["optimize", "security"],
                "should_not_contain": ["John Doe", "john@company.com", "os.getenv('SECRET')"]
            },
            {
                "name": "long_query",
                "query": "Tell me about artificial intelligence. " * 50,  # Long repetitive query
                "expected_fragments": 1,  # Should not fragment simple repetitive text
                "expected_strategy": FragmentationStrategy.NONE,
                "privacy_level": PrivacyLevel.PUBLIC,
                "should_contain": ["artificial intelligence"],
                "should_not_contain": ["<PII>"]
            }
        ]
    
    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_simple_factual_query(self, orchestrator, test_queries):
        """Test simple factual query without sensitive data"""
        query_data = next(q for q in test_queries if q["name"] == "simple_factual")
        
        request = OrchestrationRequest(
            query=query_data["query"],
            privacy_level=query_data["privacy_level"]
        )
        
        response = await orchestrator.process_query(request)
        
        # Verify response structure
        assert response.request_id == request.request_id
        assert response.aggregated_response is not None
        assert len(response.aggregated_response) > 0
        assert response.fragments_processed == query_data["expected_fragments"]
        assert len(response.providers_used) > 0
        assert response.total_processing_time_ms > 0
        
        # Verify content expectations
        response_lower = response.aggregated_response.lower()
        for should_contain in query_data["should_contain"]:
            assert should_contain.lower() in response_lower
        
        for should_not_contain in query_data["should_not_contain"]:
            assert should_not_contain not in response.aggregated_response
        
        # Verify detection results
        assert not response.detection_report.has_pii
        assert not response.detection_report.code_detection.has_code
        assert response.detection_report.sensitivity_score < 0.3
    
    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_pii_isolation_query(self, orchestrator, test_queries):
        """Test PII isolation with real processing"""
        query_data = next(q for q in test_queries if q["name"] == "pii_query")
        
        request = OrchestrationRequest(
            query=query_data["query"],
            privacy_level=query_data["privacy_level"]
        )
        
        response = await orchestrator.process_query(request)
        
        # Verify PII was detected and isolated
        assert response.detection_report.has_pii
        assert len(response.detection_report.pii_entities) >= 2  # Name and email
        assert response.fragments_processed >= 2  # At least redacted + PII fragments
        
        # Verify PII was not leaked in final response
        for should_not_contain in query_data["should_not_contain"]:
            assert should_not_contain not in response.aggregated_response
        
        # Verify meaningful response was generated
        response_lower = response.aggregated_response.lower()
        for should_contain in query_data["should_contain"]:
            assert should_contain.lower() in response_lower
        
        # Verify privacy level achieved
        assert response.privacy_level_achieved in [PrivacyLevel.CONFIDENTIAL, PrivacyLevel.RESTRICTED]
    
    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_code_isolation_query(self, orchestrator, test_queries):
        """Test code isolation with real processing"""
        query_data = next(q for q in test_queries if q["name"] == "code_query")
        
        request = OrchestrationRequest(
            query=query_data["query"],
            privacy_level=query_data["privacy_level"]
        )
        
        response = await orchestrator.process_query(request)
        
        # Verify code was detected and isolated
        assert response.detection_report.code_detection.has_code
        assert response.fragments_processed >= 2  # Text + code fragments
        
        # Verify code was not leaked in final response context
        # (The specific code should not appear verbatim)
        for should_not_contain in query_data["should_not_contain"]:
            assert should_not_contain not in response.aggregated_response
        
        # Verify meaningful response about improvement was generated
        response_lower = response.aggregated_response.lower()
        for should_contain in query_data["should_contain"]:
            assert should_contain.lower() in response_lower
    
    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_complex_mixed_query(self, orchestrator, test_queries):
        """Test complex query with both PII and code"""
        query_data = next(q for q in test_queries if q["name"] == "complex_mixed")
        
        request = OrchestrationRequest(
            query=query_data["query"],
            privacy_level=query_data["privacy_level"]
        )
        
        response = await orchestrator.process_query(request)
        
        # Verify both PII and code were detected
        assert response.detection_report.has_pii
        assert response.detection_report.code_detection.has_code
        assert response.detection_report.sensitivity_score > 0.6
        
        # Verify maximum isolation was applied
        assert response.fragments_processed >= 3  # Multiple fragments for complex data
        
        # Verify sensitive data was not leaked
        for should_not_contain in query_data["should_not_contain"]:
            assert should_not_contain not in response.aggregated_response
        
        # Verify meaningful security advice was generated
        response_lower = response.aggregated_response.lower()
        for should_contain in query_data["should_contain"]:
            assert should_contain.lower() in response_lower
        
        # Verify high privacy level achieved
        assert response.privacy_level_achieved == PrivacyLevel.RESTRICTED
    
    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_performance_metrics(self, orchestrator, test_queries):
        """Test performance metrics across multiple queries"""
        
        # Process multiple queries and collect metrics
        start_time = datetime.now()
        total_queries = 0
        total_fragments = 0
        total_cost = 0.0
        
        for query_data in test_queries[:3]:  # Test first 3 queries
            request = OrchestrationRequest(
                query=query_data["query"],
                privacy_level=query_data["privacy_level"]
            )
            
            response = await orchestrator.process_query(request)
            
            total_queries += 1
            total_fragments += response.fragments_processed
            total_cost += response.total_cost_estimate
            
            # Verify response time is reasonable (< 10 seconds for test queries)
            assert response.total_processing_time_ms < 10000
        
        end_time = datetime.now()
        total_time = (end_time - start_time).total_seconds()
        
        # Get orchestrator metrics
        metrics = orchestrator.get_metrics()
        
        # Verify metrics
        assert metrics.total_requests >= total_queries
        assert metrics.successful_requests >= total_queries
        assert metrics.success_rate() > 90.0  # At least 90% success rate
        assert metrics.total_cost_usd >= total_cost
        
        # Verify reasonable performance
        assert total_time < 30  # All queries should complete in < 30 seconds
        assert metrics.average_processing_time_ms < 8000  # Average < 8 seconds
        
        print(f"\nPerformance Summary:")
        print(f"Total queries: {total_queries}")
        print(f"Total fragments: {total_fragments}")
        print(f"Total cost: ${total_cost:.4f}")
        print(f"Total time: {total_time:.2f}s")
        print(f"Success rate: {metrics.success_rate():.1f}%")
        print(f"Average processing time: {metrics.average_processing_time_ms:.0f}ms")
    
    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_privacy_preservation_verification(self, orchestrator):
        """Verify that sensitive data is properly isolated and not leaked"""
        
        # Test with various PII types
        sensitive_queries = [
            {
                "query": "My SSN is 123-45-6789 and I need tax advice",
                "sensitive_data": ["123-45-6789"],
                "pii_types": ["US_SSN"]
            },
            {
                "query": "Call me at 555-123-4567 or email test@company.com",
                "sensitive_data": ["555-123-4567", "test@company.com"],
                "pii_types": ["PHONE_NUMBER", "EMAIL"]
            },
            {
                "query": "Here's my credit card: 4111-1111-1111-1111",
                "sensitive_data": ["4111-1111-1111-1111"],
                "pii_types": ["CREDIT_CARD"]
            }
        ]
        
        for test_case in sensitive_queries:
            request = OrchestrationRequest(
                query=test_case["query"],
                privacy_level=PrivacyLevel.RESTRICTED
            )
            
            response = await orchestrator.process_query(request)
            
            # Verify PII was detected
            assert response.detection_report.has_pii
            detected_types = [entity.type.value for entity in response.detection_report.pii_entities]
            
            # Verify expected PII types were found
            for expected_type in test_case["pii_types"]:
                assert any(expected_type in dtype for dtype in detected_types), \
                    f"Expected PII type {expected_type} not detected in: {detected_types}"
            
            # CRITICAL: Verify sensitive data was NOT leaked in final response
            for sensitive_item in test_case["sensitive_data"]:
                assert sensitive_item not in response.aggregated_response, \
                    f"PRIVACY BREACH: Sensitive data '{sensitive_item}' found in response: {response.aggregated_response}"
            
            # Verify response is still meaningful (not empty)
            assert len(response.aggregated_response.strip()) > 20
            
            print(f"✓ Privacy preserved for: {test_case['query'][:50]}...")
    
    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_error_handling_and_resilience(self, orchestrator):
        """Test error handling with edge cases"""
        
        edge_cases = [
            {
                "name": "empty_query",
                "query": "",
                "should_fail": True
            },
            {
                "name": "very_long_query",
                "query": "Explain quantum computing. " * 200,  # Very long query
                "should_fail": False
            },
            {
                "name": "special_characters",
                "query": "What about these symbols: @#$%^&*(){}[]|\\:;\"'<>?,./~`",
                "should_fail": False
            },
            {
                "name": "multilingual",
                "query": "Hello, comment allez-vous? ¿Cómo estás? こんにちは",
                "should_fail": False
            }
        ]
        
        for test_case in edge_cases:
            try:
                request = OrchestrationRequest(
                    query=test_case["query"],
                    privacy_level=PrivacyLevel.INTERNAL
                )
                
                if test_case["should_fail"]:
                    # These should raise exceptions
                    with pytest.raises(Exception):
                        await orchestrator.process_query(request)
                else:
                    # These should succeed
                    response = await orchestrator.process_query(request)
                    assert response.aggregated_response is not None
                    assert len(response.aggregated_response) > 0
                    
                    print(f"✓ Handled edge case: {test_case['name']}")
                    
            except Exception as e:
                if not test_case["should_fail"]:
                    pytest.fail(f"Unexpected failure for {test_case['name']}: {str(e)}")


@pytest.mark.asyncio
@pytest.mark.e2e
async def test_integration_with_multiple_query_types():
    """
    Integration test that processes multiple query types in sequence
    to verify system stability and consistency
    """
    # Skip if no API key
    if not os.getenv("OPENAI_API_KEY"):
        pytest.skip("OPENAI_API_KEY not set")
    
    # This test simulates a real user session with various query types
    query_sequence = [
        "What is machine learning?",
        "My name is Alice Johnson, can you help me understand AI?",
        "Here's some code: def process_data(x): return x * 2",
        "I'm alice@example.com working on a project with sensitive data like SSN 555-44-3333",
        "Can you summarize our conversation so far?"
    ]
    
    # Test implementation would go here
    # This demonstrates the kind of realistic workflow testing we want
    pass


if __name__ == "__main__":
    # Allow running individual tests
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "run":
        asyncio.run(test_integration_with_multiple_query_types())