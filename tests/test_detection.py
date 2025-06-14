"""
Tests for detection engine
"""

import pytest
import asyncio
from src.detection.engine import DetectionEngine
from src.detection.models import DetectionReport


@pytest.fixture
def detection_engine():
    """Create detection engine instance"""
    return DetectionEngine()


@pytest.mark.asyncio
async def test_simple_query(detection_engine):
    """Test detection on a simple query"""
    query = "What is the weather in Paris?"
    report = await detection_engine.analyze(query)
    
    assert isinstance(report, DetectionReport)
    assert not report.has_pii
    assert not report.code_detection.has_code
    assert report.sensitivity_score < 0.3
    assert report.recommended_strategy == "rule_based"
    assert not report.requires_orchestrator


@pytest.mark.asyncio
async def test_pii_detection(detection_engine):
    """Test PII detection"""
    query = "My name is John Smith and my email is john@example.com"
    report = await detection_engine.analyze(query)
    
    assert report.has_pii
    assert len(report.pii_entities) >= 2  # Name and email
    assert report.sensitivity_score > 0.3
    assert any(e.type.value == "PERSON" for e in report.pii_entities)
    assert any(e.type.value == "EMAIL" for e in report.pii_entities)


@pytest.mark.asyncio
async def test_code_detection(detection_engine):
    """Test code detection"""
    query = """
    Can you help me fix this Python code?
    
    def calculate_sum(numbers):
        total = 0
        for num in numbers:
            total += num
        return total
    """
    report = await detection_engine.analyze(query)
    
    assert report.code_detection.has_code
    assert report.code_detection.language == "python"
    assert report.code_detection.confidence > 0.5
    assert len(report.code_detection.code_blocks) > 0


@pytest.mark.asyncio
async def test_entity_recognition(detection_engine):
    """Test entity recognition"""
    query = "Microsoft announced a partnership with OpenAI in Seattle"
    report = await detection_engine.analyze(query)
    
    assert len(report.named_entities) >= 3
    entity_texts = [e.text for e in report.named_entities]
    assert "Microsoft" in entity_texts
    assert "OpenAI" in entity_texts
    assert "Seattle" in entity_texts


@pytest.mark.asyncio
async def test_complex_sensitive_query(detection_engine):
    """Test complex query with multiple sensitive elements"""
    query = """
    My SSN is 123-45-6789 and I work at Google. 
    Here's the SQL query to get customer data:
    SELECT * FROM customers WHERE revenue > 1000000
    """
    report = await detection_engine.analyze(query)
    
    assert report.has_pii
    assert report.code_detection.has_code
    assert len(report.named_entities) > 0
    assert report.sensitivity_score > 0.7
    assert report.requires_orchestrator
    assert report.recommended_strategy in ["semantic", "hybrid"]


@pytest.mark.asyncio
async def test_processing_time(detection_engine):
    """Test that detection completes within target time"""
    query = "What are the latest developments in artificial intelligence?"
    report = await detection_engine.analyze(query)
    
    # Should complete in under 100ms for simple queries
    assert report.processing_time < 100


def test_sensitivity_calculation():
    """Test sensitivity factor calculation"""
    from src.detection.models import SensitivityFactors
    
    factors = SensitivityFactors(
        pii_factor=0.8,
        code_factor=0.6,
        entity_factor=0.4,
        keyword_factor=0.2
    )
    
    # Weighted calculation: PII(0.35) + Code(0.25) + Entity(0.15) + Keyword(0.25)
    expected = (0.8 * 0.35) + (0.6 * 0.25) + (0.4 * 0.15) + (0.2 * 0.25)
    assert abs(factors.calculate_overall() - expected) < 0.01


if __name__ == "__main__":
    # Run a simple test
    async def main():
        engine = DetectionEngine()
        
        test_queries = [
            "What is the weather today?",
            "My email is test@example.com",
            "def hello(): print('Hello World')",
            "Microsoft and Google are competing in AI"
        ]
        
        for query in test_queries:
            print(f"\nAnalyzing: {query[:50]}...")
            report = await engine.analyze(query)
            print(f"  Sensitivity: {report.sensitivity_score:.2f}")
            print(f"  Has PII: {report.has_pii}")
            print(f"  Has Code: {report.code_detection.has_code}")
            print(f"  Entities: {len(report.named_entities)}")
            print(f"  Strategy: {report.recommended_strategy}")
            print(f"  Needs Orchestrator: {report.requires_orchestrator}")
    
    asyncio.run(main())