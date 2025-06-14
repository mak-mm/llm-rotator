"""
Data models for orchestration components
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Union
from enum import Enum
from datetime import datetime
import uuid

from src.fragmentation.models import FragmentationStrategy, QueryFragment
from src.providers.models import ProviderType, LLMResponse
from src.detection.models import DetectionReport


class ProcessingStage(str, Enum):
    """Stages of query processing"""
    RECEIVED = "received"
    DETECTION = "detection"
    FRAGMENTATION = "fragmentation"
    ROUTING = "routing"
    PROCESSING = "processing"
    AGGREGATION = "aggregation"
    COMPLETED = "completed"
    FAILED = "failed"


class PrivacyLevel(str, Enum):
    """Privacy sensitivity levels"""
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"
    TOP_SECRET = "top_secret"


class OrchestrationConfig(BaseModel):
    """Configuration for query orchestration"""
    
    # Detection settings
    enable_pii_detection: bool = Field(default=True, description="Enable PII detection")
    enable_code_detection: bool = Field(default=True, description="Enable code detection")
    pii_confidence_threshold: float = Field(default=0.8, description="PII confidence threshold")
    
    # Fragmentation settings
    default_strategy: FragmentationStrategy = Field(
        default=FragmentationStrategy.PII_ISOLATION,
        description="Default fragmentation strategy"
    )
    max_fragment_size: int = Field(default=2000, description="Maximum tokens per fragment")
    overlap_tokens: int = Field(default=100, description="Token overlap between fragments")
    
    # Provider routing settings
    enable_privacy_routing: bool = Field(default=True, description="Enable privacy-aware routing")
    sensitive_data_providers: List[ProviderType] = Field(
        default=[ProviderType.ANTHROPIC],
        description="Preferred providers for sensitive data"
    )
    
    # Cost optimization
    enable_cost_optimization: bool = Field(default=True, description="Enable cost optimization")
    max_cost_per_query: float = Field(default=1.0, description="Maximum cost per query in USD")
    
    # Performance settings
    max_concurrent_requests: int = Field(default=10, description="Maximum concurrent requests")
    request_timeout: int = Field(default=120, description="Request timeout in seconds")
    
    class Config:
        validate_assignment = True


class OrchestrationRequest(BaseModel):
    """Request for query orchestration"""
    
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    query: str = Field(..., description="The user query to process")
    user_id: Optional[str] = Field(None, description="User identifier")
    session_id: Optional[str] = Field(None, description="Session identifier")
    
    # Request-specific overrides
    fragmentation_strategy: Optional[FragmentationStrategy] = Field(
        None, description="Override fragmentation strategy"
    )
    preferred_providers: List[ProviderType] = Field(
        default_factory=list, description="Preferred providers for this request"
    )
    privacy_level: PrivacyLevel = Field(
        default=PrivacyLevel.INTERNAL, 
        description="Required privacy level"
    )
    
    # Request metadata
    metadata: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Additional request metadata"
    )
    priority: int = Field(default=5, ge=1, le=10, description="Request priority")
    
    class Config:
        validate_assignment = True


class FragmentProcessingResult(BaseModel):
    """Result of processing a single fragment"""
    
    fragment_id: str = Field(..., description="Fragment identifier")
    provider_id: str = Field(..., description="Provider that processed the fragment")
    response: LLMResponse = Field(..., description="Provider response")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    cost_estimate: float = Field(default=0.0, description="Estimated cost in USD")
    privacy_score: float = Field(default=0.0, description="Privacy handling score")
    
    class Config:
        validate_assignment = True


class OrchestrationResponse(BaseModel):
    """Response from query orchestration"""
    
    request_id: str = Field(..., description="Original request ID")
    aggregated_response: str = Field(..., description="Final aggregated response")
    
    # Processing details
    total_processing_time_ms: float = Field(..., description="Total processing time")
    fragments_processed: int = Field(..., description="Number of fragments processed")
    providers_used: List[str] = Field(..., description="List of providers used")
    
    # Analysis results
    detection_report: DetectionReport = Field(..., description="Detection analysis results")
    fragmentation_strategy: FragmentationStrategy = Field(..., description="Strategy used")
    privacy_level_achieved: PrivacyLevel = Field(..., description="Privacy level achieved")
    
    # Cost and performance metrics
    total_cost_estimate: float = Field(default=0.0, description="Total estimated cost")
    tokens_used: int = Field(default=0, description="Total tokens consumed")
    
    # Fragment details
    fragment_results: List[FragmentProcessingResult] = Field(
        default_factory=list, 
        description="Results from each fragment"
    )
    
    # Metadata
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class OrchestrationMetrics(BaseModel):
    """Metrics for orchestration performance tracking"""
    
    # Request statistics
    total_requests: int = Field(default=0, description="Total requests processed")
    successful_requests: int = Field(default=0, description="Successful requests")
    failed_requests: int = Field(default=0, description="Failed requests")
    
    # Performance metrics
    average_processing_time_ms: float = Field(default=0.0, description="Average processing time")
    average_fragments_per_request: float = Field(default=0.0, description="Average fragments per request")
    average_providers_per_request: float = Field(default=0.0, description="Average providers per request")
    
    # Cost metrics
    total_cost_usd: float = Field(default=0.0, description="Total cost in USD")
    average_cost_per_request: float = Field(default=0.0, description="Average cost per request")
    
    # Privacy metrics
    pii_detections: int = Field(default=0, description="Total PII detections")
    code_detections: int = Field(default=0, description="Total code detections")
    high_sensitivity_requests: int = Field(default=0, description="High sensitivity requests")
    
    # Provider usage
    provider_usage: Dict[str, int] = Field(
        default_factory=dict, 
        description="Usage count by provider"
    )
    
    # Strategy usage
    strategy_usage: Dict[str, int] = Field(
        default_factory=dict,
        description="Usage count by fragmentation strategy"
    )
    
    # Timing
    last_request_time: Optional[datetime] = Field(None, description="Last request timestamp")
    last_reset_time: datetime = Field(default_factory=datetime.utcnow)
    
    def success_rate(self) -> float:
        """Calculate success rate percentage"""
        if self.total_requests == 0:
            return 0.0
        return (self.successful_requests / self.total_requests) * 100.0
    
    def update_metrics(self, response: OrchestrationResponse, success: bool, 
                      processing_time_ms: float):
        """Update metrics with new orchestration data"""
        self.total_requests += 1
        self.last_request_time = datetime.utcnow()
        
        if success:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
            return  # Don't update other metrics for failed requests
        
        # Update processing time
        if self.total_requests == 1:
            self.average_processing_time_ms = processing_time_ms
        else:
            self.average_processing_time_ms = (
                (self.average_processing_time_ms * (self.successful_requests - 1) + processing_time_ms)
                / self.successful_requests
            )
        
        # Update fragment metrics
        if self.successful_requests == 1:
            self.average_fragments_per_request = response.fragments_processed
        else:
            self.average_fragments_per_request = (
                (self.average_fragments_per_request * (self.successful_requests - 1) + 
                 response.fragments_processed) / self.successful_requests
            )
        
        # Update provider metrics
        if self.successful_requests == 1:
            self.average_providers_per_request = len(response.providers_used)
        else:
            self.average_providers_per_request = (
                (self.average_providers_per_request * (self.successful_requests - 1) + 
                 len(response.providers_used)) / self.successful_requests
            )
        
        # Update cost metrics
        self.total_cost_usd += response.total_cost_estimate
        self.average_cost_per_request = self.total_cost_usd / self.successful_requests
        
        # Update privacy metrics
        if response.detection_report.has_pii:
            self.pii_detections += 1
        if response.detection_report.code_detection.has_code:
            self.code_detections += 1
        if response.privacy_level_achieved in [PrivacyLevel.RESTRICTED, PrivacyLevel.TOP_SECRET]:
            self.high_sensitivity_requests += 1
        
        # Update provider usage
        for provider_id in response.providers_used:
            self.provider_usage[provider_id] = self.provider_usage.get(provider_id, 0) + 1
        
        # Update strategy usage
        strategy_name = response.fragmentation_strategy.value
        self.strategy_usage[strategy_name] = self.strategy_usage.get(strategy_name, 0) + 1
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class IntelligenceDecision(BaseModel):
    """Decision made by intelligence components"""
    
    component: str = Field(..., description="Intelligence component that made the decision")
    decision_type: str = Field(..., description="Type of decision")
    recommendation: str = Field(..., description="Recommended action")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Decision confidence")
    reasoning: str = Field(..., description="Explanation of the decision")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        validate_assignment = True