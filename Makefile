# Privacy-Preserving LLM Query Fragmentation - Makefile

.PHONY: help install test test-unit test-integration test-detection test-api test-coverage lint format type-check clean dev docker-build docker-up docker-down

# Default target
help:
	@echo "Privacy-Preserving LLM Query Fragmentation PoC"
	@echo "================================================"
	@echo ""
	@echo "Available commands:"
	@echo "  install         Install dependencies"
	@echo "  test            Run all tests"
	@echo "  test-unit       Run unit tests only"
	@echo "  test-integration Run integration tests only"
	@echo "  test-detection  Run detection engine tests only"
	@echo "  test-api        Run API tests only"
	@echo "  test-coverage   Run tests with coverage report"
	@echo "  lint            Run code linting"
	@echo "  format          Format code"
	@echo "  type-check      Run type checking"
	@echo "  clean           Clean up generated files"
	@echo "  dev             Start development server"
	@echo "  docker-build    Build Docker image"
	@echo "  docker-up       Start with Docker Compose"
	@echo "  docker-down     Stop Docker Compose"

# Installation
install:
	pip install -r requirements.txt
	python -m spacy download en_core_web_sm

# Testing
test:
	python3 scripts/run_tests.py

test-unit:
	python3 scripts/run_tests.py --unit

test-integration:
	python3 scripts/run_tests.py --integration

test-detection:
	python3 scripts/run_tests.py --detection

test-api:
	python3 scripts/run_tests.py --api

test-coverage:
	python3 scripts/run_tests.py --coverage

test-slow:
	python3 scripts/run_tests.py --slow

# Code quality
lint:
	ruff check src/ tests/
	
format:
	black src/ tests/
	ruff check --fix src/ tests/

type-check:
	mypy src/

# Development
dev:
	python3 -m uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

dev-with-ui:
	uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000 &
	# Add UI server command when implemented

# Docker
docker-build:
	docker build -t privacy-llm-poc .

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

# Testing with Docker
test-docker:
	docker-compose run --rm app python3 scripts/run_tests.py

# Clean up
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf htmlcov/
	rm -rf .coverage
	rm -rf .pytest_cache/
	rm -rf dist/
	rm -rf build/

# Quick development setup
setup: install
	@echo "Setting up development environment..."
	@echo "1. Copy .env.example to .env and add your API keys"
	@echo "2. Start Redis: docker run -d -p 6379:6379 redis:7-alpine"
	@echo "3. Run: make dev"

# CI/CD targets
ci-test: lint type-check test-coverage

# Security check (if tools are installed)
security:
	@command -v bandit >/dev/null && bandit -r src/ || echo "Install bandit for security checks"
	@command -v safety >/dev/null && safety check || echo "Install safety for dependency checks"

# Performance test
perf-test:
	python scripts/run_tests.py --detection --verbose

# Check everything before commit
pre-commit: format lint type-check test

# Docker development
docker-dev: docker-build
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Export requirements
export-deps:
	pip freeze > requirements-freeze.txt