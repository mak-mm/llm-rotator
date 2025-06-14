"""
Privacy-Preserving LLM Query Fragmentation API
Main FastAPI application entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os
from dotenv import load_dotenv

from src.api.routes import router
from src.state.redis_client import RedisClient

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=os.getenv("API_LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    logger.info("Starting Privacy LLM Query Fragmentation API")
    
    # Initialize Redis connection
    redis_client = RedisClient()
    await redis_client.connect()
    app.state.redis = redis_client
    
    logger.info("API startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down API")
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)


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
        port=int(os.getenv("API_PORT", "8000")),
        reload=os.getenv("API_RELOAD", "true").lower() == "true"
    )