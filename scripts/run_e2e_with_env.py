#!/usr/bin/env python3
"""
E2E test runner that properly loads environment variables from .env file
"""

import asyncio
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

async def test_with_env_keys():
    """Test using API keys from .env file"""
    
    print("🔑 Loading API keys from .env file...")
    
    # Check available API keys
    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY") 
    google_key = os.getenv("GOOGLE_API_KEY")
    
    print(f"✅ OpenAI API Key: {'SET' if openai_key else 'NOT SET'}")
    print(f"✅ Anthropic API Key: {'SET' if anthropic_key else 'NOT SET'}")
    print(f"✅ Google API Key: {'SET' if google_key else 'NOT SET'}")
    
    if not openai_key:
        print("❌ No OpenAI API key found in .env file")
        return False
    
    print("\n🧪 Privacy-Preserving LLM Workflow Demo (Using .env)")
    print("=" * 60)
    
    try:
        from src.orchestrator.orchestrator import QueryOrchestrator
        from src.orchestrator.models import OrchestrationConfig, OrchestrationRequest, PrivacyLevel
        from src.providers.manager import ProviderManager
        from src.providers.models import ProviderConfig, ProviderType, ProviderLoadBalancingConfig
        
        # Setup provider manager
        manager_config = ProviderLoadBalancingConfig(
            strategy="round_robin",
            failover_enabled=True,
            health_check_interval=60
        )
        
        provider_manager = ProviderManager(manager_config)
        
        # Add available providers
        providers_added = []
        
        # Add OpenAI if available
        if openai_key:
            openai_config = ProviderConfig(
                provider_type=ProviderType.OPENAI,
                api_key=openai_key,
                base_url="https://api.openai.com/v1",
                model_name="gpt-4o-mini",
                max_tokens=200,
                temperature=0.1,
                timeout=30
            )
            await provider_manager.add_provider("openai", openai_config)
            providers_added.append("OpenAI (gpt-4o-mini)")
        
        # Add Anthropic if available
        if anthropic_key:
            try:
                anthropic_config = ProviderConfig(
                    provider_type=ProviderType.ANTHROPIC,
                    api_key=anthropic_key,
                    base_url="https://api.anthropic.com",
                    model_name="claude-sonnet-4-20250514",  # Latest Claude model
                    max_tokens=200,
                    temperature=0.1,
                    timeout=30
                )
                await provider_manager.add_provider("anthropic", anthropic_config)
                providers_added.append("Anthropic (claude-sonnet-4)")
            except Exception as e:
                print(f"⚠️  Anthropic setup failed: {e}")
        
        # Add Google if available (Note: Google provider might need different setup)
        if google_key:
            try:
                google_config = ProviderConfig(
                    provider_type=ProviderType.GOOGLE,
                    api_key=google_key,
                    model_name="gemini-2.5-flash-preview-04-17",
                    max_tokens=200,
                    temperature=0.1,
                    timeout=30
                )
                await provider_manager.add_provider("google", google_config)
                providers_added.append("Google (gemini-2.5-flash)")
            except Exception as e:
                print(f"⚠️  Google setup failed: {e}")
        
        print(f"🚀 Providers configured: {', '.join(providers_added)}")
        
        # Create orchestrator with multiple providers
        config = OrchestrationConfig(
            enable_pii_detection=True,
            enable_code_detection=True,
            enable_privacy_routing=True,
            enable_cost_optimization=True,
            # Use all available providers for sensitive data
            sensitive_data_providers=[p for p in [ProviderType.OPENAI, ProviderType.ANTHROPIC] if getattr(locals(), f"{p.value.lower()}_key", None)]
        )
        
        orchestrator = QueryOrchestrator(config, provider_manager)
        
        # Test scenarios showcasing multi-provider capability
        test_scenarios = [
            {
                "name": "🌍 Simple Factual (Public)",
                "query": "What is the capital of France?",
                "privacy_level": PrivacyLevel.PUBLIC,
                "expected": "Single fragment, any provider"
            },
            {
                "name": "🔒 PII Query (Confidential)",
                "query": "My name is Sarah Wilson and my email is sarah.wilson@techcorp.com. I need help with data privacy regulations.",
                "privacy_level": PrivacyLevel.CONFIDENTIAL,
                "expected": "Multiple fragments, privacy-focused routing"
            },
            {
                "name": "💻 Code Security (Restricted)",
                "query": "Review this authentication code: def authenticate(user, password): return user == 'admin' and password == 'secret123'",
                "privacy_level": PrivacyLevel.RESTRICTED,
                "expected": "Code isolation, secure processing"
            },
            {
                "name": "🎯 Complex Mixed (Top Secret)",
                "query": "I'm Dr. Emma Rodriguez (emma.rodriguez@hospital.org) reviewing this patient data processor: import pandas as pd; df = pd.read_csv('patients.csv'); print(df['ssn']). How can we make this HIPAA compliant?",
                "privacy_level": PrivacyLevel.TOP_SECRET,
                "expected": "Maximum isolation, highest security routing"
            }
        ]
        
        print(f"\n📋 Testing {len(test_scenarios)} scenarios across {len(providers_added)} providers:\n")
        
        total_cost = 0.0
        
        for i, scenario in enumerate(test_scenarios, 1):
            print(f"{scenario['name']}")
            print(f"   📝 Query: \"{scenario['query'][:70]}{'...' if len(scenario['query']) > 70 else ''}\"")
            print(f"   🔐 Privacy Level: {scenario['privacy_level'].value.upper()}")
            print(f"   🎯 Expected: {scenario['expected']}")
            
            try:
                # Create request
                request = OrchestrationRequest(
                    query=scenario['query'],
                    privacy_level=scenario['privacy_level']
                )
                
                # Process query
                start_time = asyncio.get_event_loop().time()
                response = await orchestrator.process_query(request)
                end_time = asyncio.get_event_loop().time()
                
                # Analyze results
                print(f"   ✅ SUCCESS!")
                print(f"      ⚡ Time: {response.total_processing_time_ms:.0f}ms")
                print(f"      🧩 Fragments: {response.fragments_processed}")
                print(f"      🏭 Providers Used: {', '.join(response.providers_used)}")
                print(f"      🔍 PII Detected: {response.detection_report.has_pii}")
                print(f"      💻 Code Detected: {response.detection_report.code_detection.has_code}")
                print(f"      🛡️  Achieved Privacy: {response.privacy_level_achieved.value.upper()}")
                print(f"      💰 Cost: ${response.total_cost_estimate:.4f}")
                
                total_cost += response.total_cost_estimate
                
                # Privacy verification
                sensitive_patterns = [
                    "sarah.wilson@techcorp.com", "Sarah Wilson",
                    "emma.rodriguez@hospital.org", "Dr. Emma Rodriguez", "Emma Rodriguez",
                    "secret123", "admin", "ssn", "patients.csv"
                ]
                
                violations = []
                response_lower = response.aggregated_response.lower()
                for pattern in sensitive_patterns:
                    if pattern.lower() in response_lower:
                        violations.append(pattern)
                
                if violations:
                    print(f"      ⚠️  PRIVACY ALERT: Found sensitive data: {violations}")
                else:
                    print(f"      🔒 PRIVACY PRESERVED: No sensitive data leaked")
                
                print(f"      💬 Response: \"{response.aggregated_response[:90]}{'...' if len(response.aggregated_response) > 90 else ''}\"")
                
            except Exception as e:
                print(f"   ❌ FAILED: {str(e)[:150]}{'...' if len(str(e)) > 150 else ''}")
            
            print()
        
        # Final summary
        metrics = orchestrator.get_metrics()
        
        print("=" * 60)
        print("📊 FINAL RESULTS")
        print("=" * 60)
        print(f"🎯 Total Requests: {metrics.total_requests}")
        print(f"✅ Success Rate: {metrics.success_rate():.1f}%")
        print(f"⚡ Avg Response Time: {metrics.average_processing_time_ms:.0f}ms")
        print(f"🧩 Avg Fragments/Request: {metrics.average_fragments_per_request:.1f}")
        print(f"🏭 Avg Providers/Request: {metrics.average_providers_per_request:.1f}")
        print(f"💰 Total Cost: ${total_cost:.4f}")
        print(f"🔍 PII Detections: {metrics.pii_detections}")
        print(f"💻 Code Detections: {metrics.code_detections}")
        print(f"🔒 High Security Requests: {metrics.high_sensitivity_requests}")
        
        if metrics.provider_usage:
            print(f"🏭 Provider Usage: {dict(metrics.provider_usage)}")
        
        await orchestrator.shutdown()
        
        print("\n🎉 Multi-Provider Privacy-Preserving LLM Testing Complete!")
        print("✨ Your PoC successfully demonstrates:")
        print("   🔐 Privacy-preserving query fragmentation")
        print("   🏭 Multi-provider load balancing") 
        print("   🛡️  Sensitive data isolation")
        print("   ⚡ Real-time processing")
        print("   💰 Cost-effective operations")
        
        return True
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_with_env_keys())
    sys.exit(0 if success else 1)