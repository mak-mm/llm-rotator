#!/usr/bin/env python3
"""
Interactive testing script for manual query testing
"""

import asyncio
import os
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

async def interactive_test():
    """Interactive test session"""
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ Set OPENAI_API_KEY first")
        return
    
    from src.orchestrator.orchestrator import QueryOrchestrator
    from src.orchestrator.models import OrchestrationConfig, OrchestrationRequest, PrivacyLevel
    from src.providers.manager import ProviderManager
    from src.providers.models import ProviderConfig, ProviderType, ProviderLoadBalancingConfig
    
    # Setup
    manager_config = ProviderLoadBalancingConfig(strategy="round_robin", failover_enabled=True)
    provider_manager = ProviderManager(manager_config)
    
    openai_config = ProviderConfig(
        provider_type=ProviderType.OPENAI,
        api_key=api_key,
        model_name="gpt-4o-mini",
        max_tokens=150
    )
    await provider_manager.add_provider("openai", openai_config)
    
    config = OrchestrationConfig(enable_pii_detection=True, enable_code_detection=True)
    orchestrator = QueryOrchestrator(config, provider_manager)
    
    print("🔐 Privacy-Preserving LLM Interactive Test")
    print("Type your queries, 'quit' to exit\n")
    
    while True:
        query = input("Query: ").strip()
        if query.lower() in ['quit', 'exit', 'q']:
            break
        
        if not query:
            continue
            
        try:
            request = OrchestrationRequest(query=query, privacy_level=PrivacyLevel.CONFIDENTIAL)
            response = await orchestrator.process_query(request)
            
            print(f"📊 Fragments: {response.fragments_processed} | Time: {response.total_processing_time_ms:.0f}ms")
            print(f"🔍 PII: {response.detection_report.has_pii} | Code: {response.detection_report.code_detection.has_code}")
            print(f"🛡️ Privacy: {response.privacy_level_achieved.value}")
            print(f"💬 Response: {response.aggregated_response}\n")
        except Exception as e:
            print(f"❌ Error: {e}\n")
    
    await orchestrator.shutdown()
    print("👋 Goodbye!")

if __name__ == "__main__":
    asyncio.run(interactive_test())