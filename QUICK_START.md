# 🚀 Quick Start Guide

Get the Privacy-Preserving LLM Query Fragmentation PoC running in minutes!

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** 
- **Docker** (for Redis)
- **Git**

## 🏃‍♂️ One-Command Start

```bash
# Start the complete development environment
make dev-full
```

This will:
- ✅ Check prerequisites
- ✅ Start Redis container
- ✅ Install dependencies
- ✅ Start backend API on http://localhost:8000
- ✅ Start frontend on http://localhost:3000 (or next available port)
- ✅ Show real-time status
- ✅ **Automatically find available ports if defaults are in use**

## 📝 API Keys Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your API keys:
   ```bash
   # LLM Provider API Keys (REQUIRED)
   OPENAI_API_KEY=your_actual_openai_key
   ANTHROPIC_API_KEY=your_actual_anthropic_key  
   GOOGLE_API_KEY=your_actual_google_key
   ```

## 🎯 Access Points

Once running:

- **🌐 Frontend**: http://localhost:3000 (or displayed port)
- **🔧 Backend API**: http://localhost:8000
- **📚 API Documentation**: http://localhost:8000/docs
- **🔄 Real-time Updates**: Server-Sent Events (SSE) at http://localhost:8000/api/v1/stream/{request_id}

> **Note**: The frontend will automatically use the next available port if 3000 is busy. The actual port will be displayed in the terminal output.

## 🛠️ Manual Setup (Step by Step)

If you prefer to start services individually:

### 1. Install Dependencies
```bash
# Backend dependencies
pip install -r requirements.txt

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Start Redis
```bash
make dev-redis
```

### 3. Start Backend
```bash
make dev-backend
```

### 4. Start Frontend (new terminal)
```bash
make dev-frontend
```

## 🧪 Testing

```bash
# Run all tests
make test

# Run with coverage
make test-coverage

# Run specific test types
make test-unit
make test-integration
```

## 🔧 Available Commands

```bash
make help                 # Show all available commands
make dev-full            # Start complete environment
make dev-backend         # Start backend only
make dev-frontend        # Start frontend only
make dev-stop            # Stop all services
make test                # Run tests
make lint                # Code linting
make format              # Format code
```

## 🎮 Demo Features

The system includes several demo scenarios:

1. **Simple Query** - Basic factual questions
2. **PII Query** - Queries containing personal information
3. **Code Review** - Code analysis and security review
4. **Medical Query** - Healthcare-related questions

### Demo Mode Access:
- Navigate to `/demo` in the frontend
- Click "Start Demo" to see automated scenarios
- Watch real-time fragmentation and privacy scoring

## 📊 Monitoring

Real-time monitoring available:

- **Provider Status** - Live health of LLM providers
- **Analytics Dashboard** - Query metrics and insights
- **WebSocket Updates** - Real-time status changes

## 🛑 Stopping Services

```bash
make dev-stop
```

Or press `Ctrl+C` in the terminal running `make dev-full`.

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Check what's using the ports
lsof -i :8000  # Backend
lsof -i :3000  # Frontend
lsof -i :6379  # Redis
```

### Redis Connection Issues
```bash
# Restart Redis container
make dev-stop
make dev-redis
```

### API Key Issues
- Ensure all three provider keys are set in `.env`
- Check API key validity with providers
- Restart backend after updating keys

### Frontend Build Issues
```bash
cd frontend
npm install
npm run build
```

## 📁 Project Structure

```
├── frontend/          # Next.js frontend
├── src/              # Python backend
│   ├── api/          # FastAPI routes
│   ├── detection/    # PII/code detection
│   ├── fragmentation/# Query fragmentation
│   ├── providers/    # LLM provider integrations
│   └── orchestrator/ # Query orchestration
├── tests/            # Backend tests
└── scripts/          # Development scripts
```

## 🎉 Next Steps

1. **Explore the UI** - Visit http://localhost:3000
2. **Try API endpoints** - Check http://localhost:8000/docs
3. **Run demo scenarios** - Navigate to the Demo page
4. **Monitor real-time** - Watch provider status updates
5. **Submit test queries** - Try the Query Interface

Happy coding! 🚀