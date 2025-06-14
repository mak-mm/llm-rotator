"""
Response aggregation and reassembly logic
"""

import logging
import re
from typing import List, Dict, Optional, Tuple
from datetime import datetime

from src.orchestrator.models import FragmentProcessingResult, OrchestrationRequest
from src.fragmentation.models import QueryFragment, FragmentationType

logger = logging.getLogger(__name__)


class ResponseAggregator:
    """
    Aggregates and reassembles responses from multiple LLM fragments
    """
    
    def __init__(self):
        """Initialize the response aggregator"""
        self.aggregation_strategies = {
            "sequential": self._sequential_aggregation,
            "contextual": self._contextual_aggregation,
            "pii_reassembly": self._pii_reassembly,
            "code_reassembly": self._code_reassembly,
            "semantic_merge": self._semantic_merge
        }
    
    async def aggregate_responses(
        self,
        fragment_results: List[FragmentProcessingResult],
        original_fragments: List[QueryFragment],
        request: OrchestrationRequest
    ) -> str:
        """
        Aggregate responses from multiple fragments into a coherent response
        
        Args:
            fragment_results: Results from processing each fragment
            original_fragments: Original fragments that were processed
            request: Original orchestration request
            
        Returns:
            Aggregated response text
        """
        try:
            logger.info(f"Aggregating {len(fragment_results)} fragment responses")
            
            # Sort fragments by their original order
            sorted_results = self._sort_fragments_by_order(fragment_results, original_fragments)
            
            # Determine the best aggregation strategy
            strategy = self._select_aggregation_strategy(original_fragments, request)
            
            # Apply the selected strategy
            aggregated_response = await self.aggregation_strategies[strategy](
                sorted_results, original_fragments, request
            )
            
            # Post-process the aggregated response
            final_response = self._post_process_response(aggregated_response, request)
            
            logger.info(f"Successfully aggregated response using {strategy} strategy")
            return final_response
            
        except Exception as e:
            logger.error(f"Failed to aggregate responses: {str(e)}")
            # Fallback: simple concatenation
            return self._fallback_aggregation(fragment_results)
    
    def _sort_fragments_by_order(
        self,
        fragment_results: List[FragmentProcessingResult],
        original_fragments: List[QueryFragment]
    ) -> List[Tuple[FragmentProcessingResult, QueryFragment]]:
        """Sort fragment results by their original order"""
        
        # Create a mapping from fragment ID to original fragment
        fragment_map = {frag.fragment_id: frag for frag in original_fragments}
        
        # Sort results by fragment order
        sorted_pairs = []
        for result in fragment_results:
            if result.fragment_id in fragment_map:
                original_fragment = fragment_map[result.fragment_id]
                sorted_pairs.append((result, original_fragment))
        
        # Sort by fragment order
        sorted_pairs.sort(key=lambda x: x[1].order)
        
        return sorted_pairs
    
    def _select_aggregation_strategy(
        self,
        fragments: List[QueryFragment],
        request: OrchestrationRequest
    ) -> str:
        """Select the best aggregation strategy based on fragment types"""
        
        fragment_types = {frag.fragment_type for frag in fragments}
        
        # If we have PII fragments, use PII reassembly
        if FragmentationType.PII in fragment_types:
            return "pii_reassembly"
        
        # If we have code fragments, use code reassembly
        if FragmentationType.CODE in fragment_types:
            return "code_reassembly"
        
        # If we have semantic fragments, use semantic merge
        if FragmentationType.SEMANTIC in fragment_types:
            return "semantic_merge"
        
        # If fragments have context relationships, use contextual
        if any(frag.context_references for frag in fragments):
            return "contextual"
        
        # Default to sequential
        return "sequential"
    
    async def _sequential_aggregation(
        self,
        sorted_results: List[Tuple[FragmentProcessingResult, QueryFragment]],
        original_fragments: List[QueryFragment],
        request: OrchestrationRequest
    ) -> str:
        """Simple sequential concatenation of responses"""
        
        responses = []
        for result, fragment in sorted_results:
            response_text = result.response.content.strip()
            if response_text:
                responses.append(response_text)
        
        return "\\n\\n".join(responses)
    
    async def _contextual_aggregation(
        self,
        sorted_results: List[Tuple[FragmentProcessingResult, QueryFragment]],
        original_fragments: List[QueryFragment],
        request: OrchestrationRequest
    ) -> str:
        """Contextual aggregation considering fragment relationships"""
        
        response_sections = {}
        
        # Process each fragment response
        for result, fragment in sorted_results:
            response_text = result.response.content.strip()
            
            # If fragment has context references, try to merge intelligently
            if fragment.context_references:
                # Find referenced sections and create connections
                for ref_id in fragment.context_references:
                    if ref_id in response_sections:
                        # Create a contextual bridge
                        bridge_text = self._create_context_bridge(
                            response_sections[ref_id], response_text
                        )
                        response_text = bridge_text
            
            response_sections[fragment.fragment_id] = response_text
        
        # Reassemble in order
        final_parts = []
        for result, fragment in sorted_results:
            if fragment.fragment_id in response_sections:
                final_parts.append(response_sections[fragment.fragment_id])
        
        return "\\n\\n".join(final_parts)
    
    async def _pii_reassembly(
        self,
        sorted_results: List[Tuple[FragmentProcessingResult, QueryFragment]],
        original_fragments: List[QueryFragment],
        request: OrchestrationRequest
    ) -> str:
        """Reassemble responses while properly handling PII placeholders"""
        
        aggregated_text = ""
        pii_mappings = {}
        
        for result, fragment in sorted_results:
            response_text = result.response.content.strip()
            
            if fragment.fragment_type == FragmentationType.PII:
                # This fragment contains PII placeholders that need to be restored
                pii_mappings.update(fragment.metadata.get("pii_mappings", {}))
                
                # For PII fragments, we might want to keep them redacted
                # or restore them based on privacy settings
                if request.privacy_level.value in ["public", "internal"]:
                    # Keep PII redacted for lower privacy levels
                    aggregated_text += response_text
                else:
                    # Restore PII for higher privacy levels
                    restored_text = self._restore_pii_placeholders(response_text, pii_mappings)
                    aggregated_text += restored_text
            else:
                # Regular fragment
                aggregated_text += response_text
            
            aggregated_text += "\\n\\n"
        
        return aggregated_text.strip()
    
    async def _code_reassembly(
        self,
        sorted_results: List[Tuple[FragmentProcessingResult, QueryFragment]],
        original_fragments: List[QueryFragment],
        request: OrchestrationRequest
    ) -> str:
        """Reassemble responses containing code fragments"""
        
        code_blocks = []
        text_blocks = []
        
        for result, fragment in sorted_results:
            response_text = result.response.content.strip()
            
            if fragment.fragment_type == FragmentationType.CODE:
                # Extract and preserve code structure
                code_sections = self._extract_code_sections(response_text)
                code_blocks.extend(code_sections)
            else:
                # Regular text
                text_blocks.append(response_text)
        
        # Reassemble with proper code formatting
        final_response = ""
        
        # Add text sections first
        if text_blocks:
            final_response += "\\n\\n".join(text_blocks)
            final_response += "\\n\\n"
        
        # Add code sections with proper formatting
        if code_blocks:
            final_response += "\\n\\n".join(code_blocks)
        
        return final_response.strip()
    
    async def _semantic_merge(
        self,
        sorted_results: List[Tuple[FragmentProcessingResult, QueryFragment]],
        original_fragments: List[QueryFragment],
        request: OrchestrationRequest
    ) -> str:
        """Semantically merge related fragment responses"""
        
        # Group fragments by semantic similarity
        semantic_groups = self._group_by_semantic_similarity(sorted_results)
        
        merged_sections = []
        for group in semantic_groups:
            if len(group) == 1:
                # Single fragment
                result, fragment = group[0]
                merged_sections.append(result.response.content.strip())
            else:
                # Multiple related fragments - merge them
                group_responses = [result.response.content.strip() for result, fragment in group]
                merged_section = self._merge_related_responses(group_responses)
                merged_sections.append(merged_section)
        
        return "\\n\\n".join(merged_sections)
    
    def _create_context_bridge(self, previous_text: str, current_text: str) -> str:
        """Create a contextual bridge between two text sections"""
        
        # Simple approach: look for common themes or transitions
        if current_text.lower().startswith(("however", "but", "on the other hand")):
            return current_text
        elif current_text.lower().startswith(("additionally", "furthermore", "also")):
            return current_text
        else:
            # Add a smooth transition
            return f"Building on the previous point, {current_text.lower()}"
    
    def _restore_pii_placeholders(self, text: str, pii_mappings: Dict[str, str]) -> str:
        """Restore PII placeholders with original values"""
        
        restored_text = text
        for placeholder, original_value in pii_mappings.items():
            restored_text = restored_text.replace(placeholder, original_value)
        
        return restored_text
    
    def _extract_code_sections(self, text: str) -> List[str]:
        """Extract code sections from response text"""
        
        # Look for code blocks (markdown format)
        code_pattern = r"```(?:\\w+)?\\n(.*?)\\n```"
        code_blocks = re.findall(code_pattern, text, re.DOTALL)
        
        # Also look for inline code
        inline_pattern = r"`([^`]+)`"
        inline_code = re.findall(inline_pattern, text)
        
        all_code = []
        
        # Add code blocks with proper formatting
        for block in code_blocks:
            all_code.append(f"```\\n{block}\\n```")
        
        # Add inline code if no blocks found
        if not code_blocks and inline_code:
            all_code.extend([f"`{code}`" for code in inline_code])
        
        return all_code if all_code else [text]
    
    def _group_by_semantic_similarity(
        self,
        sorted_results: List[Tuple[FragmentProcessingResult, QueryFragment]]
    ) -> List[List[Tuple[FragmentProcessingResult, QueryFragment]]]:
        """Group fragments by semantic similarity"""
        
        # Simple approach: group consecutive fragments of the same type
        groups = []
        current_group = []
        current_type = None
        
        for result, fragment in sorted_results:
            if fragment.fragment_type != current_type:
                if current_group:
                    groups.append(current_group)
                current_group = [(result, fragment)]
                current_type = fragment.fragment_type
            else:
                current_group.append((result, fragment))
        
        if current_group:
            groups.append(current_group)
        
        return groups
    
    def _merge_related_responses(self, responses: List[str]) -> str:
        """Merge semantically related responses"""
        
        # Simple merge: combine with transitions
        if len(responses) == 1:
            return responses[0]
        
        merged = responses[0]
        for i, response in enumerate(responses[1:], 1):
            # Add transition words
            if i == len(responses) - 1:
                merged += f"\\n\\nFinally, {response}"
            else:
                merged += f"\\n\\nAdditionally, {response}"
        
        return merged
    
    def _post_process_response(self, response: str, request: OrchestrationRequest) -> str:
        """Post-process the aggregated response"""
        
        # Clean up multiple newlines
        cleaned = re.sub(r"\\n{3,}", "\\n\\n", response)
        
        # Remove redundant phrases
        cleaned = re.sub(r"\\b(Additionally|Furthermore|Also),\\s+", "", cleaned)
        
        # Ensure proper capitalization
        sentences = cleaned.split(". ")
        capitalized = [sent.capitalize() if sent and sent[0].islower() else sent for sent in sentences]
        cleaned = ". ".join(capitalized)
        
        return cleaned.strip()
    
    def _fallback_aggregation(self, fragment_results: List[FragmentProcessingResult]) -> str:
        """Fallback aggregation method when other strategies fail"""
        
        logger.warning("Using fallback aggregation strategy")
        
        responses = []
        for result in fragment_results:
            content = result.response.content.strip()
            if content:
                responses.append(content)
        
        return "\\n\\n".join(responses) if responses else "Unable to process the request."