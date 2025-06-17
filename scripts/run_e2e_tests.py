#!/usr/bin/env python3
"""
Script to run end-to-end tests with real OpenAI GPT-4o-mini

Usage:
    python scripts/run_e2e_tests.py
    
Environment variables required:
    OPENAI_API_KEY - Your OpenAI API key

Optional environment variables:
    E2E_VERBOSE - Set to 1 for verbose output
    E2E_TIMEOUT - Test timeout in seconds (default: 300)
"""

import os
import sys
import subprocess
import asyncio
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def check_requirements():
    """Check if requirements are met for e2e tests"""
    
    # Check API key
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY environment variable is required")
        print("   Get your API key from: https://platform.openai.com/api-keys")
        print("   Then run: export OPENAI_API_KEY='your-key-here'")
        return False
    
    # Check internet connectivity (simple check)
    try:
        import requests
        response = requests.get("https://api.openai.com/v1/models", timeout=5)
        if response.status_code != 401:  # 401 is expected without auth
            print("❌ Cannot reach OpenAI API")
            return False
    except Exception as e:
        print(f"❌ Internet connectivity issue: {e}")
        return False
    
    print("✅ Requirements check passed")
    return True


def run_e2e_tests():
    """Run the end-to-end tests"""
    
    if not check_requirements():
        return 1
    
    # Set test environment
    env = os.environ.copy()
    env["PYTEST_CURRENT_TEST"] = "true"
    
    # Configure pytest arguments
    pytest_args = [
        "python", "-m", "pytest",
        "tests/e2e/",
        "-v",  # Verbose output
        "-s",  # Don't capture output
        "--tb=short",  # Short traceback format
        "-m", "e2e",  # Only run e2e marked tests
        f"--timeout={os.getenv('E2E_TIMEOUT', '300')}",  # 5 minute timeout
        "--disable-warnings",  # Disable warnings for cleaner output
    ]
    
    if os.getenv("E2E_VERBOSE"):
        pytest_args.extend(["-vv", "--tb=long"])
    
    print("🚀 Starting end-to-end tests with real OpenAI GPT-4o-mini")
    print("   This will make actual API calls and may incur small costs")
    print("   Press Ctrl+C to cancel within 5 seconds...")
    
    try:
        import time
        time.sleep(5)
    except KeyboardInterrupt:
        print("\n❌ Tests cancelled by user")
        return 1
    
    print("\n📡 Running e2e tests...")
    
    try:
        result = subprocess.run(pytest_args, env=env, cwd=project_root)
        
        if result.returncode == 0:
            print("\n✅ All e2e tests passed!")
            print("   The privacy-preserving LLM workflow is working correctly")
        else:
            print(f"\n❌ Some tests failed (exit code: {result.returncode})")
            print("   Check the output above for details")
        
        return result.returncode
        
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Error running tests: {e}")
        return 1


def run_single_test():
    """Run a single test for quick verification"""
    
    if not check_requirements():
        return 1
    
    # Test a simple factual query
    test_code = '''
import asyncio
import os
from src.orchestrator.orchestrator import QueryOrchestrator
from src.orchestrator.models import OrchestrationConfig, OrchestrationRequest, PrivacyLevel
from src.providers.manager import ProviderManager
from src.providers.models import ProviderConfig, ProviderType, ProviderLoadBalancingConfig

async def quick_test():
    # Setup
    manager_config = ProviderLoadBalancingConfig(
        strategy="round_robin",
        failover_enabled=True
    )
    
    provider_manager = ProviderManager(manager_config)
    
    # Add OpenAI provider
    openai_config = ProviderConfig(
        provider_type=ProviderType.OPENAI,
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url="https://api.openai.com/v1",
        model_name="gpt-4o-mini",
        max_tokens=100,
        temperature=0.1
    )
    
    await provider_manager.add_provider("openai", openai_config)
    config = OrchestrationConfig(
        enable_pii_detection=True,
        enable_code_detection=True,
        sensitive_data_providers=[ProviderType.OPENAI]
    )
    
    orchestrator = QueryOrchestrator(config, provider_manager)
    
    try:
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
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
    finally:
        await orchestrator.shutdown()

if __name__ == "__main__":
    success = asyncio.run(quick_test())
    exit(0 if success else 1)
'''
    
    print("🧪 Running quick verification test...")
    
    try:
        exec(test_code)
    except Exception as e:
        print(f"❌ Quick test failed: {e}")
        return 1


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "quick":
        exit(run_single_test())
    else:
        exit(run_e2e_tests())