# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

The **LLM-Model-Rotator** project is a Privacy-Preserving LLM Query Fragmentation PoC that fragments user queries and distributes them across multiple LLM providers (OpenAI, Claude, Gemini) to ensure no single provider has complete context, maximizing user privacy while maintaining response quality.

## Project Architecture

### Core Components

1. **Detection Engine** - Analyzes queries for PII, code, and sensitive content using Presidio, Guesslang, and spaCy
2. **Orchestrator** - Claude 4 Opus decides fragmentation strategies for complex queries
3. **Fragment Processor** - Executes fragmentation and anonymization
4. **LLM Router** - Routes fragments to optimal providers (GPT-4.1, Claude 4 Sonnet, Gemini 2.5 Flash)
5. **Response Aggregator** - Combines partial responses into coherent answers
6. **Visualization UI** - Demonstrates privacy preservation visually

### Technology Stack

- **Language**: Python 3.11+
- **Framework**: FastAPI
- **State Management**: Redis
- **Deployment**: Docker Compose
- **Detection Libraries**: Presidio (PII), Guesslang (code), spaCy (NLP)
- **LLM APIs**: OpenAI, Anthropic, Google

### Project Structure (To Be Implemented)

```
src/
├── api/               # FastAPI endpoints
├── detection/         # Query analysis (Presidio, Guesslang, spaCy)
├── fragmentation/     # Fragmentation strategies
├── orchestration/     # Claude 4 Opus orchestrator
├── providers/         # LLM provider integrations
├── aggregation/       # Response combination logic
├── visualization/     # UI components
└── utils/            # Shared utilities
```

## Development Commands

Once implemented, the project will use:

```bash
# Environment setup
python -m venv venv
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# Development
uvicorn src.api.main:app --reload --port 8000

# Testing
pytest tests/
pytest --cov=src tests/

# Linting
ruff check src/ tests/
black src/ tests/
mypy src/

# Docker
docker-compose up -d
docker-compose down
```

## Implementation Guidelines

### When implementing this PoC:

1. **Performance Target**: Sub-2 second response time for typical queries
2. **Privacy First**: No single LLM provider should see complete context
3. **Visual Clarity**: UI must clearly demonstrate privacy preservation
4. **Cost Optimization**: Route simple queries to cost-efficient models
5. **Error Handling**: Graceful fallbacks if providers fail

### API Design

- RESTful endpoints with clear separation:
  - `POST /analyze` - Submit query for analysis
  - `GET /status/{request_id}` - Check processing status
  - `GET /visualization/{request_id}` - Get privacy visualization data

### Provider Integration

- **GPT-4.1**: Complex reasoning, code generation (1M context)
- **Claude 4 Sonnet**: Analysis, safety-critical content
- **Gemini 2.5 Flash**: Simple factual queries (cost-efficient)
- **Claude 4 Opus**: Orchestration only (not for direct queries)

### Environment Configuration

```bash
# LLM Provider Keys
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Orchestrator Settings
ORCHESTRATOR_MODEL=claude-4-opus
ORCHESTRATOR_THRESHOLD=0.7  # Complexity threshold

# Performance Settings
MAX_RESPONSE_TIME=2.0
CACHE_TTL=3600
```

## Quality Requirements

1. **Privacy**: Verifiable fragmentation with no complete context exposure
2. **Performance**: 95% of queries respond in <2 seconds
3. **Coherence**: Aggregated responses maintain quality
4. **Demonstrability**: Clear visual privacy indicators
5. **Cost Efficiency**: 70% reduction vs GPT-4 only approach

## Testing Strategy

- **Unit Tests**: Detection, fragmentation, and aggregation logic
- **Integration Tests**: Provider API interactions
- **Performance Tests**: Response time benchmarks
- **Privacy Tests**: Verify no complete context in fragments
- **Visual Tests**: UI demonstration clarity