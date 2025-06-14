# Testing Guide

This document describes the comprehensive testing infrastructure for the Privacy-Preserving LLM Query Fragmentation PoC.

## Testing Structure

```
tests/
├── conftest.py              # Shared test configuration
├── fixtures/
│   └── test_data.py         # Test data and fixtures
├── unit/                    # Unit tests
│   ├── detection/
│   │   ├── test_pii_detector.py
│   │   ├── test_code_detector.py
│   │   ├── test_entity_recognizer.py
│   │   └── test_detection_engine.py
│   ├── api/                 # API unit tests
│   └── state/               # State management tests
└── integration/             # Integration tests
    ├── api/
    │   └── test_api_endpoints.py
    └── providers/           # Provider integration tests
```

## Running Tests

### Quick Commands

```bash
# Run all tests
make test

# Run specific test categories
make test-unit           # Unit tests only
make test-integration    # Integration tests only
make test-detection      # Detection engine tests only
make test-api           # API tests only

# Run with coverage
make test-coverage

# Include slow tests
make test-slow
```

### Using Python Directly

```bash
# All tests
python scripts/run_tests.py

# Specific categories
python scripts/run_tests.py --unit
python scripts/run_tests.py --integration
python scripts/run_tests.py --detection
python scripts/run_tests.py --api

# With coverage
python scripts/run_tests.py --coverage

# Specific file
python scripts/run_tests.py --file tests/unit/detection/test_pii_detector.py
```

### Using pytest Directly

```bash
# All tests with coverage
pytest --cov=src --cov-report=html

# Unit tests only
pytest -m unit

# Detection tests only
pytest -m detection

# Exclude slow tests
pytest -m "not slow"

# Verbose output
pytest -v

# Specific file
pytest tests/unit/detection/test_detection_engine.py
```

## Test Categories

### Unit Tests (`@pytest.mark.unit`)
- Test individual components in isolation
- Mock external dependencies
- Fast execution (< 1 second per test)
- High coverage of edge cases

### Integration Tests (`@pytest.mark.integration`)
- Test component interactions
- Use real services where appropriate
- Test API endpoints end-to-end
- May be slower (1-5 seconds per test)

### Detection Tests (`@pytest.mark.detection`)
- Specifically test detection engine components
- Test PII, code, and entity recognition
- Performance benchmarks
- Sensitivity scoring validation

### API Tests (`@pytest.mark.api`)
- Test FastAPI endpoints
- Request/response validation
- Error handling
- Performance requirements

### Slow Tests (`@pytest.mark.slow`)
- Tests that take > 5 seconds
- Large dataset processing
- Complex scenarios
- Excluded by default

## Test Data

### Fixtures Available

- `simple_queries`: Basic non-sensitive queries
- `pii_queries`: Queries with PII entities
- `code_queries`: Queries with code blocks
- `entity_queries`: Queries with named entities
- `complex_queries`: Multi-faceted sensitive queries
- `detection_thresholds`: Performance thresholds
- `mock_api_responses`: Mock LLM provider responses

### Example Usage

```python
@pytest.mark.unit
@pytest.mark.detection
@pytest.mark.parametrize("query_data", TestQueries.PII_QUERIES)
def test_pii_detection(pii_detector, query_data):
    entities = pii_detector.detect(query_data["query"])
    assert len(entities) >= query_data["expected_count"]
```

## Performance Testing

### Performance Thresholds

- Detection engine: < 100ms for typical queries
- API responses: < 2 seconds including detection
- PII detection confidence: > 0.5
- Code detection confidence: > 0.5

### Performance Monitoring

Use the `performance_monitor` fixture:

```python
def test_detection_performance(detection_engine, performance_monitor):
    performance_monitor.start()
    report = await detection_engine.analyze("test query")
    performance_monitor.stop()
    performance_monitor.assert_under_threshold(0.1)  # 100ms
```

## Mocking

### Available Mocks

- `mock_redis_client`: Mock Redis operations
- `mock_openai_client`: Mock OpenAI API calls
- `mock_anthropic_client`: Mock Anthropic API calls
- `mock_google_client`: Mock Google API calls
- `mock_env_vars`: Mock environment variables

### Example Mocking

```python
def test_with_mocked_redis(mock_redis_client, monkeypatch):
    monkeypatch.setattr("src.state.redis_client.redis", mock_redis_client)
    # Test code using mocked Redis
```

## Coverage Requirements

- Minimum coverage: 80%
- Critical components (detection engine): 90%+
- Generated HTML reports in `htmlcov/`

## CI/CD Integration

```bash
# Run all quality checks
make ci-test

# Pre-commit checks
make pre-commit
```

## Writing New Tests

### Test Structure

```python
import pytest
from src.module import Component

class TestComponent:
    @pytest.fixture
    def component(self):
        return Component()
    
    @pytest.mark.unit
    @pytest.mark.category  # detection, api, etc.
    def test_functionality(self, component):
        # Arrange
        input_data = "test input"
        
        # Act
        result = component.process(input_data)
        
        # Assert
        assert result.is_valid
        assert result.value == expected_value
```

### Test Guidelines

1. **Descriptive Names**: Test names should describe what is being tested
2. **Single Responsibility**: Each test should verify one specific behavior
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Use Fixtures**: Leverage pytest fixtures for setup
5. **Mark Tests**: Always add appropriate markers
6. **Performance**: Unit tests should be fast (< 1s)
7. **Independence**: Tests should not depend on each other

### Parametrized Tests

```python
@pytest.mark.parametrize("input,expected", [
    ("simple query", False),
    ("john@example.com", True),
    ("SSN: 123-45-6789", True),
])
def test_has_pii(pii_detector, input, expected):
    result = pii_detector.detect(input)
    assert bool(result) == expected
```

## Debugging Tests

```bash
# Run with debugging
pytest --pdb

# Run specific test with verbose output
pytest -v -s tests/unit/detection/test_detection_engine.py::TestDetectionEngine::test_simple_query_analysis

# Show test output
pytest -s
```

## Docker Testing

```bash
# Run tests in Docker
make test-docker

# Test with fresh environment
docker-compose run --rm app python scripts/run_tests.py --coverage
```

## Troubleshooting

### Common Issues

1. **spaCy Model Missing**
   ```bash
   python -m spacy download en_core_web_sm
   ```

2. **Redis Connection Errors**
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

3. **Import Errors**
   ```bash
   export PYTHONPATH=$PWD
   ```

4. **Slow Tests**
   ```bash
   pytest -m "not slow"  # Skip slow tests
   ```

### Performance Issues

If tests are running slowly:
1. Use markers to run specific test subsets
2. Mock external dependencies
3. Check for resource leaks
4. Profile with `pytest-profiling`

## Test-Driven Development Workflow

1. **Write Failing Test**: Start with a test that captures the desired behavior
2. **Make It Pass**: Implement minimal code to make the test pass
3. **Refactor**: Improve the code while keeping tests green
4. **Add Edge Cases**: Write tests for edge cases and error conditions
5. **Integration**: Add integration tests for component interactions

This comprehensive testing infrastructure ensures code quality and enables confident development of the Privacy-Preserving LLM system.