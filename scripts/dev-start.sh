#!/bin/bash

# Privacy-Preserving LLM Query Fragmentation - Development Startup Script
# This script starts the complete development environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_PORT=8000
FRONTEND_PORT_START=3000
REDIS_PORT=6379

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

print_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}[$(date +'%H:%M:%S')] ℹ️  $1${NC}"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to find next available port starting from a given port
find_available_port() {
    local start_port=$1
    local max_attempts=50
    local port=$start_port
    
    while [ $((port - start_port)) -lt $max_attempts ]; do
        if ! check_port $port; then
            echo $port
            return 0
        fi
        ((port++))
    done
    
    print_error "Could not find an available port after $max_attempts attempts starting from $start_port"
    return 1
}

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        if [ $attempt -eq 1 ]; then
            print_info "Attempt $attempt/$max_attempts - $service_name not ready yet..."
        elif [ $((attempt % 5)) -eq 0 ]; then
            print_info "Attempt $attempt/$max_attempts - still waiting for $service_name..."
        fi
        
        sleep 2
        ((attempt++))
    done
    
    print_error "$service_name failed to start after $max_attempts attempts"
    return 1
}

# Function to cleanup on exit
cleanup() {
    print_status "Shutting down development environment..."
    
    # Kill log streaming processes
    if [ ! -z "$BACKEND_LOG_PID" ]; then
        kill $BACKEND_LOG_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_LOG_PID" ]; then
        kill $FRONTEND_LOG_PID 2>/dev/null || true
    fi
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        print_status "Stopping backend server (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        print_status "Stopping frontend server (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Clean up named pipes
    rm -f backend_pipe frontend_pipe 2>/dev/null || true
    
    # Stop Redis if we started it
    if [ "$REDIS_STARTED" = "true" ]; then
        print_status "Stopping Redis container..."
        docker stop llm-rotator-redis >/dev/null 2>&1 || true
        docker rm llm-rotator-redis >/dev/null 2>&1 || true
    fi
    
    print_success "Development environment shut down complete"
    exit 0
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Print banner
echo
echo -e "${PURPLE}============================================================${NC}"
echo -e "${PURPLE}  Privacy-Preserving LLM Query Fragmentation - Dev Setup${NC}"
echo -e "${PURPLE}============================================================${NC}"
echo

print_status "Starting development environment..."

# Change to project root
cd "$PROJECT_ROOT"

# Check prerequisites
print_status "Checking prerequisites..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is required but not installed"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed"
    exit 1
fi

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    print_error "Docker is required but not installed"
    exit 1
fi

print_success "Prerequisites check passed"

# Check environment file
if [ ! -f ".env" ]; then
    print_warning ".env file not found"
    if [ -f ".env.example" ]; then
        print_status "Creating .env from .env.example..."
        cp .env.example .env
        print_warning "Please edit .env and add your API keys before running again"
        exit 1
    else
        print_warning "Creating basic .env file..."
        cat > .env << EOF
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_LOG_LEVEL=INFO
API_RELOAD=true
ENVIRONMENT=development

# Frontend Configuration  
FRONTEND_URL=http://localhost:3000

# Redis Configuration
REDIS_URL=redis://localhost:6379

# LLM Provider API Keys (add your keys here)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
GOOGLE_API_KEY=your_google_key_here

# Orchestrator Configuration
ORCHESTRATOR_MODEL=claude-4-opus
ORCHESTRATOR_THRESHOLD=0.7

# Performance Settings
MAX_RESPONSE_TIME=2.0
CACHE_TTL=3600
EOF
        print_warning "Created .env file. Please add your API keys before running again"
        exit 1
    fi
fi

# Check port availability
print_status "Checking port availability..."

# Check backend port
if check_port $BACKEND_PORT; then
    print_warning "Port $BACKEND_PORT is already in use. Backend might already be running."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Find available frontend port dynamically
FRONTEND_PORT=$(find_available_port $FRONTEND_PORT_START)
if [ $? -ne 0 ]; then
    print_error "Could not find an available port for frontend"
    exit 1
fi

if [ "$FRONTEND_PORT" -ne "$FRONTEND_PORT_START" ]; then
    print_warning "Port $FRONTEND_PORT_START is already in use"
    print_success "Using port $FRONTEND_PORT for frontend instead"
else
    print_success "Port $FRONTEND_PORT is available for frontend"
fi

# Start Redis if not running
print_status "Setting up Redis..."
REDIS_STARTED=false

if ! check_port $REDIS_PORT; then
    print_status "Starting Redis container..."
    docker run -d \
        --name llm-rotator-redis \
        -p ${REDIS_PORT}:6379 \
        redis:7-alpine \
        redis-server --appendonly yes
    
    REDIS_STARTED=true
    sleep 3
    print_success "Redis started on port $REDIS_PORT"
else
    print_info "Redis is already running on port $REDIS_PORT"
fi

# Install backend dependencies
print_status "Installing backend dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt >/dev/null 2>&1
    print_success "Backend dependencies installed"
else
    print_warning "requirements.txt not found - skipping backend dependency installation"
fi

# Install frontend dependencies
print_status "Installing frontend dependencies..."
cd frontend
if [ -f "package.json" ]; then
    npm install >/dev/null 2>&1
    print_success "Frontend dependencies installed"
else
    print_error "frontend/package.json not found"
    exit 1
fi
cd ..

# Start backend server
print_status "Starting backend server on port $BACKEND_PORT..."
cd "$PROJECT_ROOT"
# Export frontend URL for CORS configuration
export FRONTEND_URL="http://localhost:$FRONTEND_PORT"

# Create named pipes for streaming logs
if [ ! -p backend_pipe ]; then
    mkfifo backend_pipe
fi

# Start backend with streaming logs
python3 -m uvicorn src.api.main:app --reload --host 0.0.0.0 --port $BACKEND_PORT > backend_pipe 2>&1 &
BACKEND_PID=$!

# Stream backend logs with prefix
(
    while read line; do
        echo -e "${CYAN}[BACKEND]${NC} $line"
    done < backend_pipe
) &
BACKEND_LOG_PID=$!

# Wait for backend to be ready
if wait_for_service "http://localhost:$BACKEND_PORT/health" "Backend API"; then
    print_success "Backend server running at http://localhost:$BACKEND_PORT"
    print_info "API docs available at http://localhost:$BACKEND_PORT/docs"
else
    print_error "Backend server failed to start. Check backend.log for details."
    exit 1
fi

# Start frontend server
print_status "Starting frontend server on port $FRONTEND_PORT..."
cd frontend

# Create named pipe for frontend logs
if [ ! -p ../frontend_pipe ]; then
    mkfifo ../frontend_pipe
fi

# Use PORT environment variable to set the port dynamically
PORT=$FRONTEND_PORT npm run dev > ../frontend_pipe 2>&1 &
FRONTEND_PID=$!

# Stream frontend logs with prefix
(
    while read line; do
        echo -e "${GREEN}[FRONTEND]${NC} $line"
    done < ../frontend_pipe
) &
FRONTEND_LOG_PID=$!

cd ..

# Wait for frontend to be ready
if wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend app"; then
    print_success "Frontend server running at http://localhost:$FRONTEND_PORT"
else
    print_error "Frontend server failed to start. Check frontend.log for details."
    exit 1
fi

# Print status summary
echo
echo -e "${GREEN}🚀 Development environment is ready!${NC}"
echo
echo -e "${CYAN}Services:${NC}"
echo -e "  📊 Frontend:  ${YELLOW}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  🔧 Backend:   ${YELLOW}http://localhost:$BACKEND_PORT${NC}"
echo -e "  📚 API Docs:  ${YELLOW}http://localhost:$BACKEND_PORT/docs${NC}"
echo -e "  🗄️  Redis:     ${YELLOW}localhost:$REDIS_PORT${NC}"
echo
echo -e "${CYAN}Logs:${NC}"
echo -e "  📄 Backend:   ${YELLOW}Streaming live below with [BACKEND] prefix${NC}"
echo -e "  📄 Frontend:  ${YELLOW}Streaming live below with [FRONTEND] prefix${NC}"
echo
echo -e "${CYAN}Testing:${NC}"
echo -e "  🧪 Run tests: ${YELLOW}make test${NC}"
echo -e "  📈 Coverage:  ${YELLOW}make test-coverage${NC}"
echo
echo -e "${GREEN}Press Ctrl+C to stop all services${NC}"
echo

# Keep the script running and wait for user interrupt
while true; do
    sleep 1
done