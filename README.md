# Privacy-Preserving LLM Query Fragmentation PoC

A proof-of-concept system that fragments user queries and distributes them across multiple LLM providers (OpenAI, Claude, Gemini) to ensure no single provider has complete context, thereby maximizing user privacy while maintaining response quality.

## 🎯 Key Features

- **Query Fragmentation**: Splits queries into privacy-preserving fragments
- **Multi-Provider Distribution**: Routes fragments to OpenAI, Anthropic, and Google
- **Intelligent Orchestration**: Uses Claude 4 Opus for complex decision-making
- **PII Detection**: Automatic detection and anonymization using Presidio
- **Sub-2 Second Performance**: Optimized for rapid responses
- **Visual Demonstration**: Real-time UI showing privacy preservation

## 🏗️ Architecture

### Core Components

1. **Detection Engine** - Analyzes queries for PII, code, and sensitive content
2. **Orchestrator** - Claude 4 Opus decides fragmentation strategies
3. **Fragment Processor** - Executes fragmentation and anonymization
4. **LLM Router** - Distributes fragments across providers
5. **Response Aggregator** - Combines responses coherently
6. **Visualization UI** - Demonstrates privacy measures visually

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Docker and Docker Compose
- API keys for OpenAI, Anthropic, and Google

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd LLM-Model-Rotator
```

2. Copy and configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Run with Docker:
```bash
docker-compose up
```

4. Access the application:
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Demo UI: http://localhost:3000

### Development Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

3. Run Redis:
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

4. Start the API:
```bash
uvicorn src.api.main:app --reload
```

## 📊 API Endpoints

- `POST /api/v1/analyze` - Submit query for analysis and fragmentation
- `GET /api/v1/status/{request_id}` - Check processing status
- `GET /api/v1/visualization/{request_id}` - Get visualization data
- `GET /api/v1/providers` - List available LLM providers
- `GET /api/v1/demo/scenarios` - Get demo scenarios

## 🧪 Demo Scenarios

1. **Medical Query with PII**: Demonstrates PII detection and anonymization
2. **Business Intelligence**: Shows business data fragmentation
3. **Technical Debugging**: Illustrates code analysis distribution

## 🔒 Privacy Features

- No single provider sees >40% of context
- Automatic PII detection and removal
- Timing attack defense
- Secure state management
- No logging of sensitive data

## 📈 Performance Targets

- 95% of queries complete in <2 seconds
- <200ms fragmentation time
- <100ms detection analysis
- <500ms response aggregation

## 🛠️ Development

### Running Tests
```bash
pytest tests/
pytest --cov=src tests/
```

### Linting
```bash
ruff check src/ tests/
black src/ tests/
mypy src/
```

## 📝 License

This is a proof-of-concept for demonstration purposes.

## 🤝 Contributing

This is an internal PoC project. Please refer to internal guidelines for contributions.