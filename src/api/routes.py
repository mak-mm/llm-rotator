"""
API route definitions
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from typing import Dict
import uuid
import logging

from src.api.models import (
    QueryRequest,
    AnalysisResponse,
    StatusResponse,
    VisualizationData,
    ErrorResponse
)
from src.detection.engine import DetectionEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["privacy-llm"])

# Initialize detection engine
detection_engine = DetectionEngine()


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_query(request: QueryRequest, background_tasks: BackgroundTasks):
    """
    Analyze and fragment a query across multiple LLM providers
    
    This endpoint:
    1. Detects PII and sensitive content
    2. Fragments the query based on detection results
    3. Routes fragments to different providers
    4. Aggregates responses while preserving privacy
    """
    try:
        # Generate request ID
        request_id = f"req_{uuid.uuid4().hex[:12]}"
        
        # Run detection analysis
        detection_report = await detection_engine.analyze(request.query)
        
        # Convert detection report to API format
        detection_dict = {
            "has_pii": detection_report.has_pii,
            "pii_entities": [
                {
                    "text": e.text,
                    "type": e.type.value,
                    "start": e.start,
                    "end": e.end,
                    "score": e.score
                }
                for e in detection_report.pii_entities
            ],
            "has_code": detection_report.code_detection.has_code,
            "code_language": detection_report.code_detection.language,
            "entities": [
                {
                    "text": e.text,
                    "label": e.label,
                    "start": e.start,
                    "end": e.end
                }
                for e in detection_report.named_entities
            ],
            "sensitivity_score": detection_report.sensitivity_score
        }
        
        # TODO: Implement fragmentation and routing in next phase
        # For now, return detection results
        return AnalysisResponse(
            request_id=request_id,
            original_query=request.query,
            detection=detection_dict,
            fragments=[],
            aggregated_response=f"Detection complete. Sensitivity: {detection_report.sensitivity_score:.2f}. Recommended strategy: {detection_report.recommended_strategy}. Fragmentation will be implemented in the next phase.",
            privacy_score=0.0,
            total_time=detection_report.processing_time / 1000,  # Convert to seconds
            cost_comparison={
                "fragmented_cost": 0.0,
                "single_provider_cost": 0.0,
                "savings_percentage": 0.0
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


@router.get("/providers", response_model=Dict[str, Dict])
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
                "model": "claude-3-sonnet-20240229",
                "capabilities": ["analysis", "safety"],
                "cost_per_1k_tokens": 0.003,
                "max_context": 200000
            },
            "google": {
                "name": "Google",
                "model": "gemini-1.5-flash",
                "capabilities": ["factual", "cost_efficient"],
                "cost_per_1k_tokens": 0.00075,
                "max_context": 1000000
            }
        }
    }


@router.get("/demo/scenarios", response_model=Dict[str, list])
async def get_demo_scenarios():
    """
    Get pre-configured demo scenarios
    """
    return {
        "scenarios": [
            {
                "name": "Medical Query with PII",
                "query": "My name is John Smith, SSN 123-45-6789. I have diabetes and need dietary advice.",
                "description": "Demonstrates PII detection and anonymization"
            },
            {
                "name": "Business Intelligence",
                "query": "Analyze our Q3 revenue of $2.5M compared to competitors and create a Python visualization",
                "description": "Shows fragmentation of business data and code generation"
            },
            {
                "name": "Technical Debugging",
                "query": "Debug this Python code that processes our customer database and fix the SQL injection vulnerability",
                "description": "Demonstrates code analysis and security review fragmentation"
            }
        ]
    }