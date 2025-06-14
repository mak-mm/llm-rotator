"""
Test data and fixtures for the Privacy LLM system
"""

from typing import Dict, List, Any
import pytest


class TestQueries:
    """Test query data organized by complexity and type"""
    
    # Simple queries with low sensitivity
    SIMPLE = [
        "What is the weather in Paris?",
        "How do I cook pasta?",
        "What is 2 + 2?",
        "Tell me about machine learning",
        "What are the benefits of exercise?"
    ]
    
    # Queries with PII
    PII_QUERIES = [
        {
            "query": "My name is John Smith and my email is john@example.com",
            "expected_pii": ["PERSON", "EMAIL"],
            "expected_count": 2
        },
        {
            "query": "My SSN is 123-45-6789 and I live at 123 Main St, New York",
            "expected_pii": ["US_SSN", "LOCATION"],
            "expected_count": 2
        },
        {
            "query": "Call me at (555) 123-4567 or email alice.doe@company.com",
            "expected_pii": ["PHONE_NUMBER", "EMAIL"],
            "expected_count": 2
        },
        {
            "query": "My credit card number is 4532-1234-5678-9012",
            "expected_pii": ["CREDIT_CARD"],
            "expected_count": 1
        }
    ]
    
    # Queries with code
    CODE_QUERIES = [
        {
            "query": """
            Can you help me fix this Python code?
            
            def calculate_sum(numbers):
                total = 0
                for num in numbers:
                    total += num
                return total
            """,
            "expected_language": "python",
            "expected_confidence": 0.8
        },
        {
            "query": """
            Here's my JavaScript function:
            
            function fetchData() {
                return fetch('/api/data')
                    .then(response => response.json())
                    .catch(error => console.error(error));
            }
            """,
            "expected_language": "javascript",
            "expected_confidence": 0.7
        },
        {
            "query": """
            This SQL query is slow:
            
            SELECT customers.name, orders.total 
            FROM customers 
            JOIN orders ON customers.id = orders.customer_id 
            WHERE orders.date > '2023-01-01'
            """,
            "expected_language": "sql",
            "expected_confidence": 0.85
        }
    ]
    
    # Queries with named entities
    ENTITY_QUERIES = [
        {
            "query": "Microsoft announced a partnership with OpenAI in Seattle",
            "expected_entities": ["Microsoft", "OpenAI", "Seattle"],
            "expected_types": ["ORG", "ORG", "GPE"]
        },
        {
            "query": "Apple's revenue for Q3 2023 was $81.8 billion",
            "expected_entities": ["Apple", "Q3 2023", "$81.8 billion"],
            "expected_types": ["ORG", "DATE", "MONEY"]
        },
        {
            "query": "Elon Musk visited Tesla's factory in Austin, Texas",
            "expected_entities": ["Elon Musk", "Tesla", "Austin", "Texas"],
            "expected_types": ["PERSON", "ORG", "GPE", "GPE"]
        }
    ]
    
    # Complex queries combining multiple elements
    COMPLEX_QUERIES = [
        {
            "query": """
            My API key is sk-1234567890abcdef. Here's the SQL query for our Google Cloud project:
            
            SELECT customer_name, email, revenue 
            FROM customers 
            WHERE revenue > 1000000
            AND created_date > '2023-01-01'
            
            This should help us analyze our top clients for Microsoft partnership discussions.
            """,
            "expected_sensitivity": 0.8,
            "expected_strategy": "semantic",
            "expected_orchestrator": True,
            "has_pii": False,  # API key might not be detected as traditional PII
            "has_code": True,
            "has_entities": True
        },
        {
            "query": """
            Hi, I'm Dr. Sarah Johnson (sarah.johnson@hospital.com). 
            Patient John Doe (SSN: 123-45-6789) needs this Python script to analyze his medical data:
            
            import pandas as pd
            
            def analyze_patient_data(patient_id):
                query = f"SELECT * FROM medical_records WHERE patient_id = {patient_id}"
                # This is vulnerable to SQL injection!
                return execute_query(query)
            
            The patient is at St. Mary's Hospital in Chicago.
            """,
            "expected_sensitivity": 0.9,
            "expected_strategy": "semantic",
            "expected_orchestrator": True,
            "has_pii": True,
            "has_code": True,
            "has_entities": True
        }
    ]


class ExpectedResults:
    """Expected results for various test scenarios"""
    
    @staticmethod
    def get_detection_thresholds() -> Dict[str, float]:
        """Performance thresholds for detection"""
        return {
            "max_processing_time_ms": 100,
            "min_pii_confidence": 0.5,
            "min_code_confidence": 0.5,
            "sensitivity_low_threshold": 0.3,
            "sensitivity_high_threshold": 0.7
        }
    
    @staticmethod
    def get_strategy_mapping() -> Dict[float, str]:
        """Expected strategy based on sensitivity score"""
        return {
            0.0: "rule_based",
            0.2: "rule_based", 
            0.4: "syntactic",
            0.6: "semantic",
            0.8: "semantic",
            1.0: "semantic"
        }


@pytest.fixture
def simple_queries():
    """Fixture for simple test queries"""
    return TestQueries.SIMPLE


@pytest.fixture
def pii_queries():
    """Fixture for PII test queries"""
    return TestQueries.PII_QUERIES


@pytest.fixture
def code_queries():
    """Fixture for code test queries"""
    return TestQueries.CODE_QUERIES


@pytest.fixture
def entity_queries():
    """Fixture for entity test queries"""
    return TestQueries.ENTITY_QUERIES


@pytest.fixture
def complex_queries():
    """Fixture for complex test queries"""
    return TestQueries.COMPLEX_QUERIES


@pytest.fixture
def detection_thresholds():
    """Fixture for detection performance thresholds"""
    return ExpectedResults.get_detection_thresholds()


@pytest.fixture
def strategy_mapping():
    """Fixture for strategy mapping"""
    return ExpectedResults.get_strategy_mapping()


@pytest.fixture
def mock_api_responses():
    """Mock responses for LLM providers"""
    return {
        "openai": {
            "choices": [
                {
                    "message": {
                        "content": "This is a mock OpenAI response for testing."
                    }
                }
            ],
            "usage": {
                "total_tokens": 25
            }
        },
        "anthropic": {
            "content": [
                {
                    "text": "This is a mock Anthropic response for testing."
                }
            ],
            "usage": {
                "input_tokens": 15,
                "output_tokens": 10
            }
        },
        "google": {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": "This is a mock Google response for testing."
                            }
                        ]
                    }
                }
            ],
            "usage_metadata": {
                "total_token_count": 20
            }
        }
    }