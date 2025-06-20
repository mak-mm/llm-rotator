"""
Fragment Enhancement Module

This module uses GPT-4o-mini to intelligently enhance fragments with proper context
and instructions before sending them to downstream LLM providers.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from openai import AsyncOpenAI

from src.api.models import Fragment, ProviderType

logger = logging.getLogger(__name__)


@dataclass
class EnhancementResult:
    """Result of fragment enhancement"""
    enhanced_content: str
    original_content: str
    context_added: str
    instructions_added: str
    enhancement_rationale: str
    quality_score: float  # 0.0 to 1.0


class FragmentEnhancer:
    """
    Enhances query fragments using GPT-4o-mini to add context and instructions
    Also handles aggregation with thread continuity for improved quality
    """
    
    def __init__(self, openai_api_key: str):
        self.client = AsyncOpenAI(api_key=openai_api_key)
        self.enhancement_model = "gpt-4o-mini"  # Fast and cost-effective orchestrator model
        self.conversation_history = []  # Keep thread alive for aggregation
        self.original_query = None
        self.query_analysis = None
        
    async def enhance_fragments(
        self, 
        fragments: List[Fragment], 
        original_query: str,
        query_intent: str = None,
        detection_context: Dict[str, Any] = None
    ) -> List[Fragment]:
        """
        Enhance all fragments with proper context and instructions
        
        Args:
            fragments: List of fragments to enhance
            original_query: The original complete query for context
            query_intent: Detected intent/purpose of the query
            detection_context: PII/code detection context
            
        Returns:
            List of enhanced fragments
        """
        logger.info(f"Starting enhancement of {len(fragments)} fragments")
        
        # Store context for later aggregation
        self.original_query = original_query
        self.conversation_history = []  # Reset conversation
        
        # Analyze the overall query first to understand intent and requirements
        query_analysis = await self._analyze_query_intent(original_query, detection_context)
        self.query_analysis = query_analysis
        
        # Enhance fragments in parallel for efficiency
        enhancement_tasks = [
            self._enhance_single_fragment(
                fragment, 
                original_query, 
                query_analysis,
                fragment_index=i,
                total_fragments=len(fragments)
            )
            for i, fragment in enumerate(fragments)
        ]
        
        enhanced_fragments = await asyncio.gather(*enhancement_tasks)
        
        # Store initial conversation context for aggregation
        self.conversation_history.append({
            "role": "system",
            "content": f"You have just enhanced {len(enhanced_fragments)} query fragments for optimal processing. The fragments were strategically optimized based on the original query: '{original_query}'"
        })
        
        logger.info(f"Successfully enhanced {len(enhanced_fragments)} fragments")
        return enhanced_fragments
    
    async def aggregate_responses(
        self,
        fragment_responses: List[Dict[str, Any]],
        enhanced_fragments: List[Fragment]
    ) -> str:
        """
        Aggregate responses from multiple providers using the same model that enhanced the fragments.
        This maintains context continuity and dramatically improves aggregation quality.
        
        Args:
            fragment_responses: List of responses from different providers
            enhanced_fragments: The enhanced fragments that were sent to providers
            
        Returns:
            Intelligently aggregated response
        """
        logger.info(f"Starting intelligent aggregation of {len(fragment_responses)} responses")
        
        if not fragment_responses:
            return "No responses available for aggregation."
        
        if len(fragment_responses) == 1:
            return fragment_responses[0].get('response', 'No response content available.')
        
        # Build aggregation prompt with full context
        responses_context = []
        for i, (response_data, fragment) in enumerate(zip(fragment_responses, enhanced_fragments)):
            provider = response_data.get('provider', 'unknown')
            response_text = response_data.get('response', '')
            
            responses_context.append(f"""
FRAGMENT {i+1} (Provider: {provider.upper()}):
Enhanced Fragment Sent: {fragment.content[:200]}...
Provider Response: {response_text}
""")
        
        aggregation_prompt = f"""You previously enhanced query fragments for optimal processing. Now you need to intelligently aggregate the responses into a single, coherent, high-quality answer.

ORIGINAL QUERY:
{self.original_query}

QUERY ANALYSIS CONTEXT:
- Primary Intent: {self.query_analysis.get('primary_intent', 'Unknown')}
- Expected Response Type: {self.query_analysis.get('expected_response_type', 'Unknown')}
- Domain Expertise: {self.query_analysis.get('domain_expertise', 'General')}

FRAGMENT RESPONSES TO AGGREGATE:
{''.join(responses_context)}

AGGREGATION INSTRUCTIONS:
1. Combine these responses into ONE coherent, comprehensive answer
2. Remove redundancy and contradictions
3. Ensure the final response directly answers the original query
4. Maintain the quality and accuracy from each provider
5. Use natural transitions between combined content
6. Preserve important details and technical accuracy
7. Format the response appropriately for the query type

Your response should be the final aggregated answer only, without meta-commentary about the aggregation process."""

        # Continue the conversation thread
        self.conversation_history.append({
            "role": "user",
            "content": aggregation_prompt
        })
        
        try:
            aggregated_response = await self._call_claude_with_history(max_tokens=3000)
            
            # Store the aggregation result in conversation history
            self.conversation_history.append({
                "role": "assistant", 
                "content": aggregated_response
            })
            
            logger.info(f"Successfully aggregated responses into {len(aggregated_response)} character response")
            return aggregated_response
            
        except Exception as e:
            logger.error(f"Intelligent aggregation failed: {e}, falling back to simple concatenation")
            # Fallback to simple concatenation
            fallback_responses = [resp.get('response', '') for resp in fragment_responses if resp.get('response')]
            return "\n\n".join(fallback_responses)
    
    async def _analyze_query_intent(
        self, 
        original_query: str, 
        detection_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Analyze the original query to understand intent and requirements
        """
        
        detection_info = ""
        if detection_context:
            pii_count = len(detection_context.get("pii_entities", []))
            has_code = detection_context.get("has_code", False)
            sensitivity = detection_context.get("sensitivity_score", 0)
            
            detection_info = f"""
Detection Context:
- PII entities found: {pii_count}
- Contains code: {has_code}
- Sensitivity score: {sensitivity:.2f}
- Code language: {detection_context.get("code_language", "N/A")}
"""

        prompt = f"""Analyze this query to understand its intent and requirements for fragment enhancement:

Original Query:
{original_query}

{detection_info}

Please provide a JSON response with:
1. "primary_intent": Main purpose (e.g., "information_request", "code_generation", "analysis", "enterprise_evaluation")
2. "expected_response_type": What kind of response is expected (e.g., "technical_document", "code_solution", "business_analysis")
3. "key_requirements": List of specific requirements the response must meet
4. "domain_expertise": What domain knowledge is needed (e.g., "healthcare", "cybersecurity", "software_engineering")
5. "response_format": Preferred format (e.g., "structured_document", "code_with_explanation", "bullet_points")
6. "context_preservation_priority": How important it is to maintain context across fragments (1-10)

Respond only with valid JSON."""

        try:
            response = await self._call_claude(prompt, max_tokens=1000)
            
            # Extract JSON from Claude 4 response if wrapped in text
            import json
            import re
            
            # Try to find JSON in the response
            json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = response.strip()
            
            analysis = json.loads(json_str)
            logger.info(f"Query analysis complete: {analysis.get('primary_intent', 'unknown')}")
            return analysis
        except Exception as e:
            logger.warning(f"Query analysis failed: {e}, using default analysis")
            return {
                "primary_intent": "general_request",
                "expected_response_type": "informational",
                "key_requirements": ["accurate information", "clear explanation"],
                "domain_expertise": "general",
                "response_format": "natural_language",
                "context_preservation_priority": 7
            }
    
    async def _enhance_single_fragment(
        self,
        fragment: Fragment,
        original_query: str,
        query_analysis: Dict[str, Any],
        fragment_index: int,
        total_fragments: int
    ) -> Fragment:
        """
        Enhance a single fragment with context and instructions
        """
        logger.debug(f"Enhancing fragment {fragment_index + 1}/{total_fragments} for {fragment.provider.value}")
        
        # Create provider-specific enhancement
        provider_capabilities = self._get_provider_capabilities(fragment.provider)
        
        enhancement_prompt = f"""You are an AI query optimization specialist. Your task is to enhance a query fragment to maximize the quality of the response from the target LLM provider.

ORIGINAL COMPLETE QUERY:
{original_query}

QUERY ANALYSIS:
- Primary Intent: {query_analysis.get('primary_intent', 'general_request')}
- Expected Response: {query_analysis.get('expected_response_type', 'informational')}
- Key Requirements: {', '.join(query_analysis.get('key_requirements', []))}
- Domain Expertise: {query_analysis.get('domain_expertise', 'general')}
- Response Format: {query_analysis.get('response_format', 'natural_language')}

FRAGMENT TO ENHANCE:
{fragment.content}

TARGET PROVIDER: {fragment.provider.value.upper()}
Provider Capabilities: {provider_capabilities}

FRAGMENT CONTEXT:
- This is fragment {fragment_index + 1} of {total_fragments}
- Fragment is {"anonymized" if fragment.anonymized else "not anonymized"}
- Context percentage: {fragment.context_percentage:.1%}

ENHANCEMENT REQUIREMENTS:
1. Add necessary context so the provider understands what to do with this fragment
2. Add clear instructions about the expected response format and quality
3. Maintain privacy by not revealing this is part of a larger fragmented query
4. Optimize for the target provider's specific strengths
5. Ensure the fragment can produce a useful response that will integrate well with other fragments

Please provide your response as JSON with these fields:
- "enhanced_content": The improved fragment with context and instructions
- "context_added": What context you added
- "instructions_added": What instructions you added  
- "enhancement_rationale": Why you made these specific enhancements
- "quality_score": Your confidence in enhancement quality (0.0-1.0)

Respond only with valid JSON."""

        try:
            response = await self._call_claude(enhancement_prompt, max_tokens=2000)
            
            # Extract JSON from Claude 4 response if wrapped in text
            import json
            import re
            
            # Try to find JSON in the response
            json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = response.strip()
            
            enhancement_data = json.loads(json_str)
            
            # Create enhanced fragment
            enhanced_fragment = Fragment(
                id=fragment.id,
                content=enhancement_data["enhanced_content"],
                provider=fragment.provider,
                anonymized=fragment.anonymized,
                context_percentage=fragment.context_percentage,
                # Add enhancement metadata
                original_content=fragment.content,
                enhancement_metadata={
                    "context_added": enhancement_data["context_added"],
                    "instructions_added": enhancement_data["instructions_added"],
                    "enhancement_rationale": enhancement_data["enhancement_rationale"],
                    "quality_score": enhancement_data["quality_score"],
                    "enhanced_by": "gpt-4o-mini",
                    "enhanced_at": asyncio.get_event_loop().time()
                }
            )
            
            logger.debug(f"Fragment {fragment_index + 1} enhanced successfully (quality: {enhancement_data['quality_score']:.2f})")
            return enhanced_fragment
            
        except Exception as e:
            logger.error(f"Failed to enhance fragment {fragment_index + 1}: {e}")
            # Return original fragment if enhancement fails
            return fragment
    
    def _get_provider_capabilities(self, provider: ProviderType) -> str:
        """
        Get provider-specific capabilities for optimization
        """
        capabilities = {
            ProviderType.ANTHROPIC: "Excellent at analysis, reasoning, and following complex instructions. Strong with code and technical content. Prefers structured, clear prompts with specific role definitions.",
            
            ProviderType.OPENAI: "Very capable at creative tasks, code generation, and conversational responses. Good at understanding context and intent. Works well with direct, conversational prompts.",
            
            ProviderType.GOOGLE: "Fast and efficient for straightforward tasks. Good at factual information and basic analysis. Prefers concise, direct prompts with clear objectives."
        }
        
        return capabilities.get(provider, "General language model capabilities")
    
    async def _call_claude(self, prompt: str, max_tokens: int = 1500) -> str:
        """
        Make an API call to GPT-4o-mini for enhancement
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.enhancement_model,
                max_tokens=max_tokens,
                temperature=0.3,  # Lower temperature for more consistent enhancements
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise
    
    async def _call_claude_with_history(self, max_tokens: int = 3000) -> str:
        """
        Make an API call to GPT-4o-mini using conversation history for context continuity
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.enhancement_model,
                max_tokens=max_tokens,
                temperature=0.4,  # Slightly higher for more creative aggregation
                messages=self.conversation_history
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API call with history failed: {e}")
            raise
    
    def get_enhancement_stats(self, enhanced_fragments: List[Fragment]) -> Dict[str, Any]:
        """
        Get statistics about the enhancement process
        """
        if not enhanced_fragments:
            return {}
        
        total_fragments = len(enhanced_fragments)
        enhanced_count = sum(1 for f in enhanced_fragments if hasattr(f, 'enhancement_metadata'))
        
        if enhanced_count == 0:
            return {"total_fragments": total_fragments, "enhanced_count": 0}
        
        # Calculate average quality score
        quality_scores = [
            f.enhancement_metadata.get("quality_score", 0.0) 
            for f in enhanced_fragments 
            if hasattr(f, 'enhancement_metadata') and f.enhancement_metadata
        ]
        
        avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0.0
        
        return {
            "total_fragments": total_fragments,
            "enhanced_count": enhanced_count,
            "enhancement_success_rate": enhanced_count / total_fragments,
            "average_quality_score": avg_quality,
            "quality_distribution": {
                "high_quality": sum(1 for q in quality_scores if q >= 0.8),
                "medium_quality": sum(1 for q in quality_scores if 0.6 <= q < 0.8),
                "low_quality": sum(1 for q in quality_scores if q < 0.6)
            }
        }