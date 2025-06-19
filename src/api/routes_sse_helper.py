"""
Helper functions for SSE updates in routes
"""

from src.api.sse import sse_manager
import logging

logger = logging.getLogger(__name__)

async def send_step_updates(request_id: str, step: str, status: str, progress: float, message: str, data: dict = None):
    """Send both investor collector and SSE updates for a step"""
    try:
        # Send SSE update
        await sse_manager.send_step_update(
            request_id=request_id,
            step=step,
            status=status,
            progress=progress,
            message=message,
            additional_data=data or {}
        )
    except Exception as e:
        logger.error(f"Failed to send SSE update: {e}")

async def send_fragmentation_progress(request_id: str, current: int, total: int):
    """Send fragmentation progress update"""
    progress = int((current / total) * 100) if total > 0 else 0
    await send_step_updates(
        request_id,
        "fragmentation",
        "processing",
        progress,
        f"Creating fragment {current}/{total}..."
    )

async def send_distribution_progress(request_id: str, current: int, total: int, provider: str):
    """Send distribution progress update"""
    progress = int((current / total) * 100) if total > 0 else 0
    await send_step_updates(
        request_id,
        "distribution", 
        "processing",
        progress,
        f"Processing fragment {current}/{total} with {provider}..."
    )

async def send_planning_update(request_id: str, message: str, progress: float = 50):
    """Send planning phase update"""
    await send_step_updates(
        request_id,
        "planning",
        "processing",
        progress,
        message
    )