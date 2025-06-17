"""
State management models
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class RequestStatus(str, Enum):
    """Request processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class RequestState(BaseModel):
    """Complete request state"""
    request_id: str
    status: RequestStatus
    progress: float = Field(0.0, ge=0.0, le=1.0)
    message: Optional[str] = None

    # Original request
    original_query: str
    strategy: Optional[str] = None
    use_orchestrator: bool = False

    # Detection results
    detection_results: Optional[Dict[str, Any]] = None

    # Fragmentation plan
    fragments: List[Dict[str, Any]] = Field(default_factory=list)

    # Provider responses
    fragment_responses: List[Dict[str, Any]] = Field(default_factory=list)

    # Final result
    aggregated_response: Optional[str] = None
    privacy_score: Optional[float] = None
    total_time: Optional[float] = None
    cost_comparison: Optional[Dict[str, float]] = None

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Timeline for visualization
    timeline_events: List[Dict[str, Any]] = Field(default_factory=list)

    def add_timeline_event(self, event_type: str, description: str, metadata: Optional[dict] = None):
        """Add an event to the processing timeline"""
        self.timeline_events.append({
            "timestamp": datetime.utcnow().isoformat(),
            "type": event_type,
            "description": description,
            "metadata": metadata or {}
        })
        self.updated_at = datetime.utcnow()


class CacheEntry(BaseModel):
    """Cache entry for fragment responses"""
    fragment_hash: str
    response: str
    provider: str
    tokens_used: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    hit_count: int = 0


class ProviderMetrics(BaseModel):
    """Provider usage metrics"""
    provider: str
    request_count: int = 0
    total_tokens: int = 0
    total_cost: float = 0.0
    average_latency: float = 0.0
    error_count: int = 0
    last_used: datetime | None = None
