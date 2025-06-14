"""
Core query fragmentation logic
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import time

from src.detection.engine import DetectionEngine
from src.detection.models import DetectionReport
from src.fragmentation.models import (
    QueryFragment, FragmentationResult, FragmentationStrategy, FragmentationType,
    FragmentationConfig, FragmentationRequest, FragmentationMetrics
)

logger = logging.getLogger(__name__)


class QueryFragmenter:
    """
    Core class responsible for fragmenting queries based on sensitivity analysis
    """
    
    def __init__(self, config: Optional[FragmentationConfig] = None):
        """
        Initialize the query fragmenter
        
        Args:
            config: Configuration for fragmentation behavior
        """
        self.config = config or FragmentationConfig()
        self.detection_engine = DetectionEngine()
        
        # Available fragmentation strategies
        self.strategies = {
            FragmentationStrategy.NONE: self._no_fragmentation,
            FragmentationStrategy.PII_ISOLATION: self._pii_isolation_strategy,
            FragmentationStrategy.CODE_ISOLATION: self._code_isolation_strategy,
            FragmentationStrategy.SEMANTIC_SPLIT: self._semantic_split_strategy,
            FragmentationStrategy.MAXIMUM_ISOLATION: self._maximum_isolation_strategy,
            FragmentationStrategy.LENGTH_BASED: self._length_based_strategy,
        }
        
        logger.info(f"QueryFragmenter initialized with {len(self.strategies)} strategies")
    
    def fragment_query(self, query: str, config: Optional[FragmentationConfig] = None) -> FragmentationResult:
        """
        Fragment a query based on its sensitivity analysis
        
        Args:
            query: The query text to fragment
            config: Optional custom configuration
            
        Returns:
            FragmentationResult containing fragments and metadata
            
        Raises:
            ValueError: If query is empty or invalid
        """
        start_time = time.time()
        
        # Validate input
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")
        
        query = query.strip()
        effective_config = config or self.config
        
        try:
            # Step 1: Detect sensitive content
            detection_start = time.time()
            detection_report = self.detection_engine.detect(query)
            detection_time = (time.time() - detection_start) * 1000
            
            # Step 2: Select fragmentation strategy
            strategy_start = time.time()
            strategy = self._get_fragmentation_strategy(detection_report, len(query))
            strategy_time = (time.time() - strategy_start) * 1000
            
            # Step 3: Apply fragmentation strategy
            fragmentation_start = time.time()
            fragments = self.strategies[strategy](query, detection_report, effective_config)
            fragmentation_time = (time.time() - fragmentation_start) * 1000
            
            # Step 4: Create result
            total_time = (time.time() - start_time) * 1000
            
            result = FragmentationResult(
                original_query=query,
                fragments=fragments,
                strategy_used=str(strategy),
                fragmentation_metadata={
                    "detection_report": detection_report.dict(),
                    "config_used": effective_config.dict(),
                    "metrics": FragmentationMetrics(
                        fragmentation_time_ms=fragmentation_time,
                        detection_time_ms=detection_time,
                        strategy_selection_time_ms=strategy_time,
                        total_processing_time_ms=total_time,
                        fragments_created=len(fragments),
                        sensitive_data_isolated=any(f.contains_sensitive_data for f in fragments),
                        privacy_preservation_score=self._calculate_privacy_score(detection_report, fragments)
                    ).dict()
                }
            )
            
            logger.info(f"Query fragmented using {strategy} strategy: {len(fragments)} fragments created")
            return result
            
        except Exception as e:
            logger.error(f"Error fragmenting query: {str(e)}")
            raise
    
    def fragment_request(self, request: FragmentationRequest) -> FragmentationResult:
        """
        Fragment a query from a structured request
        
        Args:
            request: FragmentationRequest with query and configuration
            
        Returns:
            FragmentationResult
        """
        if request.force_strategy:
            # Override strategy selection if forced
            fragments = self.strategies[request.force_strategy](
                request.query, 
                self.detection_engine.detect(request.query),
                request.config or self.config
            )
            
            return FragmentationResult(
                original_query=request.query,
                fragments=fragments,
                strategy_used=str(request.force_strategy),
                fragmentation_metadata={"forced_strategy": True}
            )
        
        return self.fragment_query(request.query, request.config)
    
    def _get_fragmentation_strategy(self, detection_report: DetectionReport, query_length: Optional[int] = None) -> FragmentationStrategy:
        """
        Select the appropriate fragmentation strategy based on detection results
        
        Args:
            detection_report: Results from sensitivity detection
            query_length: Optional length of the original query
            
        Returns:
            Selected FragmentationStrategy
        """
        # High sensitivity - maximum isolation
        if detection_report.sensitivity_score >= self.config.high_sensitivity_threshold:
            return FragmentationStrategy.MAXIMUM_ISOLATION
        
        # Code detected - isolate code blocks
        if detection_report.code_detection.has_code:
            return FragmentationStrategy.CODE_ISOLATION
        
        # PII detected - isolate PII
        if detection_report.has_pii:
            return FragmentationStrategy.PII_ISOLATION
        
        # Sensitive entities - semantic split
        if detection_report.named_entities:
            return FragmentationStrategy.SEMANTIC_SPLIT
        
        # Very long query - length-based fragmentation
        if query_length and query_length > self.config.max_fragment_size:
            return FragmentationStrategy.LENGTH_BASED
        
        # No sensitive data detected
        return FragmentationStrategy.NONE
    
    def _no_fragmentation(self, query: str, detection_report: DetectionReport, 
                         config: FragmentationConfig) -> List[QueryFragment]:
        """No fragmentation - return single fragment"""
        return [self._create_fragment(
            content=query,
            fragment_type=FragmentationType.GENERAL,
            contains_sensitive_data=False,
            order_index=0
        )]
    
    def _pii_isolation_strategy(self, query: str, detection_report: DetectionReport,
                              config: FragmentationConfig) -> List[QueryFragment]:
        """Isolate PII into separate fragments"""
        fragments = []
        
        if not detection_report.pii_entities:
            # No PII found, return as single fragment
            return [self._create_fragment(
                content=query,
                fragment_type=FragmentationType.GENERAL,
                contains_sensitive_data=False,
                order_index=0
            )]
        
        # Create a simple redaction by replacing PII with placeholders
        redacted_text = query
        order_index = 0
        
        # Sort PII entities by start position (reverse order for replacement)
        sorted_entities = sorted(detection_report.pii_entities, key=lambda x: x.start, reverse=True)
        
        # Replace PII with placeholders
        for entity in sorted_entities:
            placeholder = f"<{entity.type.value}>"
            redacted_text = redacted_text[:entity.start] + placeholder + redacted_text[entity.end:]
        
        # Create fragment with redacted text (non-sensitive)
        fragments.append(self._create_fragment(
            content=redacted_text,
            fragment_type=FragmentationType.GENERAL,
            contains_sensitive_data=False,
            order_index=order_index,
            metadata={"is_redacted": True}
        ))
        order_index += 1
        
        # Create separate fragments for each PII entity
        for entity in detection_report.pii_entities:
            placeholder = f"<{entity.type.value}>"
            fragments.append(self._create_fragment(
                content=f"Replace {placeholder} with: {entity.text}",
                fragment_type=FragmentationType.PII,
                contains_sensitive_data=True,
                order_index=order_index,
                provider_hint="claude",  # Claude for sensitive data
                metadata={"placeholder": placeholder, "entity_type": entity.type.value}
            ))
            order_index += 1
        
        return fragments
    
    def _code_isolation_strategy(self, query: str, detection_report: DetectionReport,
                               config: FragmentationConfig) -> List[QueryFragment]:
        """Isolate code blocks into separate fragments"""
        fragments = []
        
        if not detection_report.code_detection or not detection_report.code_detection.code_blocks:
            # No code found, return as single fragment
            return [self._create_fragment(
                content=query,
                fragment_type=FragmentationType.GENERAL,
                contains_sensitive_data=False,
                order_index=0
            )]
        
        # Sort code blocks by start position
        code_blocks = sorted(detection_report.code_detection.code_blocks, key=lambda x: x["start"])
        
        order_index = 0
        last_end = 0
        
        for block in code_blocks:
            start, end = block["start"], block["end"]
            
            # Add text before code block
            if start > last_end:
                text_content = query[last_end:start].strip()
                if text_content:
                    fragments.append(self._create_fragment(
                        content=text_content,
                        fragment_type=FragmentationType.GENERAL,
                        contains_sensitive_data=False,
                        order_index=order_index
                    ))
                    order_index += 1
            
            # Add code block
            fragments.append(self._create_fragment(
                content=block["content"],
                fragment_type=FragmentationType.CODE,
                contains_sensitive_data=True,  # Code is considered sensitive
                order_index=order_index,
                provider_hint="claude",  # Claude for code analysis
                metadata={
                    "language": block.get("language"),
                    "confidence": block.get("confidence", 0.0)
                }
            ))
            order_index += 1
            last_end = end
        
        # Add remaining text after last code block
        if last_end < len(query):
            remaining_text = query[last_end:].strip()
            if remaining_text:
                fragments.append(self._create_fragment(
                    content=remaining_text,
                    fragment_type=FragmentationType.GENERAL,
                    contains_sensitive_data=False,
                    order_index=order_index
                ))
        
        return fragments
    
    def _semantic_split_strategy(self, query: str, detection_report: DetectionReport,
                               config: FragmentationConfig) -> List[QueryFragment]:
        """Split query at semantic boundaries"""
        fragments = []
        
        # Simple sentence-based splitting for now
        sentences = re.split(r'[.!?]+', query)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        for i, sentence in enumerate(sentences):
            # Check if this sentence contains sensitive entities
            contains_sensitive = False
            if detection_report.named_entities:
                for entity in detection_report.named_entities:
                    if entity.text.lower() in sentence.lower():
                        contains_sensitive = True
                        break
            
            fragments.append(self._create_fragment(
                content=sentence,
                fragment_type=FragmentationType.SEMANTIC,
                contains_sensitive_data=contains_sensitive,
                order_index=i,
                provider_hint="claude" if contains_sensitive else None
            ))
        
        return fragments
    
    def _maximum_isolation_strategy(self, query: str, detection_report: DetectionReport,
                                  config: FragmentationConfig) -> List[QueryFragment]:
        """Maximum fragmentation for high sensitivity queries"""
        fragments = []
        
        # Combine PII and code isolation strategies
        if detection_report.code_detection.has_code:
            code_fragments = self._code_isolation_strategy(query, detection_report, config)
            # Further fragment text portions if they contain PII
            for fragment in code_fragments:
                if fragment.fragment_type == "text" and detection_report.has_pii:
                    # Re-analyze this text fragment for PII
                    text_detection = self.detection_engine.detect(fragment.content)
                    if text_detection.has_pii:
                        pii_fragments = self._pii_isolation_strategy(
                            fragment.content, text_detection, config
                        )
                        # Update order indices
                        for pii_frag in pii_fragments:
                            pii_frag.order_index = len(fragments)
                            fragments.append(pii_frag)
                    else:
                        fragments.append(fragment)
                else:
                    fragments.append(fragment)
        elif detection_report.has_pii:
            fragments = self._pii_isolation_strategy(query, detection_report, config)
        else:
            # Fall back to semantic splitting
            fragments = self._semantic_split_strategy(query, detection_report, config)
        
        # Further split if fragments are too long
        final_fragments = []
        for fragment in fragments:
            if len(fragment.content) > config.max_fragment_size:
                sub_fragments = self._split_by_length(
                    fragment.content, 
                    config.max_fragment_size,
                    fragment.contains_sensitive_data,
                    fragment.fragment_type
                )
                final_fragments.extend(sub_fragments)
            else:
                final_fragments.append(fragment)
        
        return final_fragments
    
    def _length_based_strategy(self, query: str, detection_report: DetectionReport,
                             config: FragmentationConfig) -> List[QueryFragment]:
        """Split query based on length limits"""
        return self._split_by_length(query, config.max_fragment_size, False, FragmentationType.GENERAL)
    
    def _split_by_length(self, text: str, max_length: int, contains_sensitive: bool,
                        fragment_type: FragmentationType) -> List[QueryFragment]:
        """Split text into chunks based on length"""
        fragments = []
        
        if len(text) <= max_length:
            return [self._create_fragment(
                content=text,
                fragment_type=fragment_type,
                contains_sensitive_data=contains_sensitive,
                order_index=0
            )]
        
        # Split preserving word boundaries
        words = text.split()
        current_chunk = []
        current_length = 0
        order_index = 0
        
        for word in words:
            word_length = len(word) + 1  # +1 for space
            
            if current_length + word_length > max_length and current_chunk:
                # Create fragment from current chunk
                chunk_text = ' '.join(current_chunk)
                fragments.append(self._create_fragment(
                    content=chunk_text,
                    fragment_type=fragment_type,
                    contains_sensitive_data=contains_sensitive,
                    order_index=order_index
                ))
                
                current_chunk = [word]
                current_length = len(word)
                order_index += 1
            else:
                current_chunk.append(word)
                current_length += word_length
        
        # Add remaining chunk
        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            fragments.append(self._create_fragment(
                content=chunk_text,
                fragment_type=fragment_type,
                contains_sensitive_data=contains_sensitive,
                order_index=order_index
            ))
        
        return fragments
    
    def _create_fragment(self, content: str, fragment_type: FragmentationType = FragmentationType.GENERAL,
                        contains_sensitive_data: bool = False,
                        provider_hint: Optional[str] = None,
                        order_index: int = 0,
                        metadata: Optional[Dict[str, Any]] = None) -> QueryFragment:
        """Create a QueryFragment with the given parameters"""
        return QueryFragment(
            content=content,
            fragment_type=fragment_type,
            contains_sensitive_data=contains_sensitive_data,
            provider_hint=provider_hint,
            order_index=order_index,
            metadata=metadata or {}
        )
    
    def _calculate_privacy_score(self, detection_report: DetectionReport, 
                               fragments: List[QueryFragment]) -> float:
        """
        Calculate a privacy preservation score based on fragmentation effectiveness
        
        Args:
            detection_report: Original detection results
            fragments: Created fragments
            
        Returns:
            Privacy score between 0.0 and 1.0
        """
        if detection_report.sensitivity_score == 0.0:
            return 1.0  # Perfect score for non-sensitive queries
        
        # Base score
        score = 0.5
        
        # Bonus for isolating sensitive data
        sensitive_fragments = [f for f in fragments if f.contains_sensitive_data]
        if sensitive_fragments and detection_report.sensitivity_score > 0:
            isolation_ratio = len(sensitive_fragments) / len(fragments)
            if isolation_ratio < 0.5:  # Most fragments are non-sensitive
                score += 0.3
        
        # Bonus for using appropriate provider hints
        claude_hints = sum(1 for f in fragments if f.provider_hint == "claude" and f.contains_sensitive_data)
        if claude_hints > 0:
            score += 0.2
        
        return min(score, 1.0)