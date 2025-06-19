"""
API route definitions
"""

import asyncio
import logging
import uuid
import time

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Request
from sse_starlette.sse import EventSourceResponse

from src.api.models import (
    AnalysisResponse,
    ErrorResponse,
    QueryRequest,
    StatusResponse,
    VisualizationData,
    ProviderStatus,
    MetricsSummary,
    TimeseriesData,
    DetectionResult,
    Fragment,
    FragmentResponse,
    ProviderType,
)
from src.detection.engine import DetectionEngine
from src.api.investor_collector import investor_metrics_collector
from src.api.sse import sse_manager
from src.api.background_tasks import process_query_background

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["privacy-llm"])

# Initialize detection engine
detection_engine = DetectionEngine()

# Dependency to get orchestrator from app state
async def get_orchestrator(request: Request):
    """Get orchestrator from app state"""
    if hasattr(request.app.state, 'orchestrator'):
        return request.app.state.orchestrator
    return None


@router.post("/analyze")
async def analyze_query(
    query_request: QueryRequest, 
    background_tasks: BackgroundTasks,
    fastapi_request: Request,
    orchestrator=Depends(get_orchestrator)
):
    """
    Analyze and fragment a query across multiple LLM providers

    This endpoint:
    1. Returns immediately with a request_id
    2. Processes the query in the background
    3. Sends real-time updates via SSE
    """
    try:
        # Generate request ID
        request_id = f"req_{uuid.uuid4().hex[:12]}"
        
        # Log initial query receipt
        logger.info(f"[{request_id}] Query received: {len(query_request.query)} characters")
        
        # Store initial request state in Redis immediately for SSE endpoint
        current_time = time.time()
        initial_data = {
            "status": "starting",
            "original_query": query_request.query,
            "started_at": current_time,
            "created_at": current_time,
            "updated_at": current_time,
            "progress": 0.0
        }
        await fastapi_request.app.state.redis.set(f"query:{request_id}", initial_data)
        logger.info(f"[DEBUG] Stored request {request_id} in Redis: {initial_data}")
        
        # Send initial SSE update
        await sse_manager.send_step_update(
            request_id, "query_received", "completed", 100,
            f"Query received: {len(query_request.query)} characters"
        )
        
        # Add background task to process the query
        background_tasks.add_task(
            process_query_background,
            request_id,
            query_request,
            orchestrator,
            detection_engine,
            fastapi_request.app.state.redis
        )
        
        # Return immediately with request_id
        return {
            "request_id": request_id,
            "status": "processing",
            "message": "Query processing started"
        }

    except Exception as e:
        logger.error(f"Error starting query analysis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="analysis_error",
                message="Failed to start query analysis",
                details={"error": str(e)}
            ).model_dump()
        )


@router.get("/result/{request_id}", response_model=AnalysisResponse)
async def get_result(request_id: str, request: Request):
    """
    Get the result of a processed query
    """
    try:
        # Get result from Redis
        redis_client = request.app.state.redis
        result = await redis_client.get(f"query:{request_id}")
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=ErrorResponse(
                    error="not_found",
                    message="Query result not found",
                    request_id=request_id
                ).model_dump()
            )
        
        # Check if still processing
        if result.get("status") == "processing":
            raise HTTPException(
                status_code=202,
                detail={
                    "status": "processing",
                    "message": "Query is still being processed"
                }
            )
        
        # Check if failed
        if result.get("status") == "failed":
            raise HTTPException(
                status_code=500,
                detail=ErrorResponse(
                    error="processing_failed",
                    message="Query processing failed",
                    details={"error": result.get("error")}
                ).model_dump()
            )
        
        # Return the completed result
        return AnalysisResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting result: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="result_error",
                message="Failed to get query result",
                details={"error": str(e)}
            ).model_dump()
        )


@router.get("/status/{request_id}", response_model=StatusResponse)
async def get_status(request_id: str, request: Request):
    """
    Get processing status for a request
    """
    try:
        # Get status from Redis
        redis_client = request.app.state.redis
        result = await redis_client.get(f"query:{request_id}")
        
        from datetime import datetime
        now = datetime.utcnow()
        
        if not result:
            return StatusResponse(
                request_id=request_id,
                status="not_found",
                progress=0.0,
                message="Request not found",
                created_at=now,
                updated_at=now
            )
        
        status = result.get("status", "unknown")
        
        # Calculate progress based on status (0.0 to 1.0)
        progress = 0.0
        if status == "completed":
            progress = 1.0
        elif status == "processing":
            # Could calculate based on completed steps
            progress = result.get("progress", 0.5)
        elif status == "failed":
            progress = 0.0
        
        # Use stored timestamps if available, otherwise use current time
        created_at = result.get("created_at")
        if created_at:
            created_at = datetime.fromtimestamp(created_at)
        else:
            created_at = now
            
        updated_at = result.get("updated_at") 
        if updated_at:
            updated_at = datetime.fromtimestamp(updated_at)
        else:
            updated_at = now
        
        return StatusResponse(
            request_id=request_id,
            status=status,
            progress=progress,
            message=result.get("message", ""),
            created_at=created_at,
            updated_at=updated_at
        )

    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="status_error",
                message="Failed to get status",
                request_id=request_id
            ).model_dump()
        )


@router.get("/stream/{request_id}")
async def stream_progress(request_id: str, request: Request):
    """
    Server-Sent Events endpoint for real-time progress streaming
    """
    logger.info(f"SSE connection requested for {request_id}")
    
    # Check if request exists in Redis with retry logic for race conditions
    redis_client = request.app.state.redis
    result = None
    max_retries = 3
    retry_delay = 0.5  # 500ms between retries
    
    for attempt in range(max_retries):
        result = await redis_client.get(f"query:{request_id}")
        if result:
            break
        if attempt < max_retries - 1:
            logger.info(f"[DEBUG] SSE lookup attempt {attempt + 1} for {request_id}: NOT FOUND, retrying in {retry_delay}s")
            await asyncio.sleep(retry_delay)
        else:
            logger.warning(f"SSE request for non-existent request_id after {max_retries} attempts: {request_id}")
    
    # Debug logging to see what's in Redis
    logger.info(f"[DEBUG] SSE lookup for {request_id}: {'FOUND' if result else 'NOT FOUND'}")
    if result:
        logger.info(f"[DEBUG] Request data: {result}")
    
    if not result:
        logger.warning(f"SSE request for non-existent request_id: {request_id}")
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error="not_found",
                message=f"Request {request_id} not found"
            ).model_dump()
        )
    
    async def event_generator():
        try:
            async for event in sse_manager.connect(request_id):
                yield event
        except Exception as e:
            logger.error(f"SSE generator error: {str(e)}")
            raise
    
    return EventSourceResponse(event_generator())


@router.get("/visualization/{request_id}", response_model=VisualizationData)
async def get_visualization_data(request_id: str, request: Request):
    """
    Get visualization data for the demo UI
    """
    try:
        # Get result from Redis
        redis_client = request.app.state.redis
        result = await redis_client.get(f"query:{request_id}")
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=ErrorResponse(
                    error="not_found",
                    message="Visualization data not found",
                    request_id=request_id
                ).model_dump()
            )
        
        # Convert to visualization data
        return VisualizationData(
            request_id=request_id,
            fragments=result.get("fragments", []),
            fragment_responses=result.get("fragment_responses", []),
            timeline=[],  # Could populate with step timings
            privacy_metrics={
                "privacy_score": result.get("privacy_score", 0),
                "pii_entities": len(result.get("detection", {}).get("pii_entities", [])),
                "fragments_created": len(result.get("fragments", []))
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting visualization data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="visualization_error",
                message="Failed to get visualization data",
                request_id=request_id
            ).model_dump()
        )


@router.get("/providers", response_model=dict[str, dict])
async def get_providers():
    """
    Get information about available LLM providers
    """
    return {
        "providers": {
            "openai": {
                "name": "OpenAI",
                "model": "gpt-4-1106-preview",
                "capabilities": ["complex_reasoning", "code_generation"],
                "cost_per_1k_tokens": 0.01,
                "max_context": 128000
            },
            "anthropic": {
                "name": "Anthropic",
                "model": "claude-sonnet-4-20250514",
                "capabilities": ["analysis", "safety", "hybrid_reasoning"],
                "cost_per_1k_tokens": 0.003,
                "max_context": 200000
            },
            "google": {
                "name": "Google",
                "model": "gemini-2.5-flash-preview-04-17",
                "capabilities": ["factual", "cost_efficient", "thinking"],
                "cost_per_1k_tokens": 0.00075,
                "max_context": 1000000
            }
        }
    }


@router.get("/providers/status", response_model=dict[str, list[ProviderStatus]])
async def get_provider_status():
    """
    Get real-time status of all LLM providers
    """
    try:
        from datetime import datetime
        
        # Get real provider status from provider manager
        from src.api.main import app
        provider_manager = getattr(app.state, 'provider_manager', None)
        
        providers = []
        if provider_manager:
            for provider_id, provider in provider_manager.providers.items():
                providers.append(ProviderStatus(
                    id=provider_id,
                    name=provider_id.title(),
                    model=getattr(provider, 'model_name', 'Unknown'),
                    status="online" if provider.is_available() else "offline",
                    latency=getattr(provider, 'average_latency', 0),
                    success_rate=getattr(provider, 'success_rate', 0),
                    requests_today=getattr(provider, 'requests_today', 0),
                    cost=getattr(provider, 'total_cost', 0),
                    capabilities=getattr(provider, 'capabilities', []),
                    last_updated=datetime.utcnow()
                ))
        
        return {"providers": providers}
        
    except Exception as e:
        logger.error(f"Error getting provider status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="provider_status_error",
                message="Failed to get provider status"
            ).model_dump()
        )


@router.get("/metrics/summary", response_model=MetricsSummary)
async def get_metrics_summary(request: Request, timeframe: str = "7d"):
    """
    Get aggregated metrics for analytics dashboard
    """
    try:
        
        # Get real metrics from Redis
        redis_client = getattr(request.app.state, 'redis', None)
        if not redis_client:
            raise HTTPException(status_code=503, detail="Metrics service unavailable")
        
        # TODO: Implement actual metrics collection from Redis
        # For now, return basic structure without simulation
        return MetricsSummary(
            total_queries=0,
            total_fragments=0,
            total_providers=3,
            total_cost=0.0,
            average_latency=0.0,
            privacy_score=0.0
        )
        
    except Exception as e:
        logger.error(f"Error getting metrics summary: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="metrics_error",
                message="Failed to get metrics summary"
            ).model_dump()
        )


@router.get("/metrics/timeseries", response_model=list[TimeseriesData])
async def get_timeseries_metrics(
    metric: str,
    timeframe: str = "7d", 
    interval: str = "1h"
):
    """
    Get time-series data for specific metrics
    """
    try:
        
        # TODO: Implement real time-series data from Redis metrics storage
        # Return empty data for now
        return []
        
    except Exception as e:
        logger.error(f"Error getting timeseries metrics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="timeseries_error", 
                message="Failed to get timeseries data"
            ).model_dump()
        )