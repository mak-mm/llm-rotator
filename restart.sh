#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Restarting LLM Model Rotator${NC}"
echo ""

# Kill processes on our ports
echo -e "${YELLOW}Stopping existing processes...${NC}"

# Kill backend (port 8000)
if lsof -ti:8000 >/dev/null 2>&1; then
    echo -e "${YELLOW}  Stopping backend on port 8000...${NC}"
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
fi

# Kill frontend (port 3000)
if lsof -ti:3000 >/dev/null 2>&1; then
    echo -e "${YELLOW}  Stopping frontend on port 3000...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

# Wait a moment for processes to stop
sleep 2

# Start Redis if not running
echo -e "${BLUE}🗃️  Checking Redis...${NC}"
if ! docker ps | grep -q llm-rotator-redis; then
    echo -e "${YELLOW}  Starting Redis container...${NC}"
    docker-compose up -d redis
    sleep 3
else
    echo -e "${GREEN}  ✅ Redis is already running${NC}"
fi

# Start backend
echo -e "${BLUE}🚀 Starting Backend...${NC}"
cd "$(dirname "$0")"
source venv/bin/activate 2>/dev/null || echo -e "${YELLOW}  Warning: Virtual environment not found${NC}"

uvicorn src.api.main:app --reload --port 8000 --log-level info &
BACKEND_PID=$!

echo -e "${GREEN}  ✅ Backend started with PID: $BACKEND_PID${NC}"

# Wait for backend to be ready
echo -e "${BLUE}⏳ Waiting for backend to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
        echo -e "${GREEN}  ✅ Backend is ready!${NC}"
        break
    fi
    echo -e "${YELLOW}  Attempt $i/30: Backend not ready yet...${NC}"
    sleep 2
done

# Start frontend
echo -e "${BLUE}🎨 Starting Frontend...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}  ✅ Frontend started with PID: $FRONTEND_PID${NC}"

echo ""
echo -e "${GREEN}🎉 Both services are starting up!${NC}"
echo -e "${BLUE}📍 Backend: http://localhost:8000${NC}"
echo -e "${BLUE}📍 Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}📍 API Docs: http://localhost:8000/docs${NC}"
echo ""
echo -e "${YELLOW}💡 To stop both services, use Ctrl+C or run: kill $BACKEND_PID $FRONTEND_PID${NC}"
echo ""
echo -e "${BLUE}📊 Process IDs:${NC}"
echo -e "  Backend: $BACKEND_PID"
echo -e "  Frontend: $FRONTEND_PID"

# Wait for frontend to be ready
echo -e "${BLUE}⏳ Waiting for frontend to be ready...${NC}"
for i in {1..20}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${GREEN}  ✅ Frontend is ready!${NC}"
        break
    fi
    echo -e "${YELLOW}  Attempt $i/20: Frontend not ready yet...${NC}"
    sleep 3
done

echo ""
echo -e "${GREEN}🚀 All services are ready! Open http://localhost:3000 in your browser${NC}"

# Keep script running
wait