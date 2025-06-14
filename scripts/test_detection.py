#!/usr/bin/env python3
"""
Quick test script for the detection engine
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from src.detection.engine import DetectionEngine


async def main():
    """Run detection tests"""
    print("Privacy-Preserving LLM Query Fragmentation - Detection Engine Test")
    print("=" * 60)
    
    engine = DetectionEngine()
    
    test_queries = [
        {
            "name": "Simple Query",
            "query": "What is the weather in Paris today?"
        },
        {
            "name": "PII Query",
            "query": "My name is John Smith, email john@example.com, SSN 123-45-6789"
        },
        {
            "name": "Code Query",
            "query": """
            Can you help me fix this Python code?
            
            def calculate_total(prices):
                total = 0
                for price in prices:
                    total += price
                return total
            """
        },
        {
            "name": "Business Query",
            "query": "Microsoft's Q3 revenue was $52.8B, analyze against Google's $69.7B"
        },
        {
            "name": "Complex Sensitive Query",
            "query": """
            My API key is sk-1234567890abcdef. Here's the SQL to get customer data:
            SELECT name, email, ssn FROM customers WHERE revenue > 1000000;
            This is for our internal Google Cloud project.
            """
        }
    ]
    
    for test in test_queries:
        print(f"\n{'='*60}")
        print(f"Test: {test['name']}")
        print(f"Query: {test['query'][:100]}...")
        print("-" * 60)
        
        try:
            report = await engine.analyze(test['query'])
            
            print(f"✓ Sensitivity Score: {report.sensitivity_score:.2f}")
            print(f"✓ Has PII: {report.has_pii}")
            if report.pii_entities:
                print(f"  - PII Entities: {[f'{e.type.value}: {e.text}' for e in report.pii_entities[:3]]}")
            
            print(f"✓ Has Code: {report.code_detection.has_code}")
            if report.code_detection.has_code:
                print(f"  - Language: {report.code_detection.language}")
                print(f"  - Confidence: {report.code_detection.confidence:.2f}")
            
            print(f"✓ Named Entities: {len(report.named_entities)}")
            if report.named_entities:
                print(f"  - Entities: {[f'{e.label}: {e.text}' for e in report.named_entities[:3]]}")
            
            print(f"✓ Recommended Strategy: {report.recommended_strategy}")
            print(f"✓ Requires Orchestrator: {report.requires_orchestrator}")
            print(f"✓ Processing Time: {report.processing_time:.2f}ms")
            
        except Exception as e:
            print(f"✗ Error: {str(e)}")
    
    print(f"\n{'='*60}")
    print("Detection tests completed!")


if __name__ == "__main__":
    asyncio.run(main())