"""
Unit tests for query fragmentation functionality
"""

import pytest
from unittest.mock import Mock, patch
from src.fragmentation.fragmenter import QueryFragmenter, FragmentationStrategy
from src.fragmentation.models import QueryFragment, FragmentationResult
from src.detection.models import DetectionReport, PIIEntity, CodeDetection, NamedEntity, PIIEntityType


class TestQueryFragmenter:
    """Test suite for QueryFragmenter class"""
    
    @pytest.fixture
    def fragmenter(self):
        """Create a QueryFragmenter instance for testing"""
        return QueryFragmenter()
    
    @pytest.fixture
    def sample_detection_report(self):
        """Create a sample detection report for testing"""
        return DetectionReport(
            has_pii=True,
            pii_entities=[
                PIIEntity(
                    text="John Doe",
                    type=PIIEntityType.PERSON,
                    start=10,
                    end=18,
                    score=0.9
                ),
                PIIEntity(
                    text="john@example.com",
                    type=PIIEntityType.EMAIL,
                    start=25,
                    end=41,
                    score=0.95
                )
            ],
            pii_density=0.3,
            code_detection=CodeDetection(
                has_code=False,
                language=None,
                confidence=0.0,
                code_blocks=[]
            ),
            named_entities=[
                NamedEntity(
                    text="John Doe",
                    label="PERSON",
                    start=10,
                    end=18
                )
            ],
            sensitivity_score=0.8,
            processing_time=50.0,
            analyzers_used=["presidio", "spacy"],
            recommended_strategy="pii_isolation",
            requires_orchestrator=False
        )
    
    def test_fragmenter_initialization(self, fragmenter):
        """Test that fragmenter initializes correctly"""
        assert fragmenter is not None
        assert hasattr(fragmenter, 'strategies')
        assert len(fragmenter.strategies) > 0
    
    def test_fragment_query_with_no_sensitive_data(self, fragmenter):
        """Test fragmenting a query with no sensitive data"""
        query = "What is the weather like today?"
        
        # Mock detection to show no sensitive data
        mock_detection = DetectionReport(
            has_pii=False,
            pii_entities=[],
            pii_density=0.0,
            code_detection=CodeDetection(has_code=False, language=None, confidence=0.0, code_blocks=[]),
            named_entities=[],
            sensitivity_score=0.0,
            processing_time=10.0,
            analyzers_used=["presidio", "spacy"],
            recommended_strategy=None,
            requires_orchestrator=False
        )
        
        with patch('src.detection.engine.DetectionEngine.detect', return_value=mock_detection):
            result = fragmenter.fragment_query(query)
        
        assert isinstance(result, FragmentationResult)
        assert result.original_query == query
        assert result.strategy_used == "none"  # No fragmentation needed
        assert len(result.fragments) == 1
        assert result.fragments[0].content == query
        assert not result.fragments[0].contains_sensitive_data
    
    def test_fragment_query_with_pii(self, fragmenter, sample_detection_report):
        """Test fragmenting a query with PII data"""
        query = "Hello, my name is John Doe and email is john@example.com"
        
        with patch('src.detection.engine.DetectionEngine.detect', return_value=sample_detection_report):
            result = fragmenter.fragment_query(query)
        
        assert isinstance(result, FragmentationResult)
        assert result.original_query == query
        assert result.strategy_used in ["pii_isolation", "semantic_split", "maximum_isolation"]
        assert len(result.fragments) >= 1  # Should have at least 1 fragment
        
        # Verify PII was handled (either anonymized or isolated)
        all_content = " ".join([f.content for f in result.fragments])
        
        # Check if PII was anonymized (replaced with placeholders)
        pii_anonymized = "PERSON" in all_content or "EMAIL" in all_content
        
        # Check if fragments were created
        multiple_fragments = len(result.fragments) >= 2
        
        # Either PII should be anonymized OR multiple fragments created
        assert pii_anonymized or multiple_fragments, "PII should be either anonymized or isolated in fragments"
    
    def test_fragment_query_with_code(self, fragmenter):
        """Test fragmenting a query containing code"""
        query = """
        Here's my Python function:
        
        def hello_world():
            print("Hello, World!")
            return True
        
        Can you optimize this?
        """
        
        # Mock detection to show code
        mock_detection = DetectionReport(
            has_pii=False,
            pii_entities=[],
            pii_density=0.0,
            code_detection=CodeDetection(
                has_code=True,
                language="python",
                confidence=0.9,
                code_blocks=[{
                    "content": "def hello_world():\n    print(\"Hello, World!\")\n    return True",
                    "language": "python",
                    "confidence": 0.9,
                    "start": 35,
                    "end": 95
                }]
            ),
            named_entities=[],
            sensitivity_score=0.6,
            processing_time=30.0,
            analyzers_used=["presidio", "guesslang", "spacy"],
            recommended_strategy="code_isolation",
            requires_orchestrator=False
        )
        
        with patch('src.detection.engine.DetectionEngine.detect', return_value=mock_detection):
            result = fragmenter.fragment_query(query)
        
        assert isinstance(result, FragmentationResult)
        assert result.strategy_used == "code_isolation"
        # Should have at least 1 fragment (code may not be split if positions aren't found)
        assert len(result.fragments) >= 1
        
        # Check that code is properly isolated
        code_fragments = [f for f in result.fragments if f.fragment_type.value == "code"]
        text_fragments = [f for f in result.fragments if f.fragment_type.value == "general"]
        
        assert len(code_fragments) >= 1
        assert len(text_fragments) >= 1
    
    def test_fragment_query_high_sensitivity(self, fragmenter):
        """Test fragmenting a query with high sensitivity score"""
        query = "Process this confidential patient data: John Doe, DOB: 1985-01-01, SSN: 123-45-6789"
        
        # Mock high sensitivity detection
        mock_detection = DetectionReport(
            has_pii=True,
            pii_entities=[
                PIIEntity(
                    text="John Doe",
                    type=PIIEntityType.PERSON,
                    start=42,
                    end=50,
                    score=0.9
                ),
                PIIEntity(
                    text="1985-01-01",
                    type=PIIEntityType.DATE_TIME,
                    start=57,
                    end=67,
                    score=0.9
                ),
                PIIEntity(
                    text="123-45-6789",
                    type=PIIEntityType.SSN,
                    start=74,
                    end=85,
                    score=0.95
                )
            ],
            pii_density=0.4,
            code_detection=CodeDetection(has_code=False, language=None, confidence=0.0, code_blocks=[]),
            named_entities=[
                NamedEntity(
                    text="John Doe",
                    label="PERSON",
                    start=42,
                    end=50
                )
            ],
            sensitivity_score=0.95,
            processing_time=80.0,
            analyzers_used=["presidio", "spacy"],
            recommended_strategy="maximum_isolation",
            requires_orchestrator=True
        )
        
        with patch('src.detection.engine.DetectionEngine.detect', return_value=mock_detection):
            result = fragmenter.fragment_query(query)
        
        assert isinstance(result, FragmentationResult)
        assert result.strategy_used == "maximum_isolation"
        # Maximum isolation should create at least 1 fragment
        assert len(result.fragments) >= 1
        
        # Verify PII was anonymized
        full_text = " ".join([f.content for f in result.fragments])
        assert "John Doe" not in full_text  # Should be replaced
        assert "123-45-6789" not in full_text  # SSN should be replaced
        assert "1985-01-01" not in full_text  # DOB should be replaced
        
        # Verify anonymization placeholders exist
        assert "PERSON" in full_text or "SSN" in full_text or "DATE" in full_text
    
    def test_get_fragmentation_strategy(self, fragmenter, sample_detection_report):
        """Test strategy selection logic"""
        # Test high sensitivity
        high_sensitivity = DetectionReport(
            has_pii=True,
            pii_entities=[],
            pii_density=0.3,
            code_detection=CodeDetection(has_code=False, language=None, confidence=0.0, code_blocks=[]),
            named_entities=[],
            sensitivity_score=0.9,
            processing_time=50.0,
            analyzers_used=["presidio"],
            recommended_strategy=None,
            requires_orchestrator=False
        )
        strategy = fragmenter._get_fragmentation_strategy(high_sensitivity)
        assert strategy == FragmentationStrategy.MAXIMUM_ISOLATION
        
        # Test code detection
        code_detection_report = DetectionReport(
            has_pii=False,
            pii_entities=[],
            pii_density=0.0,
            code_detection=CodeDetection(has_code=True, language="python", confidence=0.9, code_blocks=[]),
            named_entities=[],
            sensitivity_score=0.5,
            processing_time=30.0,
            analyzers_used=["guesslang"],
            recommended_strategy=None,
            requires_orchestrator=False
        )
        strategy = fragmenter._get_fragmentation_strategy(code_detection_report)
        assert strategy == FragmentationStrategy.CODE_ISOLATION
        
        # Test PII only
        pii_detection_report = DetectionReport(
            has_pii=True,
            pii_entities=[PIIEntity(text="test", type=PIIEntityType.EMAIL, start=0, end=4, score=0.9)],
            pii_density=0.2,
            code_detection=CodeDetection(has_code=False, language=None, confidence=0.0, code_blocks=[]),
            named_entities=[],
            sensitivity_score=0.6,
            processing_time=40.0,
            analyzers_used=["presidio"],
            recommended_strategy=None,
            requires_orchestrator=False
        )
        strategy = fragmenter._get_fragmentation_strategy(pii_detection_report)
        assert strategy == FragmentationStrategy.PII_ISOLATION
    
    def test_create_fragment(self, fragmenter):
        """Test fragment creation"""
        from src.fragmentation.models import FragmentationType
        
        content = "Test fragment content"
        fragment_type = FragmentationType.GENERAL
        sensitive = True
        provider_hint = "claude"
        
        fragment = fragmenter._create_fragment(
            content=content,
            fragment_type=fragment_type,
            contains_sensitive_data=sensitive,
            provider_hint=provider_hint
        )
        
        assert isinstance(fragment, QueryFragment)
        assert fragment.content == content
        assert fragment.fragment_type == fragment_type
        assert fragment.contains_sensitive_data == sensitive
        assert fragment.provider_hint == provider_hint
        assert fragment.fragment_id is not None
    
    def test_empty_query_handling(self, fragmenter):
        """Test handling of empty queries"""
        with pytest.raises(ValueError, match="Query cannot be empty"):
            fragmenter.fragment_query("")
        
        with pytest.raises(ValueError, match="Query cannot be empty"):
            fragmenter.fragment_query("   ")  # Only whitespace
    
    def test_very_long_query_handling(self, fragmenter):
        """Test handling of very long queries"""
        # Create a very long query (over 10k characters)
        long_query = "This is a test query. " * 500  # ~11k characters
        
        # Mock detection
        mock_detection = DetectionReport(
            has_pii=False,
            pii_entities=[],
            pii_density=0.0,
            code_detection=CodeDetection(has_code=False, language=None, confidence=0.0, code_blocks=[]),
            named_entities=[],
            sensitivity_score=0.0,
            processing_time=10.0,
            analyzers_used=["presidio", "spacy"],
            recommended_strategy=None,
            requires_orchestrator=False
        )
        
        with patch('src.detection.engine.DetectionEngine.detect', return_value=mock_detection):
            result = fragmenter.fragment_query(long_query)
        
        # Should use length-based fragmentation
        assert result.strategy_used == "length_based"
        assert len(result.fragments) > 1  # Should be split into multiple fragments
        
        # Check that total content is approximately preserved (allow small loss due to word boundaries)
        total_content = "".join(f.content for f in result.fragments)
        assert len(total_content) >= len(long_query.strip()) * 0.99  # Allow 1% loss


class TestFragmentationStrategies:
    """Test fragmentation strategy enumeration"""
    
    def test_fragmentation_strategy_values(self):
        """Test that all expected strategies are defined"""
        expected_strategies = [
            "NONE",
            "PII_ISOLATION", 
            "CODE_ISOLATION",
            "SEMANTIC_SPLIT",
            "MAXIMUM_ISOLATION",
            "LENGTH_BASED"
        ]
        
        for strategy in expected_strategies:
            assert hasattr(FragmentationStrategy, strategy)
    
    def test_strategy_string_conversion(self):
        """Test strategy enum string conversion"""
        assert str(FragmentationStrategy.NONE) == "none"
        assert str(FragmentationStrategy.PII_ISOLATION) == "pii_isolation"
        assert str(FragmentationStrategy.CODE_ISOLATION) == "code_isolation"