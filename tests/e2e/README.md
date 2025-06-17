# End-to-End Tests

These tests verify the complete privacy-preserving LLM workflow using real OpenAI GPT-4o-mini API calls.

## Requirements

1. **OpenAI API Key**: Set the `OPENAI_API_KEY` environment variable
2. **Internet Connection**: Tests make real API calls
3. **API Costs**: Tests use GPT-4o-mini (cost-effective) but will incur small charges

## Running Tests

### Quick Test (Single Query)
```bash
python scripts/run_e2e_tests.py quick
```

### Full E2E Test Suite
```bash
python scripts/run_e2e_tests.py
```

### With Pytest Directly
```bash
# Run all e2e tests
pytest tests/e2e/ -m e2e -v

# Run specific test
pytest tests/e2e/test_real_workflow.py::TestRealWorkflow::test_simple_factual_query -v
```

## Test Coverage

The e2e tests verify:

1. **Simple Factual Queries**: Basic functionality without sensitive data
2. **PII Isolation**: Proper detection and isolation of personal information
3. **Code Isolation**: Separation of code blocks from natural language
4. **Complex Mixed Queries**: Queries with both PII and code
5. **Privacy Preservation**: Verification that sensitive data doesn't leak
6. **Performance Metrics**: Response times and system efficiency
7. **Error Handling**: Edge cases and resilience testing

## Test Scenarios

### Simple Factual Query
- Query: "What is the capital of France?"
- Expected: Single fragment, direct answer, no privacy concerns

### PII Isolation
- Query: "My name is John Smith and my email is john.smith@example.com. What's a good password manager?"
- Expected: Multiple fragments, PII redacted, meaningful response about password managers

### Code Isolation
- Query: "How can I improve this Python function: def hello(): print('Hello world')"
- Expected: Separate fragments for text and code, improvement suggestions

### Complex Mixed
- Query: "I'm John Doe (john@company.com) working on a Python script: import os; os.getenv('SECRET'). Can you help optimize it for security?"
- Expected: Maximum fragmentation, all sensitive data isolated, security advice

## Privacy Verification

The tests include specific privacy checks:

- ✅ PII entities are detected correctly
- ✅ Sensitive data is NOT present in final responses
- ✅ Responses remain meaningful and helpful
- ✅ Privacy levels are properly achieved
- ✅ Fragment isolation works as expected

## Performance Expectations

- Response time < 10 seconds per query
- Success rate > 90%
- Average processing time < 8 seconds
- Cost per test query < $0.01

## Environment Variables

- `OPENAI_API_KEY`: Required - Your OpenAI API key
- `E2E_VERBOSE`: Optional - Set to 1 for verbose output
- `E2E_TIMEOUT`: Optional - Test timeout in seconds (default: 300)

## Cost Considerations

These tests use GPT-4o-mini which is cost-effective:
- Input: ~$0.00015 per 1K tokens
- Output: ~$0.0006 per 1K tokens
- Typical test query: 50-200 tokens
- **Estimated cost per full test run: < $0.05**