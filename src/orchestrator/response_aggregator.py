"""
Response aggregation and reassembly logic with research-based enhancements
"""

import logging
import re
from typing import Dict, List, Tuple
import math

from src.fragmentation.models import FragmentationType, QueryFragment
from src.orchestrator.models import FragmentProcessingResult, OrchestrationRequest

logger = logging.getLogger(__name__)


class ResponseAggregator:
    """
    Aggregates and reassembles responses from multiple LLM fragments
    Implements research-based weighted aggregation and confidence scoring
    """

    def __init__(self):
        """Initialize the response aggregator"""
        self.aggregation_strategies = {
            "weighted_ensemble": self._weighted_ensemble_aggregation,
            "sequential": self._sequential_aggregation,
            "contextual": self._contextual_aggregation,
            "pii_reassembly": self._pii_reassembly,
            "code_reassembly": self._code_reassembly,
            "semantic_merge": self._semantic_merge
        }
        
        # Provider reliability scores (based on research)
        self.provider_weights = {
            "anthropic": 0.95,  # High quality for sensitive content
            "openai": 0.85,     # Good general performance
            "google": 0.75      # Cost-effective but lower quality
        }

    async def aggregate_responses(
        self,
        fragment_results: list[FragmentProcessingResult],
        original_fragments: list[QueryFragment],
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
        fragment_results: list[FragmentProcessingResult],
        original_fragments: list[QueryFragment]
    ) -> list[tuple[FragmentProcessingResult, QueryFragment]]:
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
        fragments: list[QueryFragment],
        request: OrchestrationRequest
    ) -> str:
        """Select the best aggregation strategy based on fragment types"""

        fragment_types = {frag.fragment_type for frag in fragments}

        # For high-privacy queries, always use weighted ensemble
        if request.privacy_level.value in ["restricted", "top_secret"]:
            return "weighted_ensemble"

        # If we have multiple providers, use weighted ensemble
        if len({frag.provider_hint for frag in fragments if frag.provider_hint}) > 1:
            return "weighted_ensemble"

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
        if any(hasattr(frag, 'context_references') and frag.context_references for frag in fragments):
            return "contextual"

        # Default to weighted ensemble for better quality
        return "weighted_ensemble"

    async def _weighted_ensemble_aggregation(
        self,
        sorted_results: list[tuple[FragmentProcessingResult, QueryFragment]],
        original_fragments: list[QueryFragment],
        request: OrchestrationRequest
    ) -> str:
        """
        Research-based weighted ensemble aggregation with confidence scoring
        Implements best practices from academic literature
        """
        
        # Step 1: Calculate confidence scores for each fragment response
        weighted_responses = []
        total_weight = 0.0
        
        for result, fragment in sorted_results:
            response_text = result.response.content.strip()
            if not response_text:
                continue
                
            # Calculate confidence score based on multiple factors
            confidence_score = self._calculate_confidence_score(result, fragment, request)
            
            # Get provider weight
            provider_weight = self.provider_weights.get(result.provider_id.lower(), 0.7)
            
            # Combine confidence and provider weights
            final_weight = confidence_score * provider_weight
            
            weighted_responses.append({
                'text': response_text,
                'weight': final_weight,
                'provider': result.provider_id,
                'fragment_type': fragment.fragment_type.value,
                'privacy_score': result.privacy_score
            })
            
            total_weight += final_weight
            
        if not weighted_responses:
            return "No valid responses to aggregate."
            
        # Step 2: Sort by weight (highest first)
        weighted_responses.sort(key=lambda x: x['weight'], reverse=True)
        
        # Step 3: Apply weighted aggregation strategy
        if len(weighted_responses) == 1:
            return weighted_responses[0]['text']
        elif len(weighted_responses) == 2:
            return self._merge_two_responses(weighted_responses[0], weighted_responses[1])
        else:
            return self._merge_multiple_responses(weighted_responses, total_weight)

    def _calculate_confidence_score(
        self,
        result: FragmentProcessingResult,
        fragment: QueryFragment,
        request: OrchestrationRequest
    ) -> float:
        """
        Calculate confidence score based on response quality indicators
        """
        
        response_text = result.response.content.strip()
        base_score = 0.5
        
        # Factor 1: Response length (not too short, not too long)
        length_score = self._score_response_length(response_text)
        base_score += length_score * 0.2
        
        # Factor 2: Processing time (faster is often better for simple queries)
        time_score = self._score_processing_time(result.processing_time_ms)
        base_score += time_score * 0.1
        
        # Factor 3: Privacy score alignment
        privacy_score = result.privacy_score
        if fragment.contains_sensitive_data:
            # For sensitive fragments, higher privacy score is better
            base_score += privacy_score * 0.3
        else:
            # For non-sensitive fragments, privacy score less important
            base_score += 0.15
        
        # Factor 4: Response coherence (basic heuristics)
        coherence_score = self._score_response_coherence(response_text)
        base_score += coherence_score * 0.3
        
        # Factor 5: Fragment type appropriateness
        type_score = self._score_fragment_appropriateness(response_text, fragment)
        base_score += type_score * 0.1
        
        return min(max(base_score, 0.0), 1.0)
    
    def _score_response_length(self, response_text: str) -> float:
        """Score response based on optimal length"""
        length = len(response_text)
        if 50 <= length <= 500:
            return 1.0  # Optimal length
        elif 20 <= length <= 1000:
            return 0.7  # Acceptable length
        elif length < 20:
            return 0.3  # Too short
        else:
            return 0.5  # Too long
    
    def _score_processing_time(self, time_ms: float) -> float:
        """Score based on processing time (faster is better for most cases)"""
        if time_ms < 1000:  # < 1 second
            return 1.0
        elif time_ms < 3000:  # < 3 seconds
            return 0.8
        elif time_ms < 5000:  # < 5 seconds
            return 0.6
        else:
            return 0.4
    
    def _score_response_coherence(self, response_text: str) -> float:
        """Basic coherence scoring using heuristics"""
        
        # Check for common error patterns
        error_patterns = [
            "sorry, but i can't",
            "i don't understand",
            "i'm not sure",
            "could you provide",
            "please clarify"
        ]
        
        text_lower = response_text.lower()
        
        # Penalize error responses
        for pattern in error_patterns:
            if pattern in text_lower:
                return 0.2
        
        # Reward complete sentences
        sentence_count = len([s for s in response_text.split('.') if s.strip()])
        if sentence_count >= 2:
            coherence = 0.8
        elif sentence_count == 1:
            coherence = 0.6
        else:
            coherence = 0.4
            
        # Bonus for proper capitalization and punctuation
        if response_text[0].isupper() and response_text.endswith(('.', '!', '?')):
            coherence += 0.2
            
        return min(coherence, 1.0)
    
    def _score_fragment_appropriateness(self, response_text: str, fragment: QueryFragment) -> float:
        """Score how well response matches fragment type"""
        
        if fragment.fragment_type == FragmentationType.CODE:
            # Code fragments should contain code
            if '```' in response_text or '`' in response_text:
                return 1.0
            elif any(keyword in response_text.lower() for keyword in ['function', 'def', 'class', 'var', 'let', 'const']):
                return 0.7
            else:
                return 0.3
        
        elif fragment.fragment_type == FragmentationType.PII:
            # PII fragments should handle anonymization properly
            if '<PERSON>' in response_text or '<EMAIL>' in response_text:
                return 1.0
            else:
                return 0.8
        
        else:
            # General fragments - basic quality check
            return 0.8
    
    def _merge_two_responses(self, primary: Dict, secondary: Dict) -> str:
        """Merge two weighted responses"""
        
        primary_text = primary['text']
        secondary_text = secondary['text']
        
        # If primary response is much better, use it primarily
        weight_ratio = primary['weight'] / (secondary['weight'] + 0.001)
        
        if weight_ratio > 2.0:
            # Primary is significantly better
            return primary_text
        elif weight_ratio > 1.5:
            # Primary is better, but incorporate secondary
            return f"{primary_text}\n\nAdditionally, {secondary_text.lower()}"
        else:
            # Balanced merge
            return f"{primary_text}\n\n{secondary_text}"
    
    def _merge_multiple_responses(self, weighted_responses: List[Dict], total_weight: float) -> str:
        """Merge multiple responses using weighted combination"""
        
        # Take the top 3 responses by weight
        top_responses = weighted_responses[:3]
        
        # Primary response (highest weight)
        result = top_responses[0]['text']
        
        # Add secondary responses with transitions
        for i, response in enumerate(top_responses[1:], 1):
            weight_contribution = response['weight'] / total_weight
            
            # Only include if weight contribution is significant
            if weight_contribution > 0.15:
                if i == 1:
                    result += f"\n\nAdditionally, {response['text'].lower()}"
                else:
                    result += f"\n\nFurthermore, {response['text'].lower()}"
        
        return result

    async def _sequential_aggregation(
        self,
        sorted_results: list[tuple[FragmentProcessingResult, QueryFragment]],
        original_fragments: list[QueryFragment],
        request: OrchestrationRequest
    ) -> str:
        """Simple sequential concatenation of responses"""

        responses = []
        for result, _fragment in sorted_results:
            response_text = result.response.content.strip()
            if response_text:
                responses.append(response_text)

        return "\\n\\n".join(responses)

    async def _contextual_aggregation(
        self,
        sorted_results: list[tuple[FragmentProcessingResult, QueryFragment]],
        original_fragments: list[QueryFragment],
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
        sorted_results: list[tuple[FragmentProcessingResult, QueryFragment]],
        original_fragments: list[QueryFragment],
        request: OrchestrationRequest
    ) -> str:
        """
        Reassemble responses while properly handling anonymized content.
        Follows industry standards for PII de-anonymization and response coherence.
        """
        
        # Extract entity mappings from fragment metadata
        entity_mappings = {}
        for result, fragment in sorted_results:
            if fragment.metadata and "entity_mappings" in fragment.metadata:
                # Reverse the mapping: placeholder -> original_text
                for original_text, placeholder in fragment.metadata["entity_mappings"].items():
                    entity_mappings[placeholder] = original_text
        
        # Process responses to restore anonymized entities
        processed_responses = []
        
        for result, fragment in sorted_results:
            response_text = result.response.content.strip()
            
            if not response_text:
                continue
                
            # Check if fragment was anonymized and restore entities
            if fragment.metadata and fragment.metadata.get("is_anonymized"):
                # Restore original entities in the response
                restored_text = self._restore_anonymized_entities(response_text, entity_mappings)
                processed_responses.append(restored_text)
            else:
                # Use response as-is
                processed_responses.append(response_text)
        
        # Combine responses intelligently
        if len(processed_responses) == 0:
            return "No valid responses generated."
        elif len(processed_responses) == 1:
            return processed_responses[0]
        else:
            # Multiple responses - merge while avoiding duplication
            return self._merge_coherent_responses(processed_responses)

    async def _code_reassembly(
        self,
        sorted_results: list[tuple[FragmentProcessingResult, QueryFragment]],
        original_fragments: list[QueryFragment],
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
        sorted_results: list[tuple[FragmentProcessingResult, QueryFragment]],
        original_fragments: list[QueryFragment],
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

    def _restore_pii_placeholders(self, text: str, pii_mappings: dict[str, str]) -> str:
        """Restore PII placeholders with original values"""

        restored_text = text
        for placeholder, original_value in pii_mappings.items():
            restored_text = restored_text.replace(placeholder, original_value)

        return restored_text

    def _extract_code_sections(self, text: str) -> list[str]:
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
        sorted_results: list[tuple[FragmentProcessingResult, QueryFragment]]
    ) -> list[list[tuple[FragmentProcessingResult, QueryFragment]]]:
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

    def _merge_related_responses(self, responses: list[str]) -> str:
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

    def _restore_anonymized_entities(self, text: str, entity_mappings: dict) -> str:
        """
        Restore anonymized entities in response text.
        
        Args:
            text: Response text containing placeholders
            entity_mappings: Map of placeholder -> original_text
        
        Returns:
            Text with original entities restored
        """
        restored_text = text
        
        # Sort by placeholder length (longest first) to avoid partial replacements
        sorted_mappings = sorted(entity_mappings.items(), key=lambda x: len(x[0]), reverse=True)
        
        for placeholder, original_text in sorted_mappings:
            # Replace placeholder with original text
            restored_text = restored_text.replace(placeholder, original_text)
        
        return restored_text
    
    def _merge_coherent_responses(self, responses: list[str]) -> str:
        """
        Merge multiple responses while maintaining coherence.
        Removes redundancy and creates natural flow.
        """
        if not responses:
            return ""
        
        # For semantic chunks, concatenate with natural transitions
        merged = responses[0]
        
        for response in responses[1:]:
            # Check for content overlap to avoid redundancy
            if not self._has_significant_overlap(merged, response):
                # Add transition and append
                if not merged.endswith(('.', '!', '?')):
                    merged += "."
                merged += " " + response
        
        return merged.strip()
    
    def _has_significant_overlap(self, text1: str, text2: str) -> bool:
        """
        Check if two text fragments have significant content overlap.
        """
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return False
            
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        # Consider >70% overlap as significant
        similarity = len(intersection) / len(union) if union else 0
        return similarity > 0.7

    def _restore_pii_placeholders(self, text: str, pii_mappings: dict) -> str:
        """
        Legacy method for backward compatibility.
        Delegates to the new anonymization restoration method.
        """
        return self._restore_anonymized_entities(text, pii_mappings)

    def _fallback_aggregation(self, fragment_results: list[FragmentProcessingResult]) -> str:
        """Fallback aggregation method when other strategies fail"""

        logger.warning("Using fallback aggregation strategy")

        responses = []
        for result in fragment_results:
            content = result.response.content.strip()
            if content:
                responses.append(content)

        return "\\n\\n".join(responses) if responses else "Unable to process the request."
