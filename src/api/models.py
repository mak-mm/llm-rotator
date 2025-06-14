"""
Pydantic models for API request/response validation
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ProviderType(str, Enum):
    """Supported LLM providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"


class FragmentationStrategy(str, Enum):
    """Fragmentation strategies"""
    SYNTACTIC = "syntactic"
    SEMANTIC = "semantic"
    HYBRID = "hybrid"
    RULE_BASED = "rule_based"


class QueryRequest(BaseModel):
    """Request model for query analysis"""
    query: str = Field(..., min_length=1, max_length=10000, description="User query to be fragmented")
    strategy: Optional[FragmentationStrategy] = Field(
        None,
        description="Fragmentation strategy to use (auto-selected if not provided)"
    )
    use_orchestrator: Optional[bool] = Field(
        None,
        description="Force orchestrator usage (auto-determined if not provided)"
    )
    
    @validator('query')
    def validate_query(cls, v):
        if not v.strip():
            raise ValueError("Query cannot be empty or only whitespace")
        return v.strip()


class DetectionResult(BaseModel):
    """Detection analysis results"""
    has_pii: bool = Field(..., description="Whether PII was detected")
    pii_entities: List[Dict[str, Any]] = Field(default_factory=list, description="Detected PII entities")
    has_code: bool = Field(..., description="Whether code was detected")
    code_language: Optional[str] = Field(None, description="Detected programming language")
    entities: List[Dict[str, Any]] = Field(default_factory=list, description="Named entities detected")
    sensitivity_score: float = Field(..., ge=0.0, le=1.0, description="Overall sensitivity score")


class Fragment(BaseModel):
    """Query fragment"""
    id: str = Field(..., description="Unique fragment identifier")
    content: str = Field(..., description="Fragment content")
    provider: ProviderType = Field(..., description="Assigned provider")
    anonymized: bool = Field(False, description="Whether fragment was anonymized")
    context_percentage: float = Field(..., ge=0.0, le=1.0, description="Percentage of original context")


class FragmentResponse(BaseModel):
    """Response from a fragment query"""
    fragment_id: str = Field(..., description="Fragment identifier")
    provider: ProviderType = Field(..., description="Provider that processed the fragment")
    response: str = Field(..., description="Provider's response")
    processing_time: float = Field(..., description="Time taken to process (seconds)")
    tokens_used: Optional[int] = Field(None, description="Tokens consumed")


class AnalysisResponse(BaseModel):
    """Complete analysis response"""
    request_id: str = Field(..., description="Unique request identifier")
    original_query: str = Field(..., description="Original user query")
    detection: DetectionResult = Field(..., description="Detection analysis results")
    fragments: List[Fragment] = Field(..., description="Query fragments")
    aggregated_response: str = Field(..., description="Final aggregated response")
    privacy_score: float = Field(..., ge=0.0, le=1.0, description="Privacy preservation score")
    total_time: float = Field(..., description="Total processing time (seconds)")
    cost_comparison: Dict[str, float] = Field(..., description="Cost comparison data")
    
    class Config:
        json_schema_extra = {
            "example": {
                "request_id": "req_12345",
                "original_query": "What is the weather in Paris?",
                "detection": {
                    "has_pii": False,
                    "pii_entities": [],
                    "has_code": False,
                    "code_language": None,
                    "entities": [{"text": "Paris", "label": "LOC"}],
                    "sensitivity_score": 0.2
                },
                "fragments": [
                    {
                        "id": "frag_1",
                        "content": "current weather conditions",
                        "provider": "gemini",
                        "anonymized": False,
                        "context_percentage": 0.3
                    },
                    {
                        "id": "frag_2",
                        "content": "location: major European city",
                        "provider": "openai",
                        "anonymized": True,
                        "context_percentage": 0.3
                    }
                ],
                "aggregated_response": "The weather in Paris is currently...",
                "privacy_score": 0.85,
                "total_time": 1.2,
                "cost_comparison": {
                    "fragmented_cost": 0.002,
                    "single_provider_cost": 0.008,
                    "savings_percentage": 75.0
                }
            }
        }


class StatusResponse(BaseModel):
    """Processing status response"""
    request_id: str
    status: str = Field(..., description="Processing status: pending, processing, completed, failed")
    progress: float = Field(..., ge=0.0, le=1.0, description="Processing progress")
    message: Optional[str] = Field(None, description="Status message")
    created_at: datetime
    updated_at: datetime


class VisualizationData(BaseModel):
    """Data for UI visualization"""
    request_id: str
    fragments: List[Fragment]
    fragment_responses: List[FragmentResponse]
    timeline: List[Dict[str, Any]] = Field(..., description="Processing timeline events")
    privacy_metrics: Dict[str, Any] = Field(..., description="Privacy preservation metrics")


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    request_id: Optional[str] = Field(None, description="Request ID if applicable")