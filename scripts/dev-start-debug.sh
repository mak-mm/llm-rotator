#!/bin/bash

# Privacy-Preserving LLM Query Fragmentation - Debug Development Startup
# Enhanced version with detailed debugging for SSE and API issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_PORT=8000
FRONTEND_PORT_START=3000
REDIS_PORT=6379

# Debug flags
DEBUG_SSE=true
DEBUG_API=true
DEBUG_REDIS=true
DEBUG_CORS=true

# Function to print colored output with timestamps
print_debug() {
    echo -e "${GRAY}[$(date +'%H:%M:%S.%3N')] [DEBUG] $1${NC}"
}

print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] [INFO] $1${NC}"
}

print_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] [SUCCESS] ✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] [WARN] ⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] [ERROR] ❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}[$(date +'%H:%M:%S')] [INFO] ℹ️  $1${NC}"
}

print_sse_debug() {
    if [ "$DEBUG_SSE" = true ]; then
        echo -e "${PURPLE}[$(date +'%H:%M:%S.%3N')] [SSE-DEBUG] $1${NC}"
    fi
}

print_api_debug() {
    if [ "$DEBUG_API" = true ]; then
        echo -e "${CYAN}[$(date +'%H:%M:%S.%3N')] [API-DEBUG] $1${NC}"
    fi
}

print_redis_debug() {
    if [ "$DEBUG_REDIS" = true ]; then
        echo -e "${YELLOW}[$(date +'%H:%M:%S.%3N')] [REDIS-DEBUG] $1${NC}"
    fi
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

# Enhanced service wait function with detailed logging
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=60  # Increased for debugging
    local attempt=1

    print_status "Waiting for $service_name to be ready at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        print_debug "Attempt $attempt/$max_attempts - Testing $url"
        
        # Use curl with verbose output for debugging
        local curl_output
        local curl_exit_code
        
        curl_output=$(curl -s -w "HTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\nTIME_CONNECT:%{time_connect}\n" "$url" 2>&1)
        curl_exit_code=$?
        
        print_debug "Curl exit code: $curl_exit_code"
        if [ "$DEBUG_API" = true ]; then
            echo -e "${GRAY}Curl output: $curl_output${NC}"
        fi
        
        if [ $curl_exit_code -eq 0 ]; then
            local http_code=$(echo "$curl_output" | grep "HTTP_CODE:" | cut -d: -f2)
            local time_total=$(echo "$curl_output" | grep "TIME_TOTAL:" | cut -d: -f2)
            
            if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 400 ]; then
                print_success "$service_name is ready! (HTTP $http_code, ${time_total}s)"
                return 0
            else
                print_debug "$service_name returned HTTP $http_code"
            fi
        else
            case $curl_exit_code in
                7) print_debug "Connection refused (service not started yet)" ;;
                28) print_debug "Connection timeout" ;;
                *) print_debug "Curl error code: $curl_exit_code" ;;
            esac
        fi
        
        if [ $attempt -eq 1 ]; then
            print_info "Attempt $attempt/$max_attempts - $service_name not ready yet..."
        elif [ $((attempt % 10)) -eq 0 ]; then
            print_info "Attempt $attempt/$max_attempts - still waiting for $service_name..."
        fi
        
        sleep 1
        ((attempt++))
    done
    
    print_error "$service_name failed to start after $max_attempts attempts"
    return 1
}

# Function to test SSE endpoint specifically
test_sse_endpoint() {
    local base_url=$1
    local test_id="test_$(date +%s)"
    
    print_sse_debug "Testing SSE endpoint with test ID: $test_id"
    
    # Test if SSE endpoint exists
    local sse_url="${base_url}/api/v1/stream/${test_id}"
    print_sse_debug "Testing SSE URL: $sse_url"
    
    # Use curl to test SSE endpoint (should return 404 for non-existent ID, but connection should work)
    local sse_response
    sse_response=$(curl -s -w "HTTP_CODE:%{http_code}\n" -H "Accept: text/event-stream" -H "Cache-Control: no-cache" "$sse_url" --max-time 5 2>&1)
    local sse_exit_code=$?
    
    print_sse_debug "SSE curl exit code: $sse_exit_code"
    print_sse_debug "SSE response: $sse_response"
    
    if [ $sse_exit_code -eq 0 ]; then
        local sse_http_code=$(echo "$sse_response" | grep "HTTP_CODE:" | cut -d: -f2)
        print_sse_debug "SSE HTTP code: $sse_http_code"
        
        if [ "$sse_http_code" = "404" ] || [ "$sse_http_code" = "200" ]; then
            print_success "SSE endpoint is accessible"
            return 0
        else
            print_warning "SSE endpoint returned unexpected HTTP code: $sse_http_code"
        fi
    else
        print_error "SSE endpoint test failed with curl exit code: $sse_exit_code"
    fi
    
    return 1
}

# Function to test CORS configuration
test_cors() {
    local backend_url=$1
    local frontend_port=$2
    
    print_debug "Testing CORS configuration..."
    
    local cors_response
    cors_response=$(curl -s -w "HTTP_CODE:%{http_code}\n" \
        -H "Origin: http://localhost:${frontend_port}" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS "${backend_url}/api/v1/analyze" 2>&1)
    
    local cors_exit_code=$?
    print_debug "CORS test exit code: $cors_exit_code"
    print_debug "CORS response: $cors_response"
    
    if [ $cors_exit_code -eq 0 ]; then
        local cors_http_code=$(echo "$cors_response" | grep "HTTP_CODE:" | cut -d: -f2)
        if [ "$cors_http_code" = "200" ]; then
            print_success "CORS configuration is working"
        else
            print_warning "CORS preflight returned HTTP $cors_http_code"
        fi
    else
        print_error "CORS test failed"
    fi
}

# Function to test Redis connectivity
test_redis() {
    local redis_port=$1
    
    print_redis_debug "Testing Redis connectivity on port $redis_port..."
    
    if command -v redis-cli >/dev/null 2>&1; then
        local redis_response
        redis_response=$(redis-cli -p $redis_port ping 2>&1)
        local redis_exit_code=$?
        
        print_redis_debug "Redis ping exit code: $redis_exit_code"
        print_redis_debug "Redis response: $redis_response"
        
        if [ $redis_exit_code -eq 0 ] && [ "$redis_response" = "PONG" ]; then
            print_success "Redis is responding correctly"
            
            # Test basic operations
            redis-cli -p $redis_port set test_key "test_value" >/dev/null 2>&1
            local test_value=$(redis-cli -p $redis_port get test_key 2>/dev/null)
            redis-cli -p $redis_port del test_key >/dev/null 2>&1
            
            if [ "$test_value" = "test_value" ]; then
                print_success "Redis read/write operations working"
            else
                print_warning "Redis read/write test failed"
            fi
        else
            print_error "Redis ping failed"
        fi
    else
        print_warning "redis-cli not available for testing"
        # Test with nc if available
        if command -v nc >/dev/null 2>&1; then
            if nc -z localhost $redis_port 2>/dev/null; then
                print_info "Redis port is responding (basic connectivity)"
            else
                print_error "Redis port is not responding"
            fi
        fi
    fi
}

# Enhanced cleanup function
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
        sleep 2
        # Force kill if still running
        kill -9 $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        print_status "Stopping frontend server (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
        sleep 2
        # Force kill if still running
        kill -9 $FRONTEND_PID 2>/dev/null || true
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
echo -e "${PURPLE}=====================================================================${NC}"
echo -e "${PURPLE}  Privacy-Preserving LLM Query Fragmentation - Debug Dev Setup${NC}"
echo -e "${PURPLE}=====================================================================${NC}"
echo
echo -e "${CYAN}Debug Flags Enabled:${NC}"
echo -e "  🔍 SSE Debug: ${GREEN}$DEBUG_SSE${NC}"
echo -e "  🔍 API Debug: ${GREEN}$DEBUG_API${NC}"
echo -e "  🔍 Redis Debug: ${GREEN}$DEBUG_REDIS${NC}"
echo -e "  🔍 CORS Debug: ${GREEN}$DEBUG_CORS${NC}"
echo

print_status "Starting development environment with enhanced debugging..."

# Change to project root
cd "$PROJECT_ROOT"

# Check prerequisites with detailed logging
print_status "Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is required but not installed"
    exit 1
fi
python_version=$(python3 --version 2>&1)
print_debug "Python version: $python_version"

if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed"
    exit 1
fi
node_version=$(node --version 2>&1)
print_debug "Node.js version: $node_version"

if ! command -v docker &> /dev/null; then
    print_error "Docker is required but not installed"
    exit 1
fi
docker_version=$(docker --version 2>&1)
print_debug "Docker version: $docker_version"

print_success "Prerequisites check passed"

# Check environment file with detailed logging
print_status "Checking environment configuration..."
if [ ! -f ".env" ]; then
    print_warning ".env file not found - creating basic configuration"
    cat > .env << 'EOF'
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_LOG_LEVEL=DEBUG
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
    print_warning "Created basic .env file. Please add your API keys."
fi

# Load and validate environment
set -a  # Export all variables
source .env
set +a

print_debug "Environment variables loaded:"
print_debug "  API_LOG_LEVEL=$API_LOG_LEVEL"
print_debug "  ENVIRONMENT=$ENVIRONMENT"
print_debug "  REDIS_URL=$REDIS_URL"

# Check port availability with detailed logging
print_status "Checking port availability..."

# Check backend port
if check_port $BACKEND_PORT; then
    print_warning "Port $BACKEND_PORT is already in use"
    
    # Show what's using the port
    local port_info
    port_info=$(lsof -i :$BACKEND_PORT 2>/dev/null | head -2)
    print_debug "Port $BACKEND_PORT usage:\n$port_info"
    
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Find available frontend port
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

# Update environment for CORS
export FRONTEND_URL="http://localhost:$FRONTEND_PORT"
print_debug "Updated FRONTEND_URL=$FRONTEND_URL"

# Start Redis with detailed logging
print_status "Setting up Redis..."
REDIS_STARTED=false

if ! check_port $REDIS_PORT; then
    print_status "Starting Redis container..."
    
    # Stop any existing container
    docker stop llm-rotator-redis >/dev/null 2>&1 || true
    docker rm llm-rotator-redis >/dev/null 2>&1 || true
    
    # Start Redis with detailed logging
    docker run -d \
        --name llm-rotator-redis \
        -p ${REDIS_PORT}:6379 \
        redis:7-alpine \
        redis-server --appendonly yes --loglevel debug
    
    REDIS_STARTED=true
    print_debug "Waiting for Redis to start..."
    sleep 3
    
    # Test Redis connectivity
    test_redis $REDIS_PORT
    print_success "Redis started on port $REDIS_PORT"
else
    print_info "Redis is already running on port $REDIS_PORT"
    test_redis $REDIS_PORT
fi

# Install dependencies with detailed logging
print_status "Installing backend dependencies..."
if [ -f "requirements.txt" ]; then
    print_debug "Installing from requirements.txt..."
    pip install -r requirements.txt 2>&1 | while read line; do
        print_debug "pip: $line"
    done
    print_success "Backend dependencies installed"
else
    print_warning "requirements.txt not found - skipping backend dependency installation"
fi

print_status "Installing frontend dependencies..."
cd frontend
if [ -f "package.json" ]; then
    print_debug "Installing from package.json..."
    npm install 2>&1 | while read line; do
        print_debug "npm: $line"
    done
    print_success "Frontend dependencies installed"
else
    print_error "frontend/package.json not found"
    exit 1
fi
cd ..

# Start backend server with enhanced logging
print_status "Starting backend server on port $BACKEND_PORT with DEBUG logging..."
cd "$PROJECT_ROOT"

# Create named pipes for enhanced log streaming
if [ ! -p backend_pipe ]; then
    mkfifo backend_pipe
fi

# Start backend with enhanced logging and debugging
print_debug "Backend command: python3 -m uvicorn src.api.main:app --reload --host 0.0.0.0 --port $BACKEND_PORT --log-level debug"
python3 -m uvicorn src.api.main:app --reload --host 0.0.0.0 --port $BACKEND_PORT --log-level debug > backend_pipe 2>&1 &
BACKEND_PID=$!
print_debug "Backend started with PID: $BACKEND_PID"

# Enhanced backend log streaming with SSE-specific filtering
(
    while read line; do
        # Color-code different types of log messages
        if [[ "$line" == *"SSE"* ]] || [[ "$line" == *"EventSource"* ]] || [[ "$line" == *"stream"* ]]; then
            echo -e "${PURPLE}[BACKEND-SSE]${NC} $line"
        elif [[ "$line" == *"ERROR"* ]] || [[ "$line" == *"error"* ]]; then
            echo -e "${RED}[BACKEND-ERROR]${NC} $line"
        elif [[ "$line" == *"WARNING"* ]] || [[ "$line" == *"warning"* ]]; then
            echo -e "${YELLOW}[BACKEND-WARN]${NC} $line"
        elif [[ "$line" == *"Redis"* ]] || [[ "$line" == *"redis"* ]]; then
            echo -e "${YELLOW}[BACKEND-REDIS]${NC} $line"
        elif [[ "$line" == *"CORS"* ]] || [[ "$line" == *"cors"* ]]; then
            echo -e "${BLUE}[BACKEND-CORS]${NC} $line"
        else
            echo -e "${CYAN}[BACKEND]${NC} $line"
        fi
    done < backend_pipe
) &
BACKEND_LOG_PID=$!

# Wait for backend with enhanced testing
if wait_for_service "http://localhost:$BACKEND_PORT/health" "Backend API"; then
    print_success "Backend server running at http://localhost:$BACKEND_PORT"
    print_info "API docs available at http://localhost:$BACKEND_PORT/docs"
    
    # Test SSE endpoint specifically
    print_status "Testing SSE endpoint..."
    test_sse_endpoint "http://localhost:$BACKEND_PORT"
    
    # Test CORS configuration
    if [ "$DEBUG_CORS" = true ]; then
        print_status "Testing CORS configuration..."
        test_cors "http://localhost:$BACKEND_PORT" "$FRONTEND_PORT"
    fi
    
    # Test API endpoints
    print_api_debug "Testing /api/v1/providers endpoint..."
    curl -s "http://localhost:$BACKEND_PORT/api/v1/providers" | head -3 | while read line; do
        print_api_debug "API response: $line"
    done
    
else
    print_error "Backend server failed to start. Check logs above."
    exit 1
fi

# Start frontend server with enhanced logging
print_status "Starting frontend server on port $FRONTEND_PORT..."
cd frontend

# Create named pipe for frontend logs
if [ ! -p ../frontend_pipe ]; then
    mkfifo ../frontend_pipe
fi

# Start frontend with enhanced logging
print_debug "Frontend command: PORT=$FRONTEND_PORT npm run dev"
PORT=$FRONTEND_PORT npm run dev > ../frontend_pipe 2>&1 &
FRONTEND_PID=$!
print_debug "Frontend started with PID: $FRONTEND_PID"

# Enhanced frontend log streaming with SSE-specific filtering
(
    while read line; do
        # Color-code different types of frontend messages
        if [[ "$line" == *"SSE"* ]] || [[ "$line" == *"EventSource"* ]] || [[ "$line" == *"useSSE"* ]]; then
            echo -e "${PURPLE}[FRONTEND-SSE]${NC} $line"
        elif [[ "$line" == *"error"* ]] || [[ "$line" == *"Error"* ]] || [[ "$line" == *"ERROR"* ]]; then
            echo -e "${RED}[FRONTEND-ERROR]${NC} $line"
        elif [[ "$line" == *"warn"* ]] || [[ "$line" == *"Warning"* ]] || [[ "$line" == *"WARN"* ]]; then
            echo -e "${YELLOW}[FRONTEND-WARN]${NC} $line"
        elif [[ "$line" == *"Ready"* ]] || [[ "$line" == *"Local:"* ]] || [[ "$line" == *"Network:"* ]]; then
            echo -e "${GREEN}[FRONTEND-STATUS]${NC} $line"
        else
            echo -e "${GREEN}[FRONTEND]${NC} $line"
        fi
    done < ../frontend_pipe
) &
FRONTEND_LOG_PID=$!

cd ..

# Wait for frontend with enhanced testing
if wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend app"; then
    print_success "Frontend server running at http://localhost:$FRONTEND_PORT"
else
    print_error "Frontend server failed to start. Check logs above."
    exit 1
fi

# Print comprehensive status summary
echo
echo -e "${GREEN}🚀 Development environment is ready with enhanced debugging!${NC}"
echo
echo -e "${CYAN}Services:${NC}"
echo -e "  📊 Frontend:    ${YELLOW}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  🔧 Backend:     ${YELLOW}http://localhost:$BACKEND_PORT${NC}"
echo -e "  📚 API Docs:    ${YELLOW}http://localhost:$BACKEND_PORT/docs${NC}"
echo -e "  🗄️  Redis:       ${YELLOW}localhost:$REDIS_PORT${NC}"
echo
echo -e "${CYAN}Debug Endpoints:${NC}"
echo -e "  🔍 Health:      ${YELLOW}http://localhost:$BACKEND_PORT/health${NC}"
echo -e "  🔍 Providers:   ${YELLOW}http://localhost:$BACKEND_PORT/api/v1/providers${NC}"
echo -e "  🔍 SSE Test:    ${YELLOW}http://localhost:$BACKEND_PORT/api/v1/stream/test${NC}"
echo
echo -e "${CYAN}Logs:${NC}"
echo -e "  📄 Backend:     ${YELLOW}Enhanced streaming with SSE/Error/Redis filtering${NC}"
echo -e "  📄 Frontend:    ${YELLOW}Enhanced streaming with SSE/Error filtering${NC}"
echo
echo -e "${PURPLE}SSE Troubleshooting:${NC}"
echo -e "  🔧 Check browser Network tab for failed SSE connections"
echo -e "  🔧 Look for ${PURPLE}[BACKEND-SSE]${NC} and ${PURPLE}[FRONTEND-SSE]${NC} messages above"
echo -e "  🔧 Monitor EventSource readyState: 0=CONNECTING, 1=OPEN, 2=CLOSED"
echo -e "  🔧 CORS issues will show as ${BLUE}[BACKEND-CORS]${NC} messages"
echo
echo -e "${GREEN}Press Ctrl+C to stop all services${NC}"
echo

# Keep the script running and wait for user interrupt
while true; do
    sleep 1
done