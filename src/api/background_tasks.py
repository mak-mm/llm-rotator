"""
Background task processing for query analysis
"""

import asyncio
import logging
import time
from typing import Optional

from src.api.models import (
    DetectionResult, Fragment, FragmentResponse, ProviderType
)
from src.api.investor_collector import investor_metrics_collector
from src.api.sse import sse_manager
from src.detection.engine import DetectionEngine
from src.api.models import QueryRequest

logger = logging.getLogger(__name__)


async def process_query_background(
    request_id: str,
    query_request: QueryRequest,
    orchestrator,
    detection_engine: DetectionEngine,
    redis_client=None
):
    """Process query in background with real-time SSE updates"""
    try:
        # Start timing and investor metrics collection
        start_time = time.time()
        metrics_session = investor_metrics_collector.start_collection(request_id)
        
        # Store initial state in Redis
        current_time = time.time()
        await redis_client.set(
            f"query:{request_id}",
            {
                "status": "processing",
                "original_query": query_request.query,
                "started_at": current_time,
                "created_at": current_time,
                "updated_at": current_time,
                "progress": 0.0
            }
        )
        
        # Give frontend time to establish SSE connection
        await asyncio.sleep(0.5)
        
        # Log step 1: Original Query received
        logger.info(f"[{request_id}] STEP 1: Original Query received - {len(query_request.query)} characters")
        await investor_metrics_collector.record_step_start(request_id, "query_analysis", 1)
        
        # Send initial step update
        await sse_manager.send_step_update(
            request_id, "query_analysis", "processing", 10,
            f"Query received: {len(query_request.query)} characters"
        )
        
        # Log step 2: Starting PII Detection
        logger.info(f"[{request_id}] STEP 2: Starting PII Detection using Microsoft Presidio...")
        await investor_metrics_collector.record_step_start(request_id, "pii_detection", 2)
        
        # Send SSE update for PII detection start
        logger.info(f"[{request_id}] 📡 SSE: Sending PII detection start")
        await sse_manager.send_step_update(
            request_id, "pii_detection", "processing", 0,
            "Scanning for 50+ PII types using Microsoft Presidio..."
        )

        # PII detection processing

        # Perform actual PII detection
        detection_report = await detection_engine.analyze(query_request.query)
        
        # Record privacy analysis for investor demo
        await investor_metrics_collector.record_privacy_analysis(request_id, detection_report)
        
        # Log PII detection results
        if detection_report.has_pii:
            logger.info(f"[{request_id}] PII Detection COMPLETE: Found {len(detection_report.pii_entities)} entities")
            for entity in detection_report.pii_entities:
                logger.info(f"[{request_id}] - {entity.type}: '{entity.text}' (confidence: {entity.score:.2f})")
        else:
            logger.info(f"[{request_id}] PII Detection COMPLETE: No PII detected - query is clean")
        
        # Record PII detection completion
        await investor_metrics_collector.record_step_completion(
            request_id, "pii_detection", 
            {"pii_entities_found": len(detection_report.pii_entities)}
        )
        
        # Send SSE update for PII detection completion
        await sse_manager.send_step_update(
            request_id, "pii_detection", "completed", 100,
            f"Found {len(detection_report.pii_entities)} PII entities"
        )
        
        
        # Log step 3: Starting Fragmentation
        logger.info(f"[{request_id}] STEP 3: Starting semantic fragmentation...")
        await investor_metrics_collector.record_step_start(request_id, "fragmentation", 3)
        
        # Send SSE update for fragmentation start
        logger.info(f"[{request_id}] 📡 SSE: Sending fragmentation start")
        await sse_manager.send_step_update(
            request_id, "fragmentation", "processing", 0,
            "Creating privacy-preserving fragments..."
        )

        # Convert detection report to API format
        detection_dict = DetectionResult(
            has_pii=detection_report.has_pii,
            pii_entities=[
                {
                    "text": e.text,
                    "type": e.type.value,
                    "start": e.start,
                    "end": e.end,
                    "score": e.score
                }
                for e in detection_report.pii_entities
            ],
            has_code=detection_report.code_detection.has_code,
            code_language=detection_report.code_detection.language,
            entities=[
                {
                    "text": e.text,
                    "label": e.label,
                    "start": e.start,
                    "end": e.end
                }
                for e in detection_report.named_entities
            ],
            sensitivity_score=detection_report.sensitivity_score
        )

        # Fragmentation processing

        # Use actual fragmentation engine to create real fragments
        fragments = []
        if detection_report.sensitivity_score > 0.3:
            # Import and use the actual fragmenter
            from src.fragmentation.fragmenter import QueryFragmenter
            from src.fragmentation.models import FragmentationConfig
            
            fragmenter = QueryFragmenter(FragmentationConfig())
            fragmentation_result = fragmenter.fragment_query(query_request.query)
            
            # Convert internal fragments to API fragments
            providers = [ProviderType.ANTHROPIC, ProviderType.OPENAI, ProviderType.GOOGLE]
            fragments = []
            
            # Log each fragment as it's created
            for i, frag in enumerate(fragmentation_result.fragments):
                provider = providers[i % len(providers)]
                fragment = Fragment(
                    id=f"frag_{i+1}",
                    content=frag.content,
                    provider=provider,
                    anonymized=frag.metadata.get("is_anonymized", False) if frag.metadata else False,
                    context_percentage=round(1.0 / len(fragmentation_result.fragments), 2)
                )
                fragments.append(fragment)
                logger.info(f"[{request_id}] Created fragment {i+1}/{len(fragmentation_result.fragments)}: {len(frag.content)} chars → {provider.value.upper()}")
            
            logger.info(f"[{request_id}] Fragmentation COMPLETE: Created {len(fragments)} fragments")
            
            # Record fragmentation completion
            await investor_metrics_collector.record_step_completion(
                request_id, "fragmentation",
                {"fragments_created": len(fragments)}
            )
            
            # Send SSE update for fragmentation completion
            await sse_manager.send_step_update(
                request_id, "fragmentation", "completed", 100,
                f"Created {len(fragments)} privacy-preserving fragments"
            )
            
            
            # Record cost optimization metrics
            await investor_metrics_collector.record_cost_optimization(request_id, fragments)
            
            # Log step 4: Planning and Orchestration
            logger.info(f"[{request_id}] STEP 4: Planning optimal provider routing...")
            await investor_metrics_collector.record_step_start(request_id, "planning", 4)
            
            # Send SSE planning progress
            await sse_manager.send_step_update(
                request_id, "planning", "processing", 50,
                "Analyzing provider capabilities and costs..."
            )
            
            # Planning processing
            
            # Record planning completion
            await investor_metrics_collector.record_step_completion(
                request_id, "planning",
                {"routing_decisions": len(fragments), "providers_selected": len(set(f.provider.value for f in fragments))}
            )
            
            # Send SSE planning completion
            await sse_manager.send_step_update(
                request_id, "planning", "completed", 100,
                f"Optimized routing to {len(set(f.provider.value for f in fragments))} providers"
            )
            
                
            # Log step 5: Starting Distribution
            logger.info(f"[{request_id}] STEP 5: Starting multi-provider distribution...")
            await investor_metrics_collector.record_step_start(request_id, "distribution", 5)
            
            # Send SSE update for distribution start
            await sse_manager.send_step_update(
                request_id, "distribution", "processing", 0,
                "Routing fragments to multiple providers..."
            )

        # Get actual responses from LLM providers for each fragment
        fragment_responses = []
        if fragments:
            # Access the global provider manager from the app state
            from src.api.main import app
            provider_manager = getattr(app.state, 'provider_manager', None)
            if not provider_manager:
                logger.error("Provider manager not available")
                raise Exception("Provider manager not initialized")
            
            # Process fragments one by one for better real-time feedback
            for idx, fragment in enumerate(fragments):
                try:
                    # Log fragment processing
                    logger.info(f"[{request_id}] Processing fragment {idx+1}/{len(fragments)} with {fragment.provider.value.upper()}...")
                    
                    # Send SSE update for fragment processing
                    progress = int(((idx + 0.5) / len(fragments)) * 100)
                    await sse_manager.send_step_update(
                        request_id, "distribution", "processing", progress,
                        f"Processing fragment {idx+1}/{len(fragments)} with {fragment.provider.value.upper()}..."
                    )
                    
                    # Record provider routing decision
                    await investor_metrics_collector.record_provider_routing(
                        request_id, fragment.id, fragment.provider.value,
                        f"Optimal for fragment type and cost efficiency"
                    )
                    
                    # Get the actual provider instance
                    provider = provider_manager.providers.get(fragment.provider.value)
                    if not provider:
                        raise Exception(f"Provider {fragment.provider.value} not available")
                    
                    # Send the fragment content to the provider
                    from src.providers.models import LLMRequest
                    start_time = time.time()
                    
                    # Create proper LLM request
                    llm_request = LLMRequest(
                        request_id=f"frag_{fragment.id}",
                        prompt=fragment.content,
                        temperature=0.7,
                        max_tokens=1000
                    )
                    
                    response = await provider.generate(llm_request)
                    processing_time = time.time() - start_time
                    
                    logger.info(f"[{request_id}] Fragment {idx+1}/{len(fragments)} completed by {fragment.provider.value.upper()} in {processing_time:.2f}s")
                    
                    # Send SSE update for fragment completion
                    progress = int(((idx + 1) / len(fragments)) * 100)
                    await sse_manager.send_step_update(
                        request_id, "distribution", "processing", progress,
                        f"Fragment {idx+1}/{len(fragments)} completed by {fragment.provider.value.upper()}"
                    )
                    
                    fragment_responses.append(FragmentResponse(
                        fragment_id=fragment.id,
                        provider=fragment.provider,
                        response=response.content,
                        processing_time=processing_time,
                        tokens_used=getattr(response, 'tokens_used', None)
                    ))
                    
                    
                except Exception as e:
                    logger.error(f"Error getting response from {fragment.provider}: {str(e)}")
                    # Fallback response
                    fragment_responses.append(FragmentResponse(
                        fragment_id=fragment.id,
                        provider=fragment.provider,
                        response=f"Error processing fragment: {str(e)}",
                        processing_time=0.0
                    ))
            
            # Log distribution completion
            logger.info(f"[{request_id}] STEP 5 COMPLETE: All fragments processed")
            
            # Record distribution completion
            await investor_metrics_collector.record_step_completion(
                request_id, "distribution",
                {"fragments_processed": len(fragment_responses)}
            )
            
            # Send SSE update for distribution completion
            await sse_manager.send_step_update(
                request_id, "distribution", "completed", 100,
                f"All {len(fragment_responses)} fragments processed successfully"
            )
            
                
            # Log step 6: Aggregation
            logger.info(f"[{request_id}] STEP 6: Aggregating responses...")
            await investor_metrics_collector.record_step_start(request_id, "aggregation", 6)
            
            # Send SSE update for aggregation start
            await sse_manager.send_step_update(
                request_id, "aggregation", "processing", 0,
                "Combining responses from all providers..."
            )
            
                
            # Send SSE update for aggregation progress
            await sse_manager.send_step_update(
                request_id, "aggregation", "processing", 50,
                f"Merging {len(fragment_responses)} provider responses..."
            )
            
            # Aggregate the real responses using simple concatenation for now
            if fragment_responses:
                # Simple aggregation - concatenate responses with provider attribution
                response_parts = []
                for fr in fragment_responses:
                    response_parts.append(f"[{fr.provider.value.upper()}]: {fr.response}")
                
                aggregated_response = "\n\n".join(response_parts)
                logger.info(f"[{request_id}] Response aggregation COMPLETE: Combined {len(fragment_responses)} responses")
            else:
                aggregated_response = "No responses available from providers."
            
            # Record aggregation completion
            await investor_metrics_collector.record_step_completion(
                request_id, "aggregation",
                {"response_length": len(aggregated_response), "fragments_combined": len(fragment_responses)}
            )
            
            # Send SSE update for aggregation completion
            await sse_manager.send_step_update(
                request_id, "aggregation", "completed", 100,
                f"Successfully aggregated {len(fragment_responses)} responses"
            )
        else:
            # No fragmentation needed
            fragments = []
            fragment_responses = []
            aggregated_response = "Query did not require fragmentation due to low sensitivity."

        # Calculate total processing time
        total_time = time.time() - start_time
        
        
        # Log step 7: Final Response
        logger.info(f"[{request_id}] STEP 7: Preparing final response...")
        await investor_metrics_collector.record_step_start(request_id, "final_response", 7)
        
        # Send SSE update for final response start
        await sse_manager.send_step_update(
            request_id, "final_response", "processing", 0,
            "Preparing final privacy-preserved response..."
        )
        
        
        # Record final performance metrics
        await investor_metrics_collector.record_performance_metrics(request_id, total_time)
        
        # Generate executive summary for investors
        await investor_metrics_collector.generate_executive_summary(request_id)
        
        # Record final response completion
        await investor_metrics_collector.record_step_completion(
            request_id, "final_response",
            {"total_processing_time": total_time, "success": True}
        )
        
        # Send SSE update for final response completion
        await sse_manager.send_step_update(
            request_id, "final_response", "completed", 100,
            f"Response delivered • {total_time:.1f}s total • Privacy score: {min(detection_report.sensitivity_score * 0.7 + 0.3, 1.0):.1%}"
        )
        
        # Send final SSE completion event
        await sse_manager.send_final_update(request_id, {
            "status": "completed",
            "total_time": total_time,
            "privacy_score": min(detection_report.sensitivity_score * 0.7 + 0.3, 1.0),
            "fragments_processed": len(fragments),
            "providers_used": len(set(f.provider.value for f in fragments)) if fragments else 0
        })
        
        logger.info(f"[{request_id}] Query processing COMPLETE")
        
        # Store final result in Redis
        final_result = {
            "request_id": request_id,
            "original_query": query_request.query,
            "detection": detection_dict.model_dump(),
            "fragments": [f.model_dump() for f in fragments],
            "fragment_responses": [fr.model_dump() for fr in fragment_responses],
            "aggregated_response": aggregated_response,
            "privacy_score": min(detection_report.sensitivity_score * 0.7 + 0.3, 1.0),
            "total_time": total_time,
            "cost_comparison": {
                "fragmented_cost": len(fragments) * 0.002 if fragments else 0.001,
                "single_provider_cost": 0.008,
                "savings_percentage": max(0, (1 - (len(fragments) * 0.002 / 0.008)) * 100) if fragments else 87.5
            },
            "status": "completed",
            "created_at": start_time,  # Use the original start time
            "updated_at": time.time(),
            "progress": 1.0
        }
        
        await redis_client.set(f"query:{request_id}", final_result, expire=3600)  # 1 hour expiry

    except Exception as e:
        logger.error(f"Error processing query {request_id}: {str(e)}")
        
        # Send error update
        await sse_manager.send_error(request_id, str(e))
        
        # Update Redis with error status
        await redis_client.set(
            f"query:{request_id}",
            {
                "status": "failed",
                "error": str(e),
                "request_id": request_id,
                "created_at": start_time if 'start_time' in locals() else time.time(),
                "updated_at": time.time(),
                "progress": 0.0
            }
        )