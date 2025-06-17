#!/usr/bin/env python3
"""
Quick standalone test to verify the e2e setup works
"""

import asyncio
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.orchestrator.orchestrator import QueryOrchestrator
from src.orchestrator.models import OrchestrationConfig, OrchestrationRequest, PrivacyLevel
from src.providers.manager import ProviderManager
from src.providers.models import ProviderConfig, ProviderType, ProviderLoadBalancingConfig


async def quick_test():
    """Quick test with real OpenAI API"""
    
    # Check API key
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not set")
        return False
    
    try:
        # Setup provider manager
        manager_config = ProviderLoadBalancingConfig(
            strategy="round_robin",
            failover_enabled=True
        )
        
        provider_manager = ProviderManager(manager_config)
        
        # Add OpenAI provider
        openai_config = ProviderConfig(
            provider_type=ProviderType.OPENAI,
            api_key=api_key,
            base_url="https://api.openai.com/v1",
            model_name="gpt-4o-mini",
            max_tokens=100,
            temperature=0.1
        )
        
        await provider_manager.add_provider("openai", openai_config)
        
        # Create orchestrator
        config = OrchestrationConfig(
            enable_pii_detection=True,
            enable_code_detection=True,
            sensitive_data_providers=[ProviderType.OPENAI]
        )
        
        orchestrator = QueryOrchestrator(config, provider_manager)
        
        # Test simple query
        request = OrchestrationRequest(
            query="What is the capital of France?",
            privacy_level=PrivacyLevel.PUBLIC
        )
        
        print("🔍 Testing simple query...")
        response = await orchestrator.process_query(request)
        
        print(f"✅ Query processed successfully!")
        print(f"   Fragments: {response.fragments_processed}")
        print(f"   Time: {response.total_processing_time_ms:.0f}ms")
        print(f"   Response: {response.aggregated_response[:100]}...")
        
        await orchestrator.shutdown()
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(quick_test())
    sys.exit(0 if success else 1)