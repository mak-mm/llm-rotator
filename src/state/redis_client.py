"""
Redis client for state management
"""

import json
import logging
import os
from typing import Any, Optional

import redis.asyncio as redis

logger = logging.getLogger(__name__)


class RedisClient:
    """Async Redis client wrapper"""

    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.ttl = int(os.getenv("REDIS_TTL", "3600"))
        self.client: redis.Redis | None = None

    async def connect(self):
        """Connect to Redis"""
        try:
            self.client = await redis.from_url(
                self.redis_url,
                decode_responses=True
            )
            await self.client.ping()
            logger.info("Connected to Redis successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            raise

    async def close(self):
        """Close Redis connection"""
        if self.client:
            await self.client.close()
            logger.info("Closed Redis connection")

    async def set_request(self, request_id: str, data: dict[str, Any]) -> bool:
        """Store request data"""
        try:
            serialized = json.dumps(data)
            await self.client.setex(
                f"request:{request_id}",
                self.ttl,
                serialized
            )
            return True
        except Exception as e:
            logger.error(f"Failed to store request {request_id}: {str(e)}")
            return False

    async def get_request(self, request_id: str) -> dict[str, Any] | None:
        """Retrieve request data"""
        try:
            data = await self.client.get(f"request:{request_id}")
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Failed to retrieve request {request_id}: {str(e)}")
            return None

    async def update_request_status(
        self,
        request_id: str,
        status: str,
        progress: float,
        message: Optional[str] = None
    ) -> bool:
        """Update request processing status"""
        try:
            data = await self.get_request(request_id)
            if not data:
                return False

            data["status"] = status
            data["progress"] = progress
            if message:
                data["message"] = message

            return await self.set_request(request_id, data)
        except Exception as e:
            logger.error(f"Failed to update status for {request_id}: {str(e)}")
            return False

    async def cache_fragment_response(
        self,
        fragment_hash: str,
        response: str,
        ttl: Optional[int] = None
    ) -> bool:
        """Cache a fragment response"""
        try:
            cache_ttl = ttl or self.ttl
            await self.client.setex(
                f"fragment_cache:{fragment_hash}",
                cache_ttl,
                response
            )
            return True
        except Exception as e:
            logger.error(f"Failed to cache fragment response: {str(e)}")
            return False

    async def get_cached_fragment(self, fragment_hash: str) -> str | None:
        """Retrieve cached fragment response"""
        try:
            return await self.client.get(f"fragment_cache:{fragment_hash}")
        except Exception as e:
            logger.error(f"Failed to retrieve cached fragment: {str(e)}")
            return None

    async def increment_provider_usage(self, provider: str) -> int:
        """Track provider usage for load balancing"""
        try:
            key = f"provider_usage:{provider}"
            count = await self.client.incr(key)

            # Reset counter daily
            ttl = await self.client.ttl(key)
            if ttl == -1:  # No expiry set
                await self.client.expire(key, 86400)  # 24 hours

            return count
        except Exception as e:
            logger.error(f"Failed to increment provider usage: {str(e)}")
            return 0

    async def get_provider_usage(self, provider: str) -> int:
        """Get current provider usage count"""
        try:
            count = await self.client.get(f"provider_usage:{provider}")
            return int(count) if count else 0
        except Exception as e:
            logger.error(f"Failed to get provider usage: {str(e)}")
            return 0
