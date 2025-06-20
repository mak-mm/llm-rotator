s--|
| QS1 | User submits query with PII | PII detected and removed in <100ms |
| QS2 | Complex query needs orchestration | Decision made in <200ms |
| QS3 | LLM provider fails | Automatic failover in <500ms |
| QS4 | Demo to stakeholders | Privacy visible in UI within 5 seconds |

---

## 11. Risks and Technical Debt

### 11.1 Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| API Rate Limits | Medium | High | Multiple API keys, caching |
| Poor Response Coherence | Medium | High | Claude 4 Opus aggregation |
| Timing Attacks | High | High | Built-in timing defense |
| Cost Overrun | Low | Medium | Query caching, monitoring |

### 11.2 Technical Debt

| Debt | Justification | Payback Plan |
|------|---------------|--------------|
| Monolithic Architecture | PoC speed | Refactor if productizing |
| Basic Error Handling | Simplicity | Add circuit breakers later |
| Limited Test Coverage | Time constraint | Add tests before production |
| No Authentication | PoC scope | Implement for production |

---

## 12. Glossary

| Term | Definition |
|------|------------|
| **Fragmentation** | Splitting queries into parts that reveal minimal context |
| **Orchestrator** | Claude 4 Opus model that makes decisions about fragmentation strategy |
| **PII** | Personally Identifiable Information (names, SSNs, etc.) |
| **Detection Engine** | System using Presidio, Guesslang, spaCy for analysis |
| **Provider** | External LLM service (OpenAI, Claude, Gemini) |
| **Aggregation** | Combining fragment responses into coherent answer |
| **Timing Defense** | Random delays to prevent timing-based attacks |
| **MoA** | Mixture of Agents pattern for response synthesis |
| **Claude 4 Opus** | Anthropic's most powerful model (May 2025), best for coding |
| **GPT-4.1** | OpenAI's latest model with 1M token context (April 2025) |
| **Gemini 2.5 Flash** | Google's efficient workhorse model (May 2025) |

---

## Appendix A: Implementation Checklist

### Phase 1: Core Implementation (Week 1-2)
- [ ] Setup Python monorepo structure
- [ ] Implement detection engine (Presidio, Guesslang, spaCy)
- [ ] Basic rule-based fragmentation
- [ ] Direct HTTP clients for 3 LLMs
- [ ] Redis state management
- [ ] Simple response aggregation

### Phase 2: Orchestrator Integration (Week 3)
- [ ] Claude 4 Opus orchestrator setup
- [ ] Intent analysis for complex queries
- [ ] Orchestrator-based aggregation
- [ ] Timing defense implementation
- [ ] Cost tracking

### Phase 3: Demo Preparation (Week 4)
- [ ] Web UI with visualization
- [ ] Demo scenarios
- [ ] Performance optimization
- [ ] Documentation completion
- [ ] Deployment scripts

---

## Appendix B: Model Comparison Matrix

| Feature | Claude 4 Opus | GPT-4.1 | Claude 4 Sonnet | Gemini 2.5 Flash |
|---------|---------------|---------|-----------------|------------------|
| **Context Window** | Standard | 1M tokens | Standard | Standard |
| **Best For** | Orchestration, Complex Reasoning | Code, Long Context | Analysis, Safety | Facts, Speed |
| **Cost (Input)** | $15/1M | $10/1M | $3/1M | $0.075/1M |
| **Cost (Output)** | $75/1M | $10/1M | $15/1M | $0.075/1M |
| **Response Time** | 1-2s | 1-2s | <1s | <0.5s |
| **Release Date** | May 2025 | April 2025 | May 2025 | May 2025 |

---

## Appendix C: Quick Start Guide

```bash
# Clone repository
git clone <repository-url>
cd privacy-llm-poc

# Setup environment
cp .env.example .env
# Add your API keys to .env file

# Run with Docker
docker-compose up

# Access application
# API: http://localhost:8000
# Demo UI: http://localhost:3000

# Run without Docker (development)
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python -m uvicorn src.api.main:app --reload
```