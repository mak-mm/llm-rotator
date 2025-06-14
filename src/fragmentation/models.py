"""
Data models for query fragmentation
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
import uuid
from datetime import datetime


class FragmentationStrategy(Enum):
    """Enumeration of available fragmentation strategies"""
    
    NONE = "none"
    PII_ISOLATION = "pii_isolation"
    CODE_ISOLATION = "code_isolation"
    SEMANTIC_SPLIT = "semantic_split"
    MAXIMUM_ISOLATION = "maximum_isolation"
    LENGTH_BASED = "length_based"
    
    def __str__(self) -> str:
        return self.value


class FragmentationType(Enum):
    """Types of query fragments"""
    
    GENERAL = "general"
    PII = "pii"
    CODE = "code"
    SEMANTIC = "semantic"


class QueryFragment(BaseModel):
    """Represents a fragment of a query"""
    
    fragment_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str = Field(..., description="The fragment content")
    fragment_type: FragmentationType = Field(default=FragmentationType.GENERAL, description="Type of fragment")
    contains_sensitive_data: bool = Field(default=False, description="Whether fragment contains sensitive data")
    provider_hint: Optional[str] = Field(None, description="Suggested LLM provider for this fragment")
    order: int = Field(default=0, description="Order position in the original query")
    context_references: List[str] = Field(default_factory=list, description="Referenced fragment IDs for context")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional fragment metadata")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class FragmentationResult(BaseModel):
    """Result of query fragmentation"""
    
    original_query: str = Field(..., description="The original query text")
    fragments: List[QueryFragment] = Field(default_factory=list, description="List of query fragments")
    strategy_used: str = Field(..., description="Fragmentation strategy that was applied")
    total_fragments: int = Field(default=0, description="Total number of fragments created")
    sensitive_fragment_count: int = Field(default=0, description="Number of fragments containing sensitive data")
    fragmentation_metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata about fragmentation")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When fragmentation was performed")
    
    def __init__(self, **data):
        super().__init__(**data)
        # Auto-calculate derived fields
        self.total_fragments = len(self.fragments)
        self.sensitive_fragment_count = sum(1 for f in self.fragments if f.contains_sensitive_data)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class FragmentationConfig(BaseModel):
    """Configuration for fragmentation behavior"""
    
    strategy: FragmentationStrategy = Field(default=FragmentationStrategy.PII_ISOLATION, description="Fragmentation strategy")
    max_fragment_size: int = Field(default=2000, description="Maximum tokens per fragment")
    min_fragment_size: int = Field(default=50, description="Minimum tokens per fragment")
    overlap_tokens: int = Field(default=100, description="Token overlap between fragments")
    preserve_code_blocks: bool = Field(default=True, description="Keep code blocks intact")
    preserve_pii_context: bool = Field(default=False, description="Keep minimal context around PII")
    high_sensitivity_threshold: float = Field(default=0.8, description="Threshold for maximum isolation")
    enable_semantic_chunking: bool = Field(default=True, description="Use semantic boundaries for splitting")
    
    class Config:
        validate_assignment = True


class FragmentationRequest(BaseModel):
    """Request for query fragmentation"""
    
    query: str = Field(..., description="Query text to fragment")
    config: Optional[FragmentationConfig] = Field(None, description="Custom fragmentation configuration")
    force_strategy: Optional[FragmentationStrategy] = Field(None, description="Force use of specific strategy")
    provider_preferences: Dict[str, float] = Field(default_factory=dict, description="Provider preference weights")
    
    class Config:
        use_enum_values = True


class ReassemblyInstruction(BaseModel):
    """Instructions for reassembling fragment responses"""
    
    fragment_id: str = Field(..., description="ID of the fragment this applies to")
    reassembly_order: int = Field(..., description="Order for reassembly")
    requires_post_processing: bool = Field(default=False, description="Whether response needs post-processing")
    merge_strategy: str = Field(default="concatenate", description="How to merge this fragment's response")
    context_needed: List[str] = Field(default_factory=list, description="Fragment IDs needed for context")
    
    class Config:
        validate_assignment = True


class FragmentationMetrics(BaseModel):
    """Metrics about fragmentation performance"""
    
    fragmentation_time_ms: float = Field(..., description="Time taken to fragment query")
    detection_time_ms: float = Field(..., description="Time taken for sensitivity detection")
    strategy_selection_time_ms: float = Field(..., description="Time taken to select strategy")
    total_processing_time_ms: float = Field(..., description="Total processing time")
    
    fragments_created: int = Field(..., description="Number of fragments created")
    sensitive_data_isolated: bool = Field(..., description="Whether sensitive data was properly isolated")
    privacy_preservation_score: float = Field(..., description="Score indicating privacy preservation effectiveness")
    
    class Config:
        validate_assignment = True