"""
Data models for LLM providers
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from enum import Enum
from datetime import datetime
import uuid


class ProviderType(str, Enum):
    """Supported LLM provider types"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    AZURE_OPENAI = "azure_openai"
    

class ProviderStatus(str, Enum):
    """Provider availability status"""
    AVAILABLE = "available"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"
    RATE_LIMITED = "rate_limited"
    MAINTENANCE = "maintenance"


class ModelCapability(str, Enum):
    """Model capabilities"""
    TEXT_GENERATION = "text_generation"
    CODE_ANALYSIS = "code_analysis"
    SENSITIVE_DATA = "sensitive_data"
    FUNCTION_CALLING = "function_calling"
    VISION = "vision"
    EMBEDDING = "embedding"


class ProviderConfig(BaseModel):
    """Configuration for a specific provider"""
    
    provider_type: ProviderType = Field(..., description="Type of LLM provider")
    api_key: str = Field(..., description="API key for authentication")
    base_url: Optional[str] = Field(None, description="Custom base URL for API")
    model_name: str = Field(..., description="Specific model to use")
    max_tokens: int = Field(default=4000, description="Maximum tokens per request")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Response creativity")
    timeout: int = Field(default=30, description="Request timeout in seconds")
    rate_limit_rpm: int = Field(default=60, description="Requests per minute limit")
    rate_limit_tpm: int = Field(default=10000, description="Tokens per minute limit")
    capabilities: List[ModelCapability] = Field(default_factory=list, description="Model capabilities")
    
    # Provider-specific configurations
    extra_params: Dict[str, Any] = Field(default_factory=dict, description="Provider-specific parameters")
    
    class Config:
        validate_assignment = True


class ProviderMetrics(BaseModel):
    """Metrics for provider performance tracking"""
    
    provider_id: str = Field(..., description="Provider identifier")
    total_requests: int = Field(default=0, description="Total requests made")
    successful_requests: int = Field(default=0, description="Successful requests")
    failed_requests: int = Field(default=0, description="Failed requests")
    average_latency_ms: float = Field(default=0.0, description="Average response latency")
    total_tokens_used: int = Field(default=0, description="Total tokens consumed")
    rate_limit_hits: int = Field(default=0, description="Number of rate limit hits")
    last_request_time: Optional[datetime] = Field(None, description="Timestamp of last request")
    uptime_percentage: float = Field(default=100.0, ge=0.0, le=100.0, description="Uptime percentage")
    
    def success_rate(self) -> float:
        """Calculate success rate percentage"""
        if self.total_requests == 0:
            return 0.0
        return (self.successful_requests / self.total_requests) * 100.0
    
    def update_metrics(self, success: bool, latency_ms: float, tokens_used: int = 0):
        """Update metrics with new request data"""
        self.total_requests += 1
        self.last_request_time = datetime.utcnow()
        
        if success:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
        
        # Update average latency
        if self.total_requests == 1:
            self.average_latency_ms = latency_ms
        else:
            self.average_latency_ms = (
                (self.average_latency_ms * (self.total_requests - 1) + latency_ms) 
                / self.total_requests
            )
        
        self.total_tokens_used += tokens_used


class LLMRequest(BaseModel):
    """Request to an LLM provider"""
    
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prompt: str = Field(..., description="The prompt to send to the LLM")
    fragment_id: Optional[str] = Field(None, description="Associated fragment ID if applicable")
    max_tokens: Optional[int] = Field(None, description="Maximum tokens for this request")
    temperature: Optional[float] = Field(None, description="Temperature override")
    system_prompt: Optional[str] = Field(None, description="System prompt/context")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional request metadata")
    priority: int = Field(default=5, ge=1, le=10, description="Request priority (1=highest, 10=lowest)")
    requires_sensitive_handling: bool = Field(default=False, description="Whether request contains sensitive data")
    
    class Config:
        validate_assignment = True


class LLMResponse(BaseModel):
    """Response from an LLM provider"""
    
    request_id: str = Field(..., description="Original request ID")
    provider_id: str = Field(..., description="Provider that handled the request")
    content: str = Field(..., description="Generated content")
    finish_reason: str = Field(..., description="Why generation stopped")
    tokens_used: int = Field(..., description="Number of tokens consumed")
    latency_ms: float = Field(..., description="Response latency in milliseconds")
    model_used: str = Field(..., description="Actual model that generated the response")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Provider-specific metadata")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ProviderError(Exception):
    """Error response from a provider"""
    
    def __init__(self, request_id: str, provider_id: str, error_type: str, 
                 error_message: str, error_code: Optional[str] = None,
                 is_retryable: bool = True, retry_after: Optional[int] = None):
        """
        Initialize provider error
        
        Args:
            request_id: Original request ID
            provider_id: Provider that failed
            error_type: Type of error
            error_message: Error message
            error_code: Provider-specific error code
            is_retryable: Whether the request can be retried
            retry_after: Seconds to wait before retry
        """
        super().__init__(error_message)
        self.request_id = request_id
        self.provider_id = provider_id
        self.error_type = error_type
        self.error_message = error_message
        self.error_code = error_code
        self.is_retryable = is_retryable
        self.retry_after = retry_after
        self.timestamp = datetime.utcnow()
    
    def __str__(self) -> str:
        return f"ProviderError({self.error_type}): {self.error_message}"
    
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization"""
        return {
            "request_id": self.request_id,
            "provider_id": self.provider_id,
            "error_type": self.error_type,
            "error_message": self.error_message,
            "error_code": self.error_code,
            "is_retryable": self.is_retryable,
            "retry_after": self.retry_after,
            "timestamp": self.timestamp.isoformat()
        }


class ProviderLoadBalancingConfig(BaseModel):
    """Configuration for load balancing across providers"""
    
    strategy: str = Field(default="round_robin", description="Load balancing strategy")
    weights: Dict[str, float] = Field(default_factory=dict, description="Provider weights for weighted strategies")
    failover_enabled: bool = Field(default=True, description="Enable automatic failover")
    health_check_interval: int = Field(default=60, description="Health check interval in seconds")
    circuit_breaker_threshold: int = Field(default=5, description="Consecutive failures before circuit break")
    circuit_breaker_timeout: int = Field(default=300, description="Circuit breaker timeout in seconds")
    
    class Config:
        validate_assignment = True


class ProviderSelectionCriteria(BaseModel):
    """Criteria for selecting the best provider for a request"""
    
    required_capabilities: List[ModelCapability] = Field(default_factory=list)
    preferred_providers: List[ProviderType] = Field(default_factory=list)
    max_latency_ms: Optional[int] = Field(None, description="Maximum acceptable latency")
    min_success_rate: float = Field(default=95.0, description="Minimum required success rate")
    cost_preference: str = Field(default="balanced", description="Cost preference: low, balanced, high")
    privacy_level: str = Field(default="standard", description="Privacy requirement level")
    
    class Config:
        validate_assignment = True


class ProviderHealth(BaseModel):
    """Health status of a provider"""
    
    provider_id: str = Field(..., description="Provider identifier")
    status: ProviderStatus = Field(..., description="Current status")
    last_health_check: datetime = Field(default_factory=datetime.utcnow)
    response_time_ms: Optional[float] = Field(None, description="Latest health check response time")
    error_message: Optional[str] = Field(None, description="Error message if unhealthy")
    consecutive_failures: int = Field(default=0, description="Number of consecutive failures")
    
    def is_healthy(self) -> bool:
        """Check if provider is healthy"""
        return self.status == ProviderStatus.AVAILABLE
    
    def mark_failure(self, error_message: str = None):
        """Mark a failure for this provider"""
        self.consecutive_failures += 1
        self.error_message = error_message
        self.last_health_check = datetime.utcnow()
        
        # Update status based on failure count
        if self.consecutive_failures >= 5:
            self.status = ProviderStatus.UNAVAILABLE
        elif self.consecutive_failures >= 3:
            self.status = ProviderStatus.DEGRADED
    
    def mark_success(self, response_time_ms: float):
        """Mark a successful health check"""
        self.consecutive_failures = 0
        self.status = ProviderStatus.AVAILABLE
        self.response_time_ms = response_time_ms
        self.error_message = None
        self.last_health_check = datetime.utcnow()
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }