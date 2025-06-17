#!/bin/bash

# Privacy-Preserving LLM Query Fragmentation - Simple Development Startup
# This version shows logs directly in terminal with process management

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BACKEND_PORT=8000
FRONTEND_PORT_START=3000
REDIS_PORT=6379

print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

print_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}"
}

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

find_available_port() {
    local start_port=$1
    local port=$start_port
    
    while [ $((port - start_port)) -lt 50 ]; do
        if ! check_port $port; then
            echo $port
            return 0
        fi
        ((port++))
    done
    
    echo "No available port found"
    return 1
}

cleanup() {
    echo
    print_status "Shutting down..."
    
    # Kill all background jobs
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # Stop Redis if we started it
    if [ "$REDIS_STARTED" = "true" ]; then
        docker stop llm-rotator-redis >/dev/null 2>&1 || true
        docker rm llm-rotator-redis >/dev/null 2>&1 || true
    fi
    
    print_success "Shutdown complete"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo
echo -e "${CYAN}🚀 Starting LLM Model Rotator Development Environment${NC}"
echo

# Find available frontend port
FRONTEND_PORT=$(find_available_port $FRONTEND_PORT_START)
if [ "$FRONTEND_PORT" = "No available port found" ]; then
    echo "Could not find available port for frontend"
    exit 1
fi

if [ "$FRONTEND_PORT" -ne "$FRONTEND_PORT_START" ]; then
    print_status "Using port $FRONTEND_PORT for frontend (3000 was busy)"
fi

# Check for backend port conflict
if check_port $BACKEND_PORT; then
    print_status "Port $BACKEND_PORT is already in use. Stopping existing backend..."
    pkill -f "uvicorn src.api.main:app" 2>/dev/null || true
    sleep 2
    
    if check_port $BACKEND_PORT; then
        print_status "⚠️  Port $BACKEND_PORT still in use. Continuing anyway..."
    fi
fi

# Start Redis if needed
REDIS_STARTED=false
if ! check_port $REDIS_PORT; then
    print_status "Starting Redis..."
    if command -v docker >/dev/null 2>&1; then
        docker run -d --name llm-rotator-redis -p ${REDIS_PORT}:6379 redis:7-alpine >/dev/null 2>&1
        REDIS_STARTED=true
        sleep 2
    else
        print_status "⚠️  Docker not available. Please start Redis manually on port $REDIS_PORT"
    fi
fi

# Install dependencies quietly
print_status "Installing dependencies..."
pip install -r requirements.txt >/dev/null 2>&1 || true
cd frontend && npm install >/dev/null 2>&1 && cd .. || true

print_success "Environment ready!"
echo
print_status "Services:"
echo -e "  🌐 Frontend: ${YELLOW}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  🔧 Backend:  ${YELLOW}http://localhost:$BACKEND_PORT${NC}"
echo -e "  📚 API Docs: ${YELLOW}http://localhost:$BACKEND_PORT/docs${NC}"
echo
print_status "Starting services (logs will appear below)..."
echo
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo

# Start backend in foreground with colored output
(
    export FRONTEND_URL="http://localhost:$FRONTEND_PORT"
    export ENVIRONMENT=development
    echo -e "${CYAN}[BACKEND] Starting on port $BACKEND_PORT...${NC}"
    python3 -m uvicorn src.api.main:app --reload --host 0.0.0.0 --port $BACKEND_PORT 2>&1 | \
    while IFS= read -r line; do
        echo -e "${CYAN}[BACKEND]${NC} $line"
    done
) &

# Give backend time to start
sleep 3

# Start frontend in foreground with colored output  
(
    cd frontend
    echo -e "${GREEN}[FRONTEND] Starting on port $FRONTEND_PORT...${NC}"
    PORT=$FRONTEND_PORT npm run dev 2>&1 | \
    while IFS= read -r line; do
        echo -e "${GREEN}[FRONTEND]${NC} $line"
    done
) &

# Wait for background processes
wait