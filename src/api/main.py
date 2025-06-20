"""
Privacy-Preserving LLM Query Fragmentation API
Main FastAPI application entry point
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import router
from src.api.investor_collector import investor_metrics_collector
from src.state.redis_client import RedisClient

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=os.getenv("API_LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# WebSocket log handler disabled - using SSE instead
# root_logger = logging.getLogger()
# root_logger.addHandler(websocket_log_handler)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    logger.info("Starting Privacy LLM Query Fragmentation API")

    # Initialize Redis connection
    redis_client = RedisClient()
    await redis_client.connect()
    app.state.redis = redis_client

    # Initialize orchestrator and provider infrastructure
    from src.orchestrator.orchestrator import QueryOrchestrator
    from src.providers.manager import ProviderManager
    from src.providers.models import ProviderConfig, ProviderLoadBalancingConfig, ProviderType
    from src.orchestrator.models import OrchestrationConfig

    # Configure providers
    provider_configs = {}
    
    # OpenAI provider
    if os.getenv("OPENAI_API_KEY"):
        provider_configs["openai"] = ProviderConfig(
            provider_id="openai",
            provider_type=ProviderType.OPENAI,
            api_key=os.getenv("OPENAI_API_KEY"),
            # model_name=os.getenv("OPENAI_MODEL", "gpt-4"),
            model_name=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),  # Using 4o-mini for consistency
            max_tokens=4000,
            temperature=0.7
        )

    # Anthropic provider  
    if os.getenv("ANTHROPIC_API_KEY"):
        provider_configs["anthropic"] = ProviderConfig(
            provider_id="anthropic",
            provider_type=ProviderType.ANTHROPIC,
            api_key=os.getenv("ANTHROPIC_API_KEY"),
            model_name=os.getenv("CLAUDE_WORKER_MODEL", "claude-3-5-sonnet-20241022"),
            max_tokens=4000,
            temperature=0.7
        )

    # Google provider
    if os.getenv("GOOGLE_API_KEY"):
        provider_configs["google"] = ProviderConfig(
            provider_id="google",
            provider_type=ProviderType.GOOGLE,
            api_key=os.getenv("GOOGLE_API_KEY"),
            model_name=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
            max_tokens=4000,
            temperature=0.7
        )

    # Initialize provider manager
    lb_config = ProviderLoadBalancingConfig(
        strategy="round_robin",
        max_retries=3,
        retry_delay=1.0,
        health_check_interval=60.0,
        circuit_breaker_threshold=5,
        circuit_breaker_timeout=30.0
    )
    
    provider_manager = ProviderManager(lb_config)
    
    # Add providers
    for provider_id, config in provider_configs.items():
        await provider_manager.add_provider(provider_id, config)
    
    # Store provider manager in app state for access from routes
    app.state.provider_manager = provider_manager
    
    # Initialize orchestrator
    orchestration_config = OrchestrationConfig(
        max_concurrent_requests=10,
        request_timeout=30.0,
        enable_privacy_routing=True,
        enable_cost_optimization=True,
        enable_pii_detection=True,
        enable_code_detection=True
    )
    
    orchestrator = QueryOrchestrator(
        config=orchestration_config,
        provider_manager=provider_manager
    )
    
    # Store in app state
    app.state.orchestrator = orchestrator
    app.state.provider_manager = provider_manager
    
    # WebSocket functionality removed - using SSE instead

    logger.info("API startup complete")

    yield

    # Shutdown
    logger.info("Shutting down API")
    
    # Cancel background task
    if hasattr(app.state, 'background_task'):
        app.state.background_task.cancel()
        try:
            await app.state.background_task
        except asyncio.CancelledError:
            pass
    
    # Shutdown orchestrator
    if hasattr(app.state, 'orchestrator'):
        await app.state.orchestrator.shutdown()
    
    await redis_client.close()
    logger.info("API shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Privacy-Preserving LLM Query Fragmentation",
    description="Fragment queries across multiple LLM providers to preserve privacy",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
frontend_urls = [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
    "http://127.0.0.1:3004",
    "http://127.0.0.1:3005",
    os.getenv("FRONTEND_URL", "")
]

# In development, allow localhost with any port
if os.getenv("ENVIRONMENT") == "development":
    # Add dynamic port range for development
    for port in range(3000, 3050):
        frontend_urls.extend([
            f"http://localhost:{port}",
            f"http://127.0.0.1:{port}"
        ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)

# WebSocket endpoints disabled - using SSE instead
@app.get("/ws/updates")
async def websocket_updates_disabled():
    """Disabled WebSocket endpoint - using SSE instead"""
    return {
        "error": "WebSocket endpoint disabled",
        "message": "This system now uses Server-Sent Events (SSE) for real-time updates",
        "alternative": "Use /api/v1/stream/{request_id} for SSE streaming"
    }

# @app.websocket("/ws/logs")
# async def websocket_logs(websocket: WebSocket):
#     """WebSocket endpoint for real-time log streaming"""
#     await websocket.accept()
#     
#     # Add connection to log handler
#     websocket_log_handler.add_connection(websocket)
#     
#     try:
#         # Keep connection alive and listen for client messages
#         while True:
#             await websocket.receive_text()
#     except:
#         # Remove connection when client disconnects
#         websocket_log_handler.remove_connection(websocket)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Privacy-Preserving LLM Query Fragmentation API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "privacy-llm-api"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.api.main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", "8003")),
        reload=os.getenv("API_RELOAD", "true").lower() == "true"
    )
