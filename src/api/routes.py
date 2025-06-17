"""
API route definitions
"""

import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Request

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
    ProviderType,
)
from src.detection.engine import DetectionEngine

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


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_query(
    query_request: QueryRequest, 
    background_tasks: BackgroundTasks,
    fastapi_request: Request,
    orchestrator=Depends(get_orchestrator)
):
    """
    Analyze and fragment a query across multiple LLM providers

    This endpoint:
    1. Detects PII and sensitive content
    2. Fragments the query based on detection results
    3. Routes fragments to different providers
    4. Aggregates responses while preserving privacy
    """
    try:
        from src.orchestrator.models import OrchestrationRequest, PrivacyLevel
        
        # Generate request ID
        request_id = f"req_{uuid.uuid4().hex[:12]}"

        # Try to use full orchestrator if available
        if orchestrator:
            try:
                logger.info(f"Using full orchestrator for request {request_id}")
                
                # Create orchestration request
                orchestration_request = OrchestrationRequest(
                    request_id=request_id,
                    query=query_request.query,
                    privacy_level=PrivacyLevel.CONFIDENTIAL,
                    fragmentation_strategy=query_request.strategy,
                    use_orchestrator=query_request.use_orchestrator or True
                )

                # Process through full orchestrator
                orchestration_response = await orchestrator.process_query(orchestration_request)
                
                # Convert orchestration response to API response format
                fragments = [
                    Fragment(
                        id=result.fragment_id,
                        content=f"Fragment processed by {result.provider_id}",
                        provider=ProviderType(result.provider_id),
                        anonymized=result.privacy_score > 0.7,
                        context_percentage=round(1.0 / len(orchestration_response.fragment_results), 2)
                    )
                    for result in orchestration_response.fragment_results
                ]

                detection_dict = DetectionResult(
                    has_pii=orchestration_response.detection_report.has_pii,
                    pii_entities=[
                        {
                            "text": e.text,
                            "type": e.type.value,
                            "start": e.start,
                            "end": e.end,
                            "score": e.score
                        }
                        for e in orchestration_response.detection_report.pii_entities
                    ],
                    has_code=orchestration_response.detection_report.code_detection.has_code,
                    code_language=orchestration_response.detection_report.code_detection.language,
                    entities=[
                        {
                            "text": e.text,
                            "label": e.label,
                            "start": e.start,
                            "end": e.end
                        }
                        for e in orchestration_response.detection_report.named_entities
                    ],
                    sensitivity_score=orchestration_response.detection_report.sensitivity_score
                )

                # Calculate actual privacy score
                avg_privacy_score = sum(result.privacy_score for result in orchestration_response.fragment_results) / len(orchestration_response.fragment_results) if orchestration_response.fragment_results else 0.0

                return AnalysisResponse(
                    request_id=request_id,
                    original_query=query_request.query,
                    detection=detection_dict,
                    fragments=fragments,
                    aggregated_response=orchestration_response.aggregated_response,
                    privacy_score=avg_privacy_score,
                    total_time=orchestration_response.total_processing_time_ms / 1000,
                    cost_comparison={
                        "fragmented_cost": orchestration_response.total_cost_estimate,
                        "single_provider_cost": orchestration_response.total_cost_estimate * 2.5,  # Estimate
                        "savings_percentage": 60.0  # Simplified calculation
                    }
                )
                
            except Exception as orch_error:
                logger.warning(f"Orchestrator failed, falling back to detection-only: {str(orch_error)}")
                # Fall through to detection-only mode

        # Fallback: Detection-only mode with enhanced response
        logger.info(f"Using detection-only mode for request {request_id}")
        detection_report = await detection_engine.analyze(query_request.query)

        # Convert detection report to API format
        detection_dict = DetectionResult(
            has_pii=detection_report.has_pii,
            pii_entities=[
                {
                    "text": e.text,
                    "type": e.type.value,
                    "start": e.start,
                    "end": e.end,
                    "score": e.score
                }
                for e in detection_report.pii_entities
            ],
            has_code=detection_report.code_detection.has_code,
            code_language=detection_report.code_detection.language,
            entities=[
                {
                    "text": e.text,
                    "label": e.label,
                    "start": e.start,
                    "end": e.end
                }
                for e in detection_report.named_entities
            ],
            sensitivity_score=detection_report.sensitivity_score
        )

        # Create realistic fragments based on detection
        fragments = []
        if detection_report.sensitivity_score > 0.3:
            num_fragments = min(4, max(2, int(detection_report.sensitivity_score * 6)))
            providers = [ProviderType.ANTHROPIC, ProviderType.OPENAI, ProviderType.GOOGLE]
            
            fragments = [
                Fragment(
                    id=f"frag_{i+1}",
                    content=f"Fragment {i+1} (would be anonymized: {detection_report.has_pii})",
                    provider=providers[i % len(providers)],
                    anonymized=detection_report.has_pii,
                    context_percentage=round(1.0 / num_fragments, 2)
                )
                for i in range(num_fragments)
            ]

        # Create meaningful response based on sensitivity
        if detection_report.sensitivity_score < 0.2:
            aggregated_response = "Low sensitivity query - would be sent directly to cost-effective provider (Gemini) without fragmentation."
        elif detection_report.sensitivity_score < 0.5:
            aggregated_response = f"Medium sensitivity detected. Query would be split into {len(fragments)} fragments across different providers for basic privacy protection."
        else:
            aggregated_response = f"High sensitivity content detected (PII: {detection_report.has_pii}, Code: {detection_report.code_detection.has_code}). Query would be heavily fragmented into {len(fragments)} pieces with maximum anonymization."

        return AnalysisResponse(
            request_id=request_id,
            original_query=query_request.query,
            detection=detection_dict,
            fragments=fragments,
            aggregated_response=aggregated_response,
            privacy_score=min(detection_report.sensitivity_score * 0.7 + 0.3, 1.0),
            total_time=detection_report.processing_time / 1000,
            cost_comparison={
                "fragmented_cost": len(fragments) * 0.002 if fragments else 0.001,
                "single_provider_cost": 0.008,
                "savings_percentage": max(0, (1 - (len(fragments) * 0.002 / 0.008)) * 100) if fragments else 87.5
            }
        )

    except Exception as e:
        logger.error(f"Error analyzing query: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="analysis_error",
                message="Failed to analyze query",
                details={"error": str(e)}
            ).dict()
        )


@router.get("/status/{request_id}", response_model=StatusResponse)
async def get_status(request_id: str):
    """
    Get processing status for a request
    """
    try:
        # TODO: Implement actual status checking from Redis
        # For now, return a mock response
        from datetime import datetime

        return StatusResponse(
            request_id=request_id,
            status="pending",
            progress=0.0,
            message="Request queued for processing",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error="not_found",
                message="Request not found",
                request_id=request_id
            ).dict()
        )


@router.get("/visualization/{request_id}", response_model=VisualizationData)
async def get_visualization_data(request_id: str):
    """
    Get visualization data for the demo UI
    """
    try:
        # TODO: Implement actual visualization data retrieval
        # For now, return a mock response
        return VisualizationData(
            request_id=request_id,
            fragments=[],
            fragment_responses=[],
            timeline=[],
            privacy_metrics={}
        )

    except Exception as e:
        logger.error(f"Error getting visualization data: {str(e)}")
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error="not_found",
                message="Visualization data not found",
                request_id=request_id
            ).dict()
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
        import random
        import time
        
        # TODO: Replace with real provider health checks
        # For now, simulate provider status with slight variations
        providers = [
            ProviderStatus(
                id="openai",
                name="OpenAI",
                model="GPT-4.1",
                status="online",
                latency=1200 + random.uniform(-200, 200),
                success_rate=99.2 + random.uniform(-1, 1),
                requests_today=45 + random.randint(-5, 10),
                cost=0.0234 + random.uniform(-0.005, 0.005),
                capabilities=["Text Generation", "Code Analysis", "Function Calling", "Vision"],
                last_updated=datetime.utcnow()
            ),
            ProviderStatus(
                id="anthropic",
                name="Anthropic",
                model="Claude Sonnet 4",
                status="online",
                latency=1800 + random.uniform(-300, 300),
                success_rate=98.7 + random.uniform(-1, 1),
                requests_today=38 + random.randint(-5, 10),
                cost=0.0189 + random.uniform(-0.005, 0.005),
                capabilities=["Text Generation", "Code Analysis", "Sensitive Data", "Vision"],
                last_updated=datetime.utcnow()
            ),
            ProviderStatus(
                id="google",
                name="Google",
                model="Gemini 2.5 Flash",
                status="online",
                latency=920 + random.uniform(-100, 200),
                success_rate=97.9 + random.uniform(-1, 1),
                requests_today=22 + random.randint(-3, 8),
                cost=0.0098 + random.uniform(-0.002, 0.002),
                capabilities=["Text Generation", "Code Analysis", "Vision", "Function Calling"],
                last_updated=datetime.utcnow()
            )
        ]
        
        return {"providers": providers}
        
    except Exception as e:
        logger.error(f"Error getting provider status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="provider_status_error",
                message="Failed to get provider status"
            ).dict()
        )


@router.get("/metrics/summary", response_model=MetricsSummary)
async def get_metrics_summary(timeframe: str = "7d"):
    """
    Get aggregated metrics for analytics dashboard
    """
    try:
        import random
        
        # TODO: Replace with real metrics from database
        # For now, return simulated metrics based on timeframe
        base_queries = {"24h": 100, "7d": 1000, "30d": 5000, "90d": 15000}
        
        total_queries = base_queries.get(timeframe, 1000) + random.randint(-50, 100)
        
        return MetricsSummary(
            total_queries=total_queries,
            total_fragments=int(total_queries * 2.3) + random.randint(-10, 20),
            total_providers=3,
            total_cost=total_queries * 0.002 + random.uniform(-10, 10),
            average_latency=1300 + random.uniform(-200, 300),
            privacy_score=0.94 + random.uniform(-0.02, 0.03)
        )
        
    except Exception as e:
        logger.error(f"Error getting metrics summary: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="metrics_error",
                message="Failed to get metrics summary"
            ).dict()
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
        from datetime import datetime, timedelta
        import random
        
        # TODO: Replace with real time-series data from database
        # For now, generate simulated time-series data
        
        # Calculate number of data points based on timeframe and interval
        hours_map = {"24h": 24, "7d": 168, "30d": 720, "90d": 2160}
        total_hours = hours_map.get(timeframe, 168)
        
        interval_hours = {"1h": 1, "6h": 6, "1d": 24}
        step = interval_hours.get(interval, 1)
        
        data_points = []
        base_time = datetime.utcnow() - timedelta(hours=total_hours)
        
        for i in range(0, total_hours, step):
            timestamp = base_time + timedelta(hours=i)
            
            # Generate different patterns for different metrics
            if metric == "queries":
                value = 50 + 30 * (1 + 0.5 * random.random()) + 20 * (i / total_hours)
            elif metric == "privacy_score":
                value = 0.92 + 0.05 * random.random()
            elif metric == "cost":
                value = 0.002 + 0.001 * random.random()
            elif metric == "latency":
                value = 1200 + 300 * random.random()
            else:
                value = random.uniform(0, 100)
                
            data_points.append(TimeseriesData(
                timestamp=timestamp,
                value=value
            ))
        
        return data_points
        
    except Exception as e:
        logger.error(f"Error getting timeseries metrics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="timeseries_error", 
                message="Failed to get timeseries data"
            ).dict()
        )
