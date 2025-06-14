"""
Unit tests for the unified detection engine
"""

import pytest
from src.detection.engine import DetectionEngine
from src.detection.models import DetectionReport
from tests.fixtures.test_data import TestQueries


class TestDetectionEngine:
    """Test cases for DetectionEngine"""
    
    @pytest.fixture
    def detection_engine(self):
        """Create DetectionEngine instance"""
        return DetectionEngine()
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_engine_initialization(self, detection_engine):
        """Test that engine initializes correctly"""
        assert detection_engine.pii_detector is not None
        assert detection_engine.code_detector is not None
        assert detection_engine.entity_recognizer is not None
        assert detection_engine.executor is not None
        assert len(detection_engine.sensitive_keywords) > 0
    
    @pytest.mark.unit
    @pytest.mark.detection
    async def test_simple_query_analysis(self, detection_engine):
        """Test analysis of simple, non-sensitive query"""
        query = "What is the weather in Paris?"
        report = await detection_engine.analyze(query)
        
        assert isinstance(report, DetectionReport)
        assert not report.has_pii
        assert not report.code_detection.has_code
        assert report.sensitivity_score < 0.3
        assert report.recommended_strategy == "rule_based"
        assert not report.requires_orchestrator
        assert report.processing_time > 0
        assert "presidio" in report.analyzers_used
        assert "guesslang" in report.analyzers_used
        assert "spacy" in report.analyzers_used
    
    @pytest.mark.unit
    @pytest.mark.detection
    async def test_pii_query_analysis(self, detection_engine):
        """Test analysis of query with PII"""
        query = "My name is John Smith and my email is john@example.com"
        report = await detection_engine.analyze(query)
        
        assert report.has_pii
        assert len(report.pii_entities) >= 2
        assert report.sensitivity_score > 0.3
        assert report.pii_density > 0
        
        # Should recommend more sophisticated strategy
        assert report.recommended_strategy in ["syntactic", "semantic", "hybrid"]
    
    @pytest.mark.unit
    @pytest.mark.detection
    async def test_code_query_analysis(self, detection_engine):
        """Test analysis of query with code"""
        query = """
        def hello():
            print("Hello, World!")
            return True
        """
        report = await detection_engine.analyze(query)
        
        assert report.code_detection.has_code
        assert report.code_detection.language == "python"
        assert report.code_detection.confidence > 0.5
        assert len(report.code_detection.code_blocks) > 0
        
        # Code should influence strategy
        assert report.recommended_strategy in ["syntactic", "hybrid"]
    
    @pytest.mark.unit
    @pytest.mark.detection
    async def test_entity_query_analysis(self, detection_engine):
        """Test analysis of query with named entities"""
        query = "Microsoft announced a partnership with OpenAI in Seattle"
        report = await detection_engine.analyze(query)
        
        assert len(report.named_entities) >= 3
        entity_texts = [e.text for e in report.named_entities]
        assert "Microsoft" in entity_texts
        assert "OpenAI" in entity_texts
        assert "Seattle" in entity_texts
        
        # Entities should influence sensitivity
        assert report.sensitivity_score > 0.1
    
    @pytest.mark.unit
    @pytest.mark.detection
    @pytest.mark.parametrize("query_data", TestQueries.COMPLEX_QUERIES)
    async def test_complex_query_analysis(self, detection_engine, query_data):
        """Test analysis of complex queries"""
        report = await detection_engine.analyze(query_data["query"])
        
        assert report.sensitivity_score >= query_data["expected_sensitivity"] - 0.2  # Allow tolerance
        assert report.recommended_strategy == query_data["expected_strategy"]
        assert report.requires_orchestrator == query_data["expected_orchestrator"]
        assert report.has_pii == query_data["has_pii"]
        assert report.code_detection.has_code == query_data["has_code"]
        assert (len(report.named_entities) > 0) == query_data["has_entities"]
    
    @pytest.mark.unit
    @pytest.mark.detection
    async def test_performance_requirements(self, detection_engine, detection_thresholds):
        """Test that detection meets performance requirements"""
        query = "Analyze our revenue data for Microsoft and Google partnerships"
        report = await detection_engine.analyze(query)
        
        # Should complete within threshold
        assert report.processing_time <= detection_thresholds["max_processing_time_ms"]
    
    @pytest.mark.unit
    @pytest.mark.detection
    async def test_sensitivity_factor_calculation(self, detection_engine):
        """Test sensitivity factor calculation"""
        # Query with multiple sensitivity factors
        query = """
        My confidential API key is sk-1234567890abcdef.
        Here's the proprietary Python code for our internal Google project:
        
        import secret_module
        
        def process_sensitive_data():
            password = "secret123"
            return database.get_customer_data()
        """
        
        report = await detection_engine.analyze(query)
        
        # Should have high sensitivity due to:
        # - Keywords (confidential, proprietary, secret, password)
        # - Code detection
        # - Entity (Google)
        assert report.sensitivity_score > 0.6
        assert report.requires_orchestrator
    
    @pytest.mark.unit
    @pytest.mark.detection
    async def test_strategy_determination(self, detection_engine):
        """Test strategy determination logic"""
        test_cases = [
            {
                "query": "What is 2 + 2?",
                "expected_strategy": "rule_based",
                "expected_orchestrator": False
            },
            {
                "query": "def add(a, b): return a + b",
                "expected_strategy": "syntactic",
                "expected_orchestrator": False
            },
            {
                "query": "My SSN is 123-45-6789. Can you help with this SQL: SELECT * FROM users",
                "expected_strategy": "hybrid",
                "expected_orchestrator": True
            },
            {
                "query": "Confidential: Our secret revenue numbers for Google partnership",
                "expected_strategy": "semantic",
                "expected_orchestrator": True
            }
        ]
        
        for case in test_cases:
            report = await detection_engine.analyze(case["query"])
            assert report.recommended_strategy == case["expected_strategy"]
            assert report.requires_orchestrator == case["expected_orchestrator"]
    
    @pytest.mark.unit
    @pytest.mark.detection
    async def test_keyword_sensitivity(self, detection_engine):
        """Test keyword-based sensitivity detection"""
        sensitive_query = "This is confidential proprietary secret internal password data"
        normal_query = "This is public information about the weather"
        
        sensitive_report = await detection_engine.analyze(sensitive_query)
        normal_report = await detection_engine.analyze(normal_query)
        
        assert sensitive_report.sensitivity_score > normal_report.sensitivity_score
    
    @pytest.mark.unit
    @pytest.mark.detection
    async def test_parallel_processing(self, detection_engine):
        """Test that parallel processing works correctly"""
        query = "Microsoft's confidential def calculate(): pass project in Seattle"
        
        # This query should trigger all three detectors
        report = await detection_engine.analyze(query)
        
        # All analyzers should have run
        assert "presidio" in report.analyzers_used
        assert "guesslang" in report.analyzers_used
        assert "spacy" in report.analyzers_used
        
        # Should detect code, entities, and possibly PII
        assert report.code_detection.has_code
        assert len(report.named_entities) > 0
    
    @pytest.mark.unit
    @pytest.mark.detection
    async def test_edge_cases(self, detection_engine):
        """Test edge cases and error handling"""
        # Empty query
        report = await detection_engine.analyze("")
        assert isinstance(report, DetectionReport)
        assert not report.has_pii
        assert not report.code_detection.has_code
        assert len(report.named_entities) == 0
        
        # Very long query
        long_query = "Microsoft " * 1000
        report = await detection_engine.analyze(long_query)
        assert isinstance(report, DetectionReport)
        
        # Query with special characters
        special_query = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        report = await detection_engine.analyze(special_query)
        assert isinstance(report, DetectionReport)
    
    @pytest.mark.unit
    @pytest.mark.detection
    async def test_consistency(self, detection_engine):
        """Test that repeated analysis gives consistent results"""
        query = "Microsoft's revenue was $50 billion in Q3"
        
        # Run analysis multiple times
        reports = []
        for _ in range(3):
            report = await detection_engine.analyze(query)
            reports.append(report)
        
        # Results should be consistent
        for i in range(1, len(reports)):
            assert reports[i].has_pii == reports[0].has_pii
            assert reports[i].code_detection.has_code == reports[0].code_detection.has_code
            assert abs(reports[i].sensitivity_score - reports[0].sensitivity_score) < 0.1
            assert reports[i].recommended_strategy == reports[0].recommended_strategy
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_cleanup(self, detection_engine):
        """Test that cleanup works properly"""
        # Engine should clean up thread pool
        assert detection_engine.executor is not None
        
        # Trigger cleanup
        del detection_engine
        
        # Should not raise any errors