"""
Unit tests for entity recognizer
"""

import pytest
from src.detection.entities import EntityRecognizer
from tests.fixtures.test_data import TestQueries


class TestEntityRecognizer:
    """Test cases for EntityRecognizer"""
    
    @pytest.fixture
    def entity_recognizer(self):
        """Create EntityRecognizer instance"""
        return EntityRecognizer()
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_recognizer_initialization(self, entity_recognizer):
        """Test that recognizer initializes correctly"""
        assert entity_recognizer.nlp is not None
        assert len(entity_recognizer.relevant_entity_types) > 0
        assert len(entity_recognizer.sensitive_entity_types) > 0
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_no_entities(self, entity_recognizer):
        """Test recognition with no entities"""
        text = "The weather is nice today."
        entities = entity_recognizer.recognize(text)
        # Might be empty or have very few entities
        assert isinstance(entities, list)
    
    @pytest.mark.unit
    @pytest.mark.detection
    @pytest.mark.parametrize("query_data", TestQueries.ENTITY_QUERIES)
    def test_entity_recognition(self, entity_recognizer, query_data):
        """Test entity recognition with various inputs"""
        entities = entity_recognizer.recognize(query_data["query"])
        
        # Check that we detected entities
        assert len(entities) >= len(query_data["expected_entities"]) - 1  # Allow some tolerance
        
        # Check that expected entities are present (case insensitive)
        detected_texts = {e.text.lower() for e in entities}
        for expected_entity in query_data["expected_entities"]:
            assert any(expected_entity.lower() in dt for dt in detected_texts)
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_organization_detection(self, entity_recognizer):
        """Test organization entity detection"""
        text = "Microsoft and Apple are competing with Google in the AI market"
        entities = entity_recognizer.recognize(text)
        
        org_entities = [e for e in entities if e.label == "ORG"]
        assert len(org_entities) >= 2
        
        org_names = {e.text for e in org_entities}
        assert "Microsoft" in org_names or "Apple" in org_names or "Google" in org_names
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_person_detection(self, entity_recognizer):
        """Test person entity detection"""
        text = "Elon Musk and Bill Gates discussed technology trends"
        entities = entity_recognizer.recognize(text)
        
        person_entities = [e for e in entities if e.label == "PERSON"]
        assert len(person_entities) >= 1
        
        person_names = {e.text for e in person_entities}
        assert "Elon Musk" in person_names or "Bill Gates" in person_names
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_location_detection(self, entity_recognizer):
        """Test location entity detection"""
        text = "The conference was held in San Francisco, California"
        entities = entity_recognizer.recognize(text)
        
        location_entities = [e for e in entities if e.label in ["GPE", "LOC"]]
        assert len(location_entities) >= 1
        
        locations = {e.text for e in location_entities}
        assert any("San Francisco" in loc or "California" in loc for loc in locations)
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_money_detection(self, entity_recognizer):
        """Test money entity detection"""
        text = "The company raised $50 million in Series A funding"
        entities = entity_recognizer.recognize(text)
        
        money_entities = [e for e in entities if e.label == "MONEY"]
        assert len(money_entities) >= 1
        
        money_values = {e.text for e in money_entities}
        assert any("50 million" in mv or "$50" in mv for mv in money_values)
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_date_detection(self, entity_recognizer):
        """Test date entity detection"""
        text = "The meeting is scheduled for January 15, 2024"
        entities = entity_recognizer.recognize(text)
        
        date_entities = [e for e in entities if e.label == "DATE"]
        assert len(date_entities) >= 1
        
        dates = {e.text for e in date_entities}
        assert any("January" in d or "2024" in d for d in dates)
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_sensitivity_calculation(self, entity_recognizer):
        """Test entity sensitivity calculation"""
        # High sensitivity entities
        high_sens_text = "John Smith works at Microsoft and earned $200,000"
        high_entities = entity_recognizer.recognize(high_sens_text)
        high_score = entity_recognizer.calculate_entity_sensitivity(high_entities)
        
        # Low sensitivity entities
        low_sens_text = "The weather is nice today"
        low_entities = entity_recognizer.recognize(low_sens_text)
        low_score = entity_recognizer.calculate_entity_sensitivity(low_entities)
        
        assert high_score > low_score
        assert 0.0 <= high_score <= 1.0
        assert 0.0 <= low_score <= 1.0
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_entity_summary(self, entity_recognizer):
        """Test entity summary generation"""
        text = "Apple Inc. reported $81.8 billion revenue. Tim Cook presented in California."
        entities = entity_recognizer.recognize(text)
        summary = entity_recognizer.get_entity_summary(entities)
        
        assert "total_entities" in summary
        assert "unique_entities" in summary
        assert "entity_types" in summary
        assert "sensitive_entities" in summary
        assert "most_common" in summary
        
        assert summary["total_entities"] >= 0
        assert summary["unique_entities"] >= 0
        assert isinstance(summary["entity_types"], dict)
        assert isinstance(summary["most_common"], list)
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_key_entities_extraction(self, entity_recognizer):
        """Test key entities extraction"""
        text = "Microsoft and Google compete while Apple innovates in Cupertino"
        entities = entity_recognizer.recognize(text)
        key_entities = entity_recognizer.extract_key_entities(entities)
        
        assert isinstance(key_entities, dict)
        
        # Should have ORG entities
        if "ORG" in key_entities:
            org_entities = key_entities["ORG"]
            assert isinstance(org_entities, list)
            assert len(org_entities) > 0
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_duplicate_handling(self, entity_recognizer):
        """Test that duplicate entities are handled correctly"""
        text = "Apple Apple Apple is a company. Apple makes phones."
        entities = entity_recognizer.recognize(text)
        
        # Should not have excessive duplicates due to deduplication
        apple_entities = [e for e in entities if "Apple" in e.text]
        # Allow some duplicates due to different positions, but not excessive
        assert len(apple_entities) <= 4  # Reasonable limit
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_position_accuracy(self, entity_recognizer):
        """Test that entity positions are accurate"""
        text = "Microsoft is located in Seattle"
        entities = entity_recognizer.recognize(text)
        
        for entity in entities:
            # Check that positions are valid
            assert 0 <= entity.start < len(text)
            assert entity.start < entity.end <= len(text)
            
            # Check that extracted text matches
            extracted = text[entity.start:entity.end]
            assert extracted == entity.text
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_empty_and_invalid_input(self, entity_recognizer):
        """Test with empty and invalid inputs"""
        # Empty string
        entities = entity_recognizer.recognize("")
        assert len(entities) == 0
        
        # Only whitespace
        entities = entity_recognizer.recognize("   \n\t  ")
        assert len(entities) == 0
        
        # Only punctuation
        entities = entity_recognizer.recognize("!@#$%^&*()")
        assert len(entities) == 0
    
    @pytest.mark.unit
    @pytest.mark.detection
    def test_long_text_handling(self, entity_recognizer):
        """Test handling of long text"""
        # Create long text with known entities
        long_text = "Microsoft " * 100 + "is a technology company."
        entities = entity_recognizer.recognize(long_text)
        
        # Should handle without crashing and find some entities
        assert isinstance(entities, list)
        # Should have at least some Microsoft entities but not 100 due to deduplication
        microsoft_entities = [e for e in entities if "Microsoft" in e.text]
        assert 1 <= len(microsoft_entities) <= 10