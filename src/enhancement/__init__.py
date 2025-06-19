"""
Fragment Enhancement Module

Provides intelligent enhancement of query fragments using Claude to add
proper context and instructions before sending to downstream LLM providers.
"""

from .enhancer import FragmentEnhancer, EnhancementResult

__all__ = ['FragmentEnhancer', 'EnhancementResult']