#!/bin/bash

# Simple development startup script for LLM Model Rotator
# Starts both backend and frontend with colored output

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo
echo -e "${CYAN}🚀 Starting LLM Model Rotator Development Environment${NC}"
echo

# Function to cleanup on exit
cleanup() {
    echo
    echo -e "${YELLOW}Shutting down...${NC}"
    
    # Kill all child processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # Wait a moment
    sleep 1
    
    # Kill processes on specific ports
    echo -e "${YELLOW}Cleaning up ports...${NC}"
    lsof -ti:8003 | xargs kill -9 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    # Kill any uvicorn processes
    pkill -f "uvicorn.*src.api.main" 2>/dev/null || true
    
    # Kill any npm/node processes related to our frontend
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    
    # Redis runs as system service, no need to stop
    
    # Clear Redis data for fresh start
    redis-cli FLUSHALL >/dev/null 2>&1 || true
    
    echo -e "${GREEN}✅ Shutdown complete${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check if ports are in use and kill existing processes
echo -e "${BLUE}Checking for existing processes...${NC}"

# Aggressively kill processes on our ports
echo -e "${YELLOW}Forcefully clearing ports 8003 and 3000...${NC}"

# Kill port 8003 (backend) - try normal kill first, then force kill
if lsof -ti:8003 >/dev/null 2>&1; then
    echo -e "${YELLOW}  Stopping backend process on port 8003...${NC}"
    lsof -ti:8003 | xargs kill 2>/dev/null || true
    sleep 1
    # If still running, force kill
    if lsof -ti:8003 >/dev/null 2>&1; then
        echo -e "${RED}  Force killing backend process on port 8003...${NC}"
        lsof -ti:8003 | xargs kill -9 2>/dev/null || true
    fi
fi

# Kill port 3000 (frontend) - try normal kill first, then force kill  
if lsof -ti:3000 >/dev/null 2>&1; then
    echo -e "${YELLOW}  Stopping frontend process on port 3000...${NC}"
    lsof -ti:3000 | xargs kill 2>/dev/null || true
    sleep 1
    # If still running, force kill
    if lsof -ti:3000 >/dev/null 2>&1; then
        echo -e "${RED}  Force killing frontend process on port 3000...${NC}"
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    fi
fi

# Also kill any uvicorn processes that might be hanging
pkill -f "uvicorn.*src.api.main" 2>/dev/null || true

# Kill any npm/node processes that might be hanging
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

# Clear Redis to ensure fresh start
echo -e "${YELLOW}Clearing Redis cache...${NC}"
redis-cli FLUSHALL >/dev/null 2>&1 || true

sleep 3

# Check if Redis is running locally
if ! redis-cli ping >/dev/null 2>&1; then
    echo -e "${BLUE}Starting Redis...${NC}"
    # Try to start Redis via Homebrew service
    brew services start redis >/dev/null 2>&1 || true
    sleep 2
    
    # If still not running, warn user
    if ! redis-cli ping >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Redis not running. Please start manually: brew services start redis${NC}"
    fi
else
    echo -e "${GREEN}✅ Redis already running${NC}"
fi

# Install dependencies quietly
echo -e "${BLUE}Installing dependencies...${NC}"
pip install -r requirements.txt >/dev/null 2>&1 || true
cd frontend && npm install >/dev/null 2>&1 && cd .. || true

echo -e "${GREEN}✅ Environment ready!${NC}"
echo
echo -e "${CYAN}Services:${NC}"
echo -e "  🌐 Frontend: ${YELLOW}http://localhost:3000${NC}"
echo -e "  🔧 Backend:  ${YELLOW}http://localhost:8003${NC}"
echo -e "  📚 API Docs: ${YELLOW}http://localhost:8003/docs${NC}"
echo
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo

# Start backend with verbose output for debugging
echo -e "${BLUE}[BACKEND] Starting...${NC}"
(
    # Activate virtual environment and start backend
    source venv/bin/activate 2>/dev/null || echo -e "${YELLOW}Warning: No virtual environment found${NC}"
    uvicorn src.api.main:app --reload --port 8003 --host 0.0.0.0 2>&1 | \
    while IFS= read -r line; do
        # Skip only the most repetitive lines, but show errors/warnings
        if [[ "$line" == *"presidio-analyzer"* ]] && [[ "$line" == *"Loaded recognizer"* ]]; then
            continue
        elif [[ "$line" == *"INFO:"* ]] && [[ "$line" == *"127.0.0.1"* ]] && [[ "$line" == *"200 OK"* ]]; then
            continue  # Skip routine 200 OK requests
        elif [[ "$line" == *"/favicon.ico"* ]] || [[ "$line" == *"/icon-"* ]]; then
            continue  # Skip favicon requests
        fi
        
        # Show ALL important lines including errors, warnings, and stack traces
        if [[ "$line" == *"ERROR"* ]] || [[ "$line" == *"error"* ]] || [[ "$line" == *"Error"* ]]; then
            echo -e "${RED}[BACKEND ERROR]${NC} $line"
        elif [[ "$line" == *"WARNING"* ]] || [[ "$line" == *"warning"* ]] || [[ "$line" == *"Warning"* ]]; then
            echo -e "${YELLOW}[BACKEND WARNING]${NC} $line"
        elif [[ "$line" == *"Traceback"* ]] || [[ "$line" == *"File \""* ]] || [[ "$line" == *"line "*"in"* ]]; then
            echo -e "${RED}[BACKEND TRACE]${NC} $line"
        elif [[ "$line" == *"Exception"* ]] || [[ "$line" == *"exception"* ]]; then
            echo -e "${RED}[BACKEND EXCEPTION]${NC} $line"
        elif [[ "$line" == *"Failed"* ]] || [[ "$line" == *"failed"* ]]; then
            echo -e "${RED}[BACKEND FAILED]${NC} $line"
        elif [[ "$line" == *"404 Not Found"* ]]; then
            echo -e "${YELLOW}[BACKEND 404]${NC} $line"
        elif [[ "$line" == *"500 Internal Server Error"* ]]; then
            echo -e "${RED}[BACKEND 500]${NC} $line"
        elif [[ "$line" == *"Application startup complete"* ]]; then
            echo -e "${GREEN}[BACKEND READY]${NC} ✅ API Server Ready!"
        elif [[ "$line" == *"Uvicorn running"* ]]; then
            echo -e "${GREEN}[BACKEND START]${NC} $line"
        elif [[ "$line" == *"DetectionEngine initialized"* ]]; then
            echo -e "${GREEN}[BACKEND INIT]${NC} 🔍 PII Detection Ready"
        elif [[ "$line" == *"QueryFragmenter initialized"* ]]; then
            echo -e "${GREEN}[BACKEND INIT]${NC} ✂️  Query Fragmenter Ready"
        elif [[ "$line" == *"orchestrator initialized"* ]]; then
            echo -e "${GREEN}[BACKEND INIT]${NC} 🧠 Orchestrator Ready"
        elif [[ "$line" == *"provider"* ]] && [[ "$line" == *"initialized successfully"* ]]; then
            provider=$(echo "$line" | grep -o -E "(OpenAI|Anthropic|Google)" | head -1)
            echo -e "${GREEN}[BACKEND INIT]${NC} 🔗 $provider Provider Ready"
        elif [[ "$line" == *"req_"* ]] && [[ "$line" == *"Query received"* ]]; then
            req_id=$(echo "$line" | grep -o "req_[a-f0-9]*")
            echo -e "${CYAN}[QUERY START]${NC} 📥 $req_id - New Query"
        elif [[ "$line" == *"req_"* ]] && [[ "$line" == *"fragments created"* ]]; then
            fragments=$(echo "$line" | grep -o "[0-9]* fragments")
            req_id=$(echo "$line" | grep -o "req_[a-f0-9]*")
            echo -e "${CYAN}[FRAGMENTATION]${NC} ✂️  $req_id - Created $fragments"
        elif [[ "$line" == *"req_"* ]] && [[ "$line" == *"Processing fragment"* ]]; then
            fragment=$(echo "$line" | grep -o "fragment [0-9]*/[0-9]*")
            provider=$(echo "$line" | grep -o -E "(ANTHROPIC|OPENAI|GOOGLE)")
            req_id=$(echo "$line" | grep -o "req_[a-f0-9]*")
            echo -e "${YELLOW}[PROCESSING]${NC} 🔄 $req_id - $fragment → $provider"
        elif [[ "$line" == *"req_"* ]] && [[ "$line" == *"completed by"* ]]; then
            provider=$(echo "$line" | grep -o -E "(ANTHROPIC|OPENAI|GOOGLE)")
            time=$(echo "$line" | grep -o "[0-9]*\.[0-9]*s")
            req_id=$(echo "$line" | grep -o "req_[a-f0-9]*")
            echo -e "${GREEN}[COMPLETED]${NC} ✅ $req_id - $provider done in $time"
        elif [[ "$line" == *"req_"* ]] && [[ "$line" == *"Query processing COMPLETE"* ]]; then
            req_id=$(echo "$line" | grep -o "req_[a-f0-9]*")
            echo -e "${GREEN}[QUERY DONE]${NC} 🎉 $req_id - Final response ready"
        elif [[ "$line" == *"Will watch for changes"* ]]; then
            echo -e "${BLUE}[BACKEND WATCH]${NC} 👀 Watching for file changes..."
        elif [[ "$line" == *"INFO:"* ]]; then
            # Show INFO lines that aren't routine HTTP requests
            if [[ "$line" != *"200 OK"* ]]; then
                echo -e "${BLUE}[BACKEND INFO]${NC} $line"
            fi
        else
            # Show other lines more liberally for debugging
            if [[ "$line" != *"keepalive"* ]]; then
                echo -e "${CYAN}[BACKEND]${NC} $line"
            fi
        fi
    done
) &

# Give backend time to start
sleep 3

# Start frontend with verbose output for debugging
echo -e "${BLUE}[FRONTEND] Starting...${NC}"
(
    cd frontend
    npm run dev 2>&1 | \
    while IFS= read -r line; do
        # Skip only the most verbose lines, but show warnings and errors
        if [[ "$line" == *"GET /favicon.ico"* ]] || [[ "$line" == *"GET /icon-"* ]]; then
            continue
        elif [[ "$line" == *"🏠 Home - queryResult: null"* ]]; then
            continue  # Skip repetitive home page logs
        fi
        
        # Show ALL important lines including errors, warnings, and stack traces
        if [[ "$line" == *"error"* ]] || [[ "$line" == *"Error"* ]] || [[ "$line" == *"ERROR"* ]]; then
            echo -e "${RED}[FRONTEND ERROR]${NC} $line"
        elif [[ "$line" == *"warning"* ]] || [[ "$line" == *"Warning"* ]] || [[ "$line" == *"WARNING"* ]]; then
            echo -e "${YELLOW}[FRONTEND WARNING]${NC} $line"
        elif [[ "$line" == *"Failed"* ]] || [[ "$line" == *"failed"* ]]; then
            echo -e "${RED}[FRONTEND FAILED]${NC} $line"
        elif [[ "$line" == *"Exception"* ]] || [[ "$line" == *"exception"* ]]; then
            echo -e "${RED}[FRONTEND EXCEPTION]${NC} $line"
        elif [[ "$line" == *"Traceback"* ]] || [[ "$line" == *"File \""* ]]; then
            echo -e "${RED}[FRONTEND TRACE]${NC} $line"
        elif [[ "$line" == *"deprecated"* ]] || [[ "$line" == *"DEPRECATED"* ]]; then
            echo -e "${YELLOW}[FRONTEND DEPRECATED]${NC} $line"
        elif [[ "$line" == *"Ready in"* ]]; then
            time=$(echo "$line" | grep -o "[0-9]*ms")
            echo -e "${GREEN}[FRONTEND READY]${NC} ⚡ Next.js ready in $time"
        elif [[ "$line" == *"Local:"* ]]; then
            url=$(echo "$line" | grep -o "http://localhost:[0-9]*")
            echo -e "${GREEN}[FRONTEND START]${NC} 🌐 Server: $url"
        elif [[ "$line" == *"Network:"* ]]; then
            url=$(echo "$line" | grep -o "http://[0-9.]*:[0-9]*")
            echo -e "${GREEN}[FRONTEND NETWORK]${NC} 🌍 Network: $url"
        elif [[ "$line" == *"Compiled"* ]] && [[ "$line" == *"in"* ]] && [[ "$line" != *"_error"* ]]; then
            page=$(echo "$line" | grep -o "/[^ ]*" | head -1)
            time=$(echo "$line" | grep -o "[0-9]*ms\\|[0-9]*\\.[0-9]*s")
            echo -e "${CYAN}[FRONTEND BUILD]${NC} 📦 $page compiled ($time)"
        elif [[ "$line" == *"Starting"* ]]; then
            echo -e "${BLUE}[FRONTEND INIT]${NC} 🚀 Starting Next.js..."
        elif [[ "$line" == *"Turbopack"* ]] && [[ "$line" == *"Next.js"* ]]; then
            version=$(echo "$line" | grep -o "Next.js [0-9.]*")
            echo -e "${BLUE}[FRONTEND INIT]${NC} ⚡ $version with Turbopack"
        elif [[ "$line" == *"Shutting down"* ]]; then
            echo -e "${YELLOW}[FRONTEND STOP]${NC} 🛑 Development server shutting down"
        elif [[ "$line" == *"Port"* ]] && [[ "$line" == *"availability"* ]]; then
            echo -e "${BLUE}[FRONTEND]${NC} $line"
        elif [[ "$line" == *"SUCCESS"* ]] || [[ "$line" == *"available"* ]]; then
            echo -e "${GREEN}[FRONTEND SUCCESS]${NC} $line"
        else
            # Show more lines for debugging
            echo -e "${CYAN}[FRONTEND]${NC} $line"
        fi
    done
) &

# Wait for all background processes
wait