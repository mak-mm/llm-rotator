"""
Fragment Enhancement Module

This module uses Claude to intelligently enhance fragments with proper context
and instructions before sending them to downstream LLM providers.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from anthropic import Anthropic

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
    Enhances query fragments using Claude to add context and instructions
    """
    
    def __init__(self, anthropic_api_key: str):
        self.client = Anthropic(api_key=anthropic_api_key)
        self.enhancement_model = "claude-sonnet-4-20250514"  # Latest Claude 4 Sonnet (May 2025)
        
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
        
        # Analyze the overall query first to understand intent and requirements
        query_analysis = await self._analyze_query_intent(original_query, detection_context)
        
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
        
        logger.info(f"Successfully enhanced {len(enhanced_fragments)} fragments")
        return enhanced_fragments
    
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
                    "enhanced_by": "claude-4-sonnet",
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
        Make an API call to Claude for enhancement
        """
        try:
            response = self.client.messages.create(
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
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude API call failed: {e}")
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