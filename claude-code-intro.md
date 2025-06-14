# Claude Code Introduction: Privacy-Preserving LLM Query Fragmentation PoC

## Executive Summary

You are tasked with building a proof-of-concept (PoC) system that demonstrates a novel approach to preserving user privacy when interacting with Large Language Models (LLMs). The core innovation is **query fragmentation with model rotation** - breaking user queries into fragments and distributing them across multiple LLM providers so that no single provider ever sees the complete context.

This is an investor-facing demonstration, so code quality, visual clarity, and impressive performance are paramount.

## Problem Statement

### The Privacy Challenge

When users interact with LLM services like ChatGPT, Claude, or Gemini, they send their complete queries to a single provider. This creates several privacy concerns:

1. **Complete Context Exposure**: The LLM provider sees everything - personal information, business secrets, and the full intent
2. **Data Aggregation**: Providers can build detailed profiles by linking queries over time
3. **Vendor Lock-in**: Users must trust a single provider with all their data
4. **Compliance Issues**: GDPR and other regulations require data minimization

### Our Solution: Query Fragmentation with Model Rotation

We solve this by:
1. **Fragmenting** queries into semantically meaningful but privacy-preserving pieces
2. **Routing** different fragments to different LLM providers
3. **Aggregating** responses intelligently to maintain coherence
4. **Rotating** models to prevent any single provider from reconstructing intent

## System Architecture Overview

### Core Components

1. **Detection Engine** (Presidio + Guesslang + spaCy)
   - Analyzes incoming queries for PII, code, and sensitive content
   - Provides factual analysis to guide fragmentation decisions

2. **Orchestrator** (Claude 4 Opus)
   - The "brain" that decides how to fragment complex queries
   - Handles response aggregation to ensure coherence
   - Only activated for complex queries (simple ones use rules)

3. **Fragment Processor**
   - Executes fragmentation strategies (semantic, syntactic, or hybrid)
   - Applies anonymization based on detection results
   - Ensures no fragment contains complete context

4. **LLM Router**
   - Routes fragments to optimal providers:
     - GPT-4.1: Complex reasoning and code (1M token context)
     - Claude 4 Sonnet: Analysis and safety-critical content
     - Gemini 2.5 Flash: Simple factual queries (cost-efficient)

5. **Response Aggregator**
   - Uses Claude 4 Opus to synthesize coherent responses
   - Resolves conflicts between fragment responses
   - Maintains narrative flow without revealing fragmentation

6. **Visualization UI**
   - Real-time display of fragmentation process
   - Shows privacy preservation in action
   - Highlights cost savings and model rotation

### Technology Stack

- **Language**: Python 3.11+
- **Framework**: FastAPI
- **State Management**: Redis
- **Detection Libraries**: 
  - Presidio (PII detection)
  - Guesslang (code detection)
  - spaCy (NLP/entity recognition)
- **Deployment**: Docker Compose
- **UI**: HTML/JS with real-time updates

## Implementation Guide

### Project Structure

```
privacy-llm-poc/
├── src/
│   ├── api/                 # FastAPI endpoints
│   │   ├── main.py         # Application entry point
│   │   ├── routes.py       # API route definitions
│   │   └── models.py       # Pydantic models
│   │
│   ├── detection/          # Content analysis
│   │   ├── engine.py       # Unified detection interface
│   │   ├── pii.py         # Presidio integration
│   │   ├── code.py        # Guesslang integration
│   │   └── entities.py    # spaCy integration
│   │
│   ├── fragmentation/      # Query splitting logic
│   │   ├── base.py        # Abstract fragmenter
│   │   ├── syntactic.py   # Grammar-based splitting
│   │   ├── semantic.py    # Meaning-based splitting
│   │   └── hybrid.py      # Dynamic strategy selection
│   │
│   ├── orchestration/      # Claude 4 Opus integration
│   │   ├── orchestrator.py # Main orchestrator logic
│   │   ├── prompts.py     # Orchestrator prompts
│   │   └── strategies.py  # Decision strategies
│   │
│   ├── providers/          # LLM integrations
│   │   ├── base.py        # Abstract provider
│   │   ├── openai.py      # GPT-4.1 client
│   │   ├── anthropic.py   # Claude clients
│   │   └── google.py      # Gemini client
│   │
│   ├── routing/           # Fragment distribution
│   │   ├── router.py      # Routing logic
│   │   └── policies.py    # Routing policies
│   │
│   ├── aggregation/       # Response synthesis
│   │   ├── aggregator.py  # Main aggregation logic
│   │   └── strategies.py  # Aggregation strategies
│   │
│   ├── security/          # Privacy measures
│   │   ├── timing.py      # Timing attack defense
│   │   ├── anonymizer.py  # PII anonymization
│   │   └── validator.py   # Security validation
│   │
│   ├── state/             # State management
│   │   ├── redis_client.py
│   │   └── models.py
│   │
│   └── visualization/     # Demo UI
│       ├── static/
│       │   ├── index.html
│       │   ├── demo.js
│       │   └── styles.css
│       └── server.py
│
├── tests/                  # Test suite
├── docker/
│   └── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .env.example
└── README.md
```

### Key Implementation Details

#### 1. Detection Engine

```python
class DetectionEngine:
    def __init__(self):
        self.pii_analyzer = AnalyzerEngine()  # Presidio
        self.code_detector = Guess()          # Guesslang
        self.nlp = spacy.load("en_core_web_sm")
    
    def analyze(self, query: str) -> DetectionReport:
        return DetectionReport(
            pii_entities=self._detect_pii(query),
            has_code=self._detect_code(query),
            entities=self._detect_entities(query),
            sensitivity_score=self._calculate_sensitivity(query)
        )
```

#### 2. Hybrid Fragmentation

```python
class HybridFragmenter:
    def fragment(self, query: str, detection_report: DetectionReport) -> List[Fragment]:
        # Choose strategy based on detection results
        if detection_report.sensitivity_score > 0.7:
            return self.semantic_fragment(query)
        elif detection_report.has_code:
            return self.code_aware_fragment(query)
        else:
            return self.syntactic_fragment(query)
```

#### 3. Orchestrator Integration

```python
class ClaudeOrchestrator:
    def __init__(self):
        self.client = Anthropic(api_key=ANTHROPIC_API_KEY)
        self.model = "claude-4-opus-20250522"
    
    async def plan_fragmentation(self, query: str, detection: DetectionReport) -> FragmentationPlan:
        prompt = self._build_planning_prompt(query, detection)
        response = await self.client.messages.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000
        )
        return self._parse_plan(response.content)
```

#### 4. Privacy-Preserving Router

```python
class PrivacyRouter:
    def route_fragments(self, fragments: List[Fragment]) -> List[RoutingDecision]:
        decisions = []
        provider_load = defaultdict(int)
        
        for fragment in fragments:
            # Ensure no provider gets too much context
            provider = self._select_provider(fragment, provider_load)
            provider_load[provider] += 1
            
            # Add timing defense
            delay = random.uniform(0.1, 0.5)
            
            decisions.append(RoutingDecision(
                fragment=fragment,
                provider=provider,
                delay=delay
            ))
        
        return decisions
```

#### 5. Response Aggregation

```python
class ResponseAggregator:
    def __init__(self):
        self.orchestrator = ClaudeOrchestrator()
    
    async def aggregate(self, responses: List[FragmentResponse]) -> str:
        # Always use Claude 4 Opus for aggregation
        prompt = self._build_aggregation_prompt(responses)
        
        aggregated = await self.orchestrator.aggregate_responses(prompt)
        
        # Validate no information leakage
        if self._check_privacy_preserved(aggregated):
            return aggregated
        else:
            return self._sanitize_response(aggregated)
```

### Demo Scenarios

#### Scenario 1: Medical Query with PII
```
Input: "My name is John Smith, SSN 123-45-6789. I have diabetes and need dietary advice."

Fragmentation:
→ GPT-4.1: "dietary recommendations for blood sugar management"
→ Claude 4 Sonnet: "nutritional advice for chronic condition"
→ Gemini 2.5 Flash: "healthy meal planning guidelines"

Result: Complete dietary advice without any provider seeing personal information
```

#### Scenario 2: Business Intelligence Query
```
Input: "Analyze our Q3 revenue of $2.5M compared to competitors and create a Python visualization"

Fragmentation:
→ Claude 4 Sonnet: "Q3 business performance analysis"
→ Gemini 2.5 Flash: "industry revenue benchmarks"
→ GPT-4.1: "Python code for revenue visualization"

Result: Complete analysis and code without exposing specific company data
```

#### Scenario 3: Complex Technical Query
```
Input: "Debug this Python code that processes our customer database and fix the SQL injection vulnerability"

Fragmentation:
→ GPT-4.1: "Python debugging and code review"
→ Claude 4 Sonnet: "SQL injection vulnerability analysis"
→ Gemini 2.5 Flash: "database security best practices"

Result: Fixed code with security improvements, no provider sees actual database schema
```

## Visual Interface Requirements

### Real-Time Fragmentation Display

The UI must show:
1. **Original Query** (with PII highlighted)
2. **Detection Results** (PII, code, entities found)
3. **Fragmentation Process** (animated splitting)
4. **Provider Assignment** (which fragment goes where)
5. **Timing Defense** (visual delays)
6. **Response Aggregation** (how pieces combine)
7. **Privacy Score** (what % of context each provider saw)
8. **Cost Comparison** (savings vs single provider)

### Demo Control Panel

- Toggle between fragmentation strategies
- Enable/disable orchestrator
- Adjust privacy sensitivity
- Show/hide timing defenses
- Compare with/without fragmentation

## Performance Requirements

1. **Response Time**: <2 seconds for typical queries
2. **Fragmentation Speed**: <200ms
3. **Detection Analysis**: <100ms
4. **Aggregation**: <500ms
5. **UI Updates**: Real-time (<50ms)

## Security Implementation

### Timing Attack Defense
```python
async def apply_timing_defense(self, request_time: float):
    # Add random delay to obscure patterns
    base_delay = 0.1
    random_delay = random.uniform(0, 0.4)
    
    # Ensure minimum total time
    elapsed = time.time() - request_time
    needed_delay = max(0, base_delay + random_delay - elapsed)
    
    await asyncio.sleep(needed_delay)
```

### PII Anonymization
```python
def anonymize_fragment(self, fragment: str, pii_results: List[PIIEntity]):
    anonymizer = AnonymizerEngine()
    
    # Context-aware anonymization
    anonymized = anonymizer.anonymize(
        text=fragment,
        analyzer_results=pii_results,
        operators={
            "PERSON": OperatorConfig("replace", {"new_value": "Individual"}),
            "LOCATION": OperatorConfig("replace", {"new_value": "Location"}),
            "US_SSN": OperatorConfig("mask", {"chars_to_mask": 9})
        }
    )
    
    return anonymized.text
```

## Configuration

### Environment Variables (.env)
```bash
# API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key

# Model Selection
OPENAI_MODEL=gpt-4.1
CLAUDE_ORCHESTRATOR_MODEL=claude-4-opus-20250522
CLAUDE_WORKER_MODEL=claude-4-sonnet-20250522
GEMINI_MODEL=gemini-2.5-flash

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_TTL=3600

# Security Settings
ENABLE_TIMING_DEFENSE=true
MIN_FRAGMENT_COUNT=2
MAX_FRAGMENT_COUNT=5

# Demo Mode
DEMO_MODE=true
ALWAYS_USE_BEST_MODELS=true
SHOW_COST_COMPARISON=true
```

## Success Criteria

### Functional Requirements
- [ ] Queries are fragmented with no provider seeing >40% of context
- [ ] PII is detected and anonymized before sending to providers
- [ ] Responses maintain coherence despite fragmentation
- [ ] System handles code, analysis, and creative queries
- [ ] Failover works when a provider is unavailable

### Performance Requirements
- [ ] 95% of queries complete in <2 seconds
- [ ] UI updates in real-time without lag
- [ ] System handles 10 concurrent queries
- [ ] Redis operations complete in <10ms

### Security Requirements
- [ ] Timing attacks are mitigated with random delays
- [ ] No PII appears in logs or error messages
- [ ] Each fragment is independently meaningful
- [ ] Providers cannot reconstruct original query

### Demo Requirements
- [ ] Visual interface clearly shows fragmentation process
- [ ] Privacy benefits are immediately obvious
- [ ] Cost savings are displayed in real-time
- [ ] System handles all demo scenarios flawlessly
- [ ] Investors understand the value proposition within 5 minutes

## Development Priorities

### Week 1-2: Core Functionality
1. Set up project structure and dependencies
2. Implement detection engine with all three libraries
3. Build basic fragmentation (syntactic first, then semantic)
4. Create provider clients with retry logic
5. Implement Redis state management

### Week 3: Intelligence Layer
1. Integrate Claude 4 Opus orchestrator
2. Implement intelligent fragmentation planning
3. Build sophisticated response aggregation
4. Add timing defense mechanisms
5. Create anonymization pipeline

### Week 4: Demo Polish
1. Build impressive visualization UI
2. Implement real-time updates
3. Add cost comparison dashboard
4. Create demo scenarios and scripts
5. Performance optimization
6. Final testing and documentation

## Additional Notes for Implementation

1. **Error Handling**: Every external API call must have retry logic and graceful degradation
2. **Logging**: Use structured logging (JSON) with correlation IDs but never log sensitive data
3. **Testing**: Include unit tests for fragmentation logic and integration tests for full flow
4. **Documentation**: Code should be self-documenting with clear function names and docstrings
5. **Performance**: Use asyncio throughout for concurrent API calls

## Resources

- **arc42 Architecture Document**: Comprehensive system architecture and design decisions
- **API Documentation**: 
  - [OpenAI API](https://platform.openai.com/docs)
  - [Anthropic API](https://docs.anthropic.com)
  - [Google Gemini API](https://ai.google.dev)
- **Library Documentation**:
  - [Presidio](https://microsoft.github.io/presidio/)
  - [Guesslang](https://github.com/yoeo/guesslang)
  - [spaCy](https://spacy.io/)