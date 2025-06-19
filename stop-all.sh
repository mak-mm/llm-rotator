#!/bin/bash

# Force stop all LLM Model Rotator processes

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${YELLOW}🛑 Force stopping all LLM Model Rotator processes...${NC}"

# Kill processes on ports
echo -e "${YELLOW}Killing processes on ports 8000 and 3000...${NC}"
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Kill specific processes
echo -e "${YELLOW}Killing uvicorn processes...${NC}"
pkill -9 -f "uvicorn.*src.api.main" 2>/dev/null || true

echo -e "${YELLOW}Killing npm/node processes...${NC}"
pkill -9 -f "npm run dev" 2>/dev/null || true
pkill -9 -f "next dev" 2>/dev/null || true

# Stop and remove Redis container
echo -e "${YELLOW}Stopping Redis...${NC}"
docker stop llm-rotator-redis >/dev/null 2>&1 || true
docker rm llm-rotator-redis >/dev/null 2>&1 || true

# Clear Redis (if it's running locally)
redis-cli FLUSHALL >/dev/null 2>&1 || true

echo -e "${GREEN}✅ All processes stopped!${NC}"
echo
echo -e "Ports should now be free:"
echo -e "  Port 8000: $(lsof -ti:8000 >/dev/null 2>&1 && echo '❌ Still in use' || echo '✅ Free')"
echo -e "  Port 3000: $(lsof -ti:3000 >/dev/null 2>&1 && echo '❌ Still in use' || echo '✅ Free')"