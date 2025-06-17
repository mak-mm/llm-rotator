#!/usr/bin/env python3
"""
Scientific Testing of Enhanced Privacy-Preserving Query Fragmentation System
"""

import json
import requests
import time
import statistics
from typing import Dict, List, Any
from dataclasses import dataclass
from datetime import datetime

@dataclass
class TestResult:
    query: str
    request_id: str
    privacy_score: float
    processing_time: float
    fragment_count: int
    providers_used: List[str]
    pii_detected: bool
    code_detected: bool
    response_length: int
    response_quality_score: float
    cost_fragmented: float
    cost_single: float
    savings_percentage: float

class PrivacyLLMTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results: List[TestResult] = []
        
    def test_query(self, query: str) -> TestResult:
        """Test a single query and collect metrics"""
        
        url = f"{self.base_url}/api/v1/analyze"
        payload = {"query": query}
        
        start_time = time.time()
        try:
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()
            actual_time = time.time() - start_time
            
            # Extract providers used
            providers_used = list({frag["provider"] for frag in data["fragments"]})
            
            # Calculate basic response quality score
            response_text = data["aggregated_response"]
            quality_score = self._calculate_quality_score(response_text, query)
            
            result = TestResult(
                query=query,
                request_id=data["request_id"],
                privacy_score=data["privacy_score"],
                processing_time=data["total_time"],
                fragment_count=len(data["fragments"]),
                providers_used=providers_used,
                pii_detected=data["detection"]["has_pii"],
                code_detected=data["detection"]["has_code"],
                response_length=len(response_text),
                response_quality_score=quality_score,
                cost_fragmented=data["cost_comparison"]["fragmented_cost"],
                cost_single=data["cost_comparison"]["single_provider_cost"],
                savings_percentage=data["cost_comparison"]["savings_percentage"]
            )
            
            self.results.append(result)
            return result
            
        except Exception as e:
            print(f"❌ Error testing query: {str(e)}")
            return None
    
    def _calculate_quality_score(self, response: str, query: str) -> float:
        """Calculate a basic quality score for the response"""
        
        score = 0.5  # Base score
        
        # Length appropriateness (50-1000 chars is good)
        if 50 <= len(response) <= 1000:
            score += 0.2
        elif 20 <= len(response) <= 2000:
            score += 0.1
        
        # Contains useful information (not error messages)
        error_patterns = ["sorry", "can't assist", "don't understand", "please clarify"]
        if not any(pattern in response.lower() for pattern in error_patterns):
            score += 0.2
        else:
            score -= 0.2
        
        # Proper sentence structure
        if response.count('.') >= 1 and response[0].isupper():
            score += 0.1
        
        # Relevance to query (basic keyword matching)
        query_words = set(query.lower().split())
        response_words = set(response.lower().split())
        overlap = len(query_words.intersection(response_words))
        relevance = overlap / len(query_words) if query_words else 0
        score += relevance * 0.2
        
        return min(max(score, 0.0), 1.0)
    
    def run_test_suite(self) -> None:
        """Run comprehensive test suite following scientific methodology"""
        
        print("🧪 SCIENTIFIC TESTING: Enhanced Privacy-Preserving LLM System")
        print("=" * 70)
        print(f"📅 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Test Dataset A1: PII Complexity Gradient
        print("📊 DATASET A1: PII Complexity Gradient")
        print("-" * 40)
        
        low_pii_queries = [
            "What is machine learning?",
            "How do I cook pasta?", 
            "Explain quantum computing basics"
        ]
        
        medium_pii_queries = [
            "My company is TechCorp. What are privacy laws?",
            "I work in healthcare. GDPR compliance help?",
            "Location: San Francisco. Best restaurants?"
        ]
        
        high_pii_queries = [
            "My name is John Doe, email john@company.com. Credit report help?",
            "SSN: 123-45-6789, DOB: 1985-03-15. Insurance options?",
            "Address: 123 Main St, NYC. Medical records privacy?"
        ]
        
        # Run tests
        print("🔹 Testing Low PII Queries...")
        for query in low_pii_queries:
            result = self.test_query(query)
            if result:
                print(f"   ✅ Privacy: {result.privacy_score:.3f} | Time: {result.processing_time:.2f}s | Fragments: {result.fragment_count}")
        
        print("\n🔸 Testing Medium PII Queries...")
        for query in medium_pii_queries:
            result = self.test_query(query)
            if result:
                print(f"   ✅ Privacy: {result.privacy_score:.3f} | Time: {result.processing_time:.2f}s | Fragments: {result.fragment_count}")
        
        print("\n🔺 Testing High PII Queries...")
        for query in high_pii_queries:
            result = self.test_query(query)
            if result:
                print(f"   ✅ Privacy: {result.privacy_score:.3f} | Time: {result.processing_time:.2f}s | Fragments: {result.fragment_count}")
        
        # Test Dataset A2: Code Detection Scenarios
        print("\n\n📊 DATASET A2: Code Detection Scenarios")
        print("-" * 40)
        
        code_queries = [
            "Review this function: def hello(): return 'world'",
            "Fix this SQL: SELECT * FROM users WHERE id = 1",
            "Audit this auth: def authenticate(user, pwd): return user == 'admin' and pwd == 'secret'"
        ]
        
        print("💻 Testing Code Queries...")
        for query in code_queries:
            result = self.test_query(query)
            if result:
                print(f"   ✅ Code: {result.code_detected} | Privacy: {result.privacy_score:.3f} | Quality: {result.response_quality_score:.3f}")
        
        # Test Dataset A3: Mixed Complexity
        print("\n\n📊 DATASET A3: Mixed Complexity Scenarios") 
        print("-" * 40)
        
        mixed_queries = [
            "John Smith from ACME Corp (john@acme.com) needs GDPR help with this code: def process_user_data(email): return validate(email)",
            "Our team (dev1@company.com, dev2@company.com) reviewing: SELECT name, ssn FROM customers WHERE age > 21"
        ]
        
        print("🔄 Testing Mixed Complexity...")
        for query in mixed_queries:
            result = self.test_query(query)
            if result:
                print(f"   ✅ PII: {result.pii_detected} | Code: {result.code_detected} | Privacy: {result.privacy_score:.3f}")
        
        # Generate summary report
        self.generate_report()
    
    def generate_report(self) -> None:
        """Generate comprehensive test report"""
        
        if not self.results:
            print("❌ No test results to analyze")
            return
        
        print("\n\n📈 TEST RESULTS ANALYSIS")
        print("=" * 70)
        
        # Privacy Score Analysis
        privacy_scores = [r.privacy_score for r in self.results]
        print(f"🔒 Privacy Score Statistics:")
        print(f"   Mean: {statistics.mean(privacy_scores):.3f}")
        print(f"   Median: {statistics.median(privacy_scores):.3f}")
        print(f"   Range: {min(privacy_scores):.3f} - {max(privacy_scores):.3f}")
        
        # Performance Analysis
        processing_times = [r.processing_time for r in self.results]
        print(f"\n⏱️  Performance Statistics:")
        print(f"   Mean Processing Time: {statistics.mean(processing_times):.2f}s")
        print(f"   95th Percentile: {sorted(processing_times)[int(0.95 * len(processing_times))]:.2f}s")
        print(f"   SLA Compliance (<5s): {sum(1 for t in processing_times if t < 5) / len(processing_times) * 100:.1f}%")
        
        # Fragment Analysis
        fragment_counts = [r.fragment_count for r in self.results]
        print(f"\n🧩 Fragmentation Analysis:")
        print(f"   Average Fragments: {statistics.mean(fragment_counts):.1f}")
        print(f"   Multi-fragment Queries: {sum(1 for c in fragment_counts if c > 1) / len(fragment_counts) * 100:.1f}%")
        
        # Provider Usage
        all_providers = []
        for result in self.results:
            all_providers.extend(result.providers_used)
        provider_usage = {p: all_providers.count(p) for p in set(all_providers)}
        print(f"\n🏭 Provider Usage:")
        for provider, count in sorted(provider_usage.items()):
            print(f"   {provider}: {count} times ({count/len(all_providers)*100:.1f}%)")
        
        # Quality Analysis
        quality_scores = [r.response_quality_score for r in self.results]
        print(f"\n✨ Response Quality:")
        print(f"   Mean Quality Score: {statistics.mean(quality_scores):.3f}")
        print(f"   High Quality (>0.7): {sum(1 for q in quality_scores if q > 0.7) / len(quality_scores) * 100:.1f}%")
        
        # Cost Analysis
        total_fragmented_cost = sum(r.cost_fragmented for r in self.results)
        total_single_cost = sum(r.cost_single for r in self.results)
        overall_savings = (total_single_cost - total_fragmented_cost) / total_single_cost * 100
        print(f"\n💰 Cost Analysis:")
        print(f"   Total Fragmented Cost: ${total_fragmented_cost:.4f}")
        print(f"   Total Single Provider Cost: ${total_single_cost:.4f}")
        print(f"   Overall Savings: {overall_savings:.1f}%")
        
        # Success Criteria Validation
        print(f"\n✅ SUCCESS CRITERIA VALIDATION:")
        privacy_target = statistics.mean(privacy_scores) > 0.85
        performance_target = statistics.mean(processing_times) < 5.0
        quality_target = statistics.mean(quality_scores) > 0.6
        cost_target = overall_savings > 30.0
        
        print(f"   🎯 Privacy Score >0.85: {'✅ PASS' if privacy_target else '❌ FAIL'}")
        print(f"   🎯 Processing Time <5s: {'✅ PASS' if performance_target else '❌ FAIL'}")
        print(f"   🎯 Quality Score >0.6: {'✅ PASS' if quality_target else '❌ FAIL'}")
        print(f"   🎯 Cost Savings >30%: {'✅ PASS' if cost_target else '❌ FAIL'}")
        
        success_rate = sum([privacy_target, performance_target, quality_target, cost_target]) / 4
        print(f"\n🏆 OVERALL SUCCESS RATE: {success_rate * 100:.1f}%")
        
        if success_rate >= 0.75:
            print("🎉 ENHANCED SYSTEM VALIDATION: SUCCESS!")
        else:
            print("⚠️  ENHANCED SYSTEM VALIDATION: NEEDS IMPROVEMENT")

if __name__ == "__main__":
    tester = PrivacyLLMTester()
    tester.run_test_suite()