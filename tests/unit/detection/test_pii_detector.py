"""
Unit tests for PII detector
"""

import pytest
from src.detection.pii import PIIDetector
from src.detection.models import PIIEntityType
from tests.fixtures.test_data import TestQueries


class TestPIIDetector:
    """Test cases for PIIDetector"""
    
    @pytest.fixture
    def pii_detector(self):
        """Create PIIDetector instance"""
        return PIIDetector()
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_detector_initialization(self, pii_detector):
        """Test that detector initializes correctly"""
        assert pii_detector.analyzer is not None
        assert len(pii_detector.entity_type_mapping) > 0
        assert "en" in pii_detector.supported_languages
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_no_pii_detection(self, pii_detector):
        """Test detection with no PII"""
        text = "How do I calculate the area of a circle?"
        entities = pii_detector.detect(text)
        assert len(entities) == 0
    
    @pytest.mark.unit
    @pytest.mark.detection
    @pytest.mark.parametrize("query_data", TestQueries.PII_QUERIES)
    def test_pii_detection(self, pii_detector, query_data):
        """Test PII detection with various inputs"""
        entities = pii_detector.detect(query_data["query"])
        
        # Check that we detected entities
        assert len(entities) >= query_data["expected_count"]
        
        # Check that expected types are present
        detected_types = {e.type.value for e in entities}
        for expected_type in query_data["expected_pii"]:
            assert expected_type in detected_types or any(
                expected_type.lower() in dt.lower() for dt in detected_types
            )
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_email_detection(self, pii_detector):
        """Test specific email detection"""
        text = "Contact me at john.doe@example.com for more info"
        entities = pii_detector.detect(text)
        
        email_entities = [e for e in entities if e.type == PIIEntityType.EMAIL]
        assert len(email_entities) >= 1
        assert "john.doe@example.com" in [e.text for e in email_entities]
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_phone_detection(self, pii_detector):
        """Test phone number detection"""
        text = "Call me at (555) 123-4567"
        entities = pii_detector.detect(text)
        
        phone_entities = [e for e in entities if e.type == PIIEntityType.PHONE]
        assert len(phone_entities) >= 1
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_ssn_detection(self, pii_detector):
        """Test SSN detection"""
        text = "My social security number is 123-45-6789"
        entities = pii_detector.detect(text)
        
        ssn_entities = [e for e in entities if e.type == PIIEntityType.SSN]
        assert len(ssn_entities) >= 1
        assert "123-45-6789" in [e.text for e in ssn_entities]
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_pii_density_calculation(self, pii_detector):
        """Test PII density calculation"""
        text = "john@example.com"  # 16 chars, all PII
        entities = pii_detector.detect(text)
        density = pii_detector.calculate_pii_density(text, entities)
        
        # Density should be close to 1.0 since entire text is PII
        assert density > 0.8
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_entity_summary(self, pii_detector):
        """Test entity summary generation"""
        text = "John Smith's email is john@example.com and phone is (555) 123-4567"
        entities = pii_detector.detect(text)
        summary = pii_detector.get_entity_summary(entities)
        
        assert isinstance(summary, dict)
        assert len(summary) > 0
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_anonymization_positions(self, pii_detector):
        """Test anonymization position calculation"""
        text = "Contact John at john@example.com"
        entities = pii_detector.detect(text)
        positions = pii_detector.anonymize_positions(text, entities)
        
        assert isinstance(positions, list)
        assert len(positions) == len(entities)
        
        for pos in positions:
            assert "start" in pos
            assert "end" in pos
            assert "replacement" in pos
            assert "type" in pos
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_confidence_scores(self, pii_detector):
        """Test that confidence scores are reasonable"""
        text = "My email is definitely.an.email@realdomain.com"
        entities = pii_detector.detect(text)
        
        for entity in entities:
            assert 0.0 <= entity.score <= 1.0
            # Email should have high confidence
            if entity.type == PIIEntityType.EMAIL:
                assert entity.score > 0.7
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_empty_text(self, pii_detector):
        """Test detection with empty text"""
        entities = pii_detector.detect("")
        assert len(entities) == 0
        
        density = pii_detector.calculate_pii_density("", entities)
        assert density == 0.0
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_malformed_input(self, pii_detector):
        """Test detection with unusual input"""
        # Very long text
        long_text = "a" * 10000
        entities = pii_detector.detect(long_text)
        assert isinstance(entities, list)
        
        # Text with special characters
        special_text = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        entities = pii_detector.detect(special_text)
        assert isinstance(entities, list)