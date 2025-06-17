# Frontend-Backend Integration Plan

## 🎯 Overview

This document outlines the step-by-step plan to connect the Next.js frontend with the FastAPI backend, transforming the current mock data into a fully functional, real-time privacy-preserving LLM system.

## 📋 Current State

### Backend (Functional)
- ✅ FastAPI server running on port 8000
- ✅ All LLM providers integrated (OpenAI, Anthropic, Google)
- ✅ PII detection and fragmentation working
- ✅ Response aggregation implemented
- ✅ E2E test scenarios validated

### Frontend (Mock Data)
- ✅ UI components built
- ❌ API integration missing
- ❌ Real-time updates not connected
- ❌ Analytics using static data
- ❌ Provider status hardcoded

## 🔧 Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  API Client Layer                     │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐  │   │
│  │  │ Query API  │ │ Status API │ │ Analytics API  │  │   │
│  │  └──────┬─────┘ └──────┬─────┘ └───────┬────────┘  │   │
│  └─────────┼───────────────┼───────────────┼───────────┘   │
│            │               │               │                │
│  ┌─────────▼───────────────▼───────────────▼───────────┐   │
│  │              React Query + WebSocket                 │   │
│  └─────────────────────────┬───────────────────────────┘   │
└────────────────────────────┼───────────────────────────────┘
                             │ HTTP/WS
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    API Endpoints                     │   │
│  │  /api/analyze    /api/status    /api/metrics       │   │
│  │  /api/providers  /api/history   /ws/updates        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📝 Implementation Phases

### Phase 1: Core API Integration (Week 1)

#### 1.1 Backend API Preparation
```python
# src/api/main.py - Add CORS and WebSocket support
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add WebSocket endpoint
@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Implementation for real-time updates
```

#### 1.2 Frontend API Client
```typescript
// frontend/src/lib/api/client.ts
import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      staleTime: 5000,
    },
  },
});

// WebSocket connection
export const wsClient = new WebSocket(`${API_BASE_URL.replace('http', 'ws')}/ws/updates`);
```

#### 1.3 API Service Layer
```typescript
// frontend/src/lib/api/services/query.service.ts
import { apiClient } from '../client';

export interface AnalyzeRequest {
  query: string;
  privacy_level: 'low' | 'medium' | 'high';
  optimize_cost?: boolean;
}

export interface AnalyzeResponse {
  request_id: string;
  fragments: Fragment[];
  privacy_score: number;
  estimated_cost: number;
}

export const queryService = {
  analyze: async (request: AnalyzeRequest): Promise<AnalyzeResponse> => {
    const { data } = await apiClient.post('/api/analyze', request);
    return data;
  },
  
  getStatus: async (requestId: string) => {
    const { data } = await apiClient.get(`/api/status/${requestId}`);
    return data;
  },
  
  getHistory: async (limit = 10) => {
    const { data } = await apiClient.get('/api/history', { params: { limit } });
    return data;
  },
};
```

### Phase 2: React Query Integration (Week 1)

#### 2.1 Query Hooks
```typescript
// frontend/src/hooks/useQuery.ts
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryService } from '@/lib/api/services/query.service';

export const useAnalyzeQuery = () => {
  return useMutation({
    mutationFn: queryService.analyze,
    onSuccess: (data) => {
      // Trigger status polling
      queryClient.invalidateQueries(['status', data.request_id]);
    },
  });
};

export const useQueryStatus = (requestId: string, enabled = false) => {
  return useQuery({
    queryKey: ['status', requestId],
    queryFn: () => queryService.getStatus(requestId),
    enabled: enabled && !!requestId,
    refetchInterval: (data) => {
      // Poll until complete
      return data?.status === 'completed' ? false : 1000;
    },
  });
};
```

#### 2.2 Update Query Interface Component
```typescript
// frontend/src/components/query/query-interface.tsx
import { useAnalyzeQuery, useQueryStatus } from '@/hooks/useQuery';

export function QueryInterface() {
  const [requestId, setRequestId] = useState<string>();
  const analyzeMutation = useAnalyzeQuery();
  const statusQuery = useQueryStatus(requestId, !!requestId);

  const handleSubmit = async (values: FormData) => {
    const result = await analyzeMutation.mutateAsync({
      query: values.query,
      privacy_level: values.privacyLevel,
      optimize_cost: true,
    });
    setRequestId(result.request_id);
  };

  // Real-time updates from status polling
  useEffect(() => {
    if (statusQuery.data?.status === 'completed') {
      // Update UI with results
      setResponse(statusQuery.data.result);
      setFragments(statusQuery.data.fragments);
    }
  }, [statusQuery.data]);

  // ... rest of component
}
```

### Phase 3: Provider Status Integration (Week 2)

#### 3.1 Backend Provider Monitoring
```python
# src/api/endpoints/providers.py
from fastapi import APIRouter
from typing import Dict, Any
import asyncio

router = APIRouter()

@router.get("/api/providers/status")
async def get_provider_status() -> Dict[str, Any]:
    """Get real-time status of all LLM providers"""
    statuses = await asyncio.gather(
        check_openai_status(),
        check_anthropic_status(),
        check_google_status(),
    )
    
    return {
        "providers": [
            {
                "id": "openai",
                "name": "OpenAI",
                "model": "GPT-4.1",
                "status": statuses[0]["status"],
                "latency": statuses[0]["latency"],
                "success_rate": statuses[0]["success_rate"],
                "requests_today": statuses[0]["requests_count"],
                "cost_today": statuses[0]["cost"],
            },
            # ... other providers
        ],
        "timestamp": datetime.utcnow().isoformat(),
    }
```

#### 3.2 Frontend Provider Status Hook
```typescript
// frontend/src/hooks/useProviders.ts
export const useProviderStatus = () => {
  return useQuery({
    queryKey: ['providers', 'status'],
    queryFn: () => providerService.getStatus(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// Update ProviderStatus component
export function ProviderStatus() {
  const { data: providerData, isLoading } = useProviderStatus();
  
  if (isLoading) return <ProviderStatusSkeleton />;
  
  return (
    // Render real provider data
    <div>
      {providerData?.providers.map(provider => (
        <ProviderCard key={provider.id} provider={provider} />
      ))}
    </div>
  );
}
```

### Phase 4: Analytics & Metrics (Week 2)

#### 4.1 Backend Metrics Endpoints
```python
# src/api/endpoints/metrics.py
@router.get("/api/metrics/summary")
async def get_metrics_summary(timeframe: str = "7d") -> Dict[str, Any]:
    """Get aggregated metrics for analytics dashboard"""
    return {
        "total_queries": await get_query_count(timeframe),
        "total_fragments": await get_fragment_count(timeframe),
        "average_privacy_score": await get_avg_privacy_score(timeframe),
        "total_cost": await get_total_cost(timeframe),
        "provider_distribution": await get_provider_usage(timeframe),
        "query_types": await get_query_type_distribution(timeframe),
        "performance_metrics": await get_performance_metrics(timeframe),
    }

@router.get("/api/metrics/timeseries")
async def get_timeseries_metrics(
    metric: str,
    timeframe: str = "7d",
    interval: str = "1h"
) -> List[Dict[str, Any]]:
    """Get time-series data for specific metrics"""
    return await get_metric_timeseries(metric, timeframe, interval)
```

#### 4.2 Analytics Dashboard Integration
```typescript
// frontend/src/components/investor/analytics-dashboard.tsx
import { useMetrics, useTimeseriesData } from '@/hooks/useMetrics';

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const { data: metrics } = useMetrics(timeRange);
  const { data: timeseries } = useTimeseriesData('queries', timeRange);

  return (
    <div>
      {/* Replace mock data with real metrics */}
      <MetricCards metrics={metrics} />
      <TimeSeriesChart data={timeseries} />
      <ProviderDistribution data={metrics?.provider_distribution} />
    </div>
  );
}
```

### Phase 5: WebSocket Real-time Updates (Week 3)

#### 5.1 Backend WebSocket Manager
```python
# src/core/websocket_manager.py
from typing import Dict, Set
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.subscriptions: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    async def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            # Clean up subscriptions

    async def broadcast_update(self, request_id: str, update: Dict):
        """Send updates to all clients watching this request"""
        message = json.dumps({
            "type": "request_update",
            "request_id": request_id,
            "data": update,
        })
        
        for client_id in self.subscriptions.get(request_id, []):
            if client_id in self.active_connections:
                await self.active_connections[client_id].send_text(message)

manager = ConnectionManager()
```

#### 5.2 Frontend WebSocket Hook
```typescript
// frontend/src/hooks/useWebSocket.ts
import { useEffect, useState } from 'react';

export const useWebSocket = (requestId?: string) => {
  const [updates, setUpdates] = useState<any[]>([]);
  
  useEffect(() => {
    if (!requestId) return;
    
    const ws = new WebSocket(`${WS_URL}/ws/updates`);
    
    ws.onopen = () => {
      // Subscribe to request updates
      ws.send(JSON.stringify({
        type: 'subscribe',
        request_id: requestId,
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.request_id === requestId) {
        setUpdates(prev => [...prev, data]);
      }
    };
    
    return () => {
      ws.close();
    };
  }, [requestId]);
  
  return updates;
};
```

### Phase 6: Demo Mode Integration (Week 3)

#### 6.1 Demo Scenarios API
```python
# src/api/endpoints/demo.py
@router.post("/api/demo/scenario")
async def run_demo_scenario(scenario_id: str) -> Dict[str, Any]:
    """Run a predefined demo scenario"""
    scenario = get_demo_scenario(scenario_id)
    
    # Execute the scenario
    result = await analyze_query(
        query=scenario["query"],
        privacy_level=scenario["privacy_level"],
        demo_mode=True  # Use cached responses for consistent demos
    )
    
    return {
        "scenario_id": scenario_id,
        "request_id": result["request_id"],
        "expected_duration": scenario["duration"],
        "description": scenario["description"],
    }
```

#### 6.2 Demo Mode Real Integration
```typescript
// frontend/src/components/demo/demo-mode.tsx
export function DemoMode() {
  const [isRunning, setIsRunning] = useState(false);
  const { mutate: runScenario } = useRunDemoScenario();
  
  const startDemo = async () => {
    setIsRunning(true);
    
    for (const scenario of demoScenarios) {
      const result = await runScenario(scenario.id);
      
      // Use WebSocket to get real-time updates
      // Update UI with actual fragmentation visualization
      
      await waitForCompletion(result.request_id);
    }
  };
}
```

## 🚀 Deployment Configuration

### Environment Variables

#### Backend (.env)
```env
# Add frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Enable WebSocket support
ENABLE_WEBSOCKET=true

# Demo mode settings
DEMO_MODE_CACHE=true
DEMO_RESPONSE_DELAY=500
```

#### Frontend (.env.local)
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Feature Flags
NEXT_PUBLIC_ENABLE_REAL_API=true
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_DEMO_MODE=true
```

### Docker Compose Update
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - FRONTEND_URL=http://frontend:3000
    depends_on:
      - redis
    volumes:
      - ./src:/app/src
      
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend
      
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## 📊 Testing Integration

### Integration Tests
```typescript
// frontend/tests/integration/api.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useAnalyzeQuery } from '@/hooks/useQuery';

describe('API Integration', () => {
  it('should successfully analyze a query', async () => {
    const { result } = renderHook(() => useAnalyzeQuery());
    
    act(() => {
      result.current.mutate({
        query: 'Test query',
        privacy_level: 'high',
      });
    });
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data?.request_id).toBeDefined();
    });
  });
});
```

### E2E Tests with Real API
```typescript
// frontend/cypress/e2e/real-api.cy.ts
describe('Real API Integration', () => {
  beforeEach(() => {
    cy.visit('/');
  });
  
  it('should submit query and display results', () => {
    cy.get('[data-testid="query-input"]').type('How to optimize portfolio?');
    cy.get('[data-testid="privacy-level"]').select('high');
    cy.get('[data-testid="submit-button"]').click();
    
    // Wait for fragmentation visualization
    cy.get('[data-testid="fragment-viz"]').should('be.visible');
    
    // Verify fragments are displayed
    cy.get('[data-testid="fragment"]').should('have.length.greaterThan', 0);
    
    // Check privacy score
    cy.get('[data-testid="privacy-score"]').should('contain', '%');
  });
});
```

## 📈 Monitoring & Observability

### Backend Logging
```python
# src/core/logging.py
import structlog

logger = structlog.get_logger()

# Log all API requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    logger.info(
        "api_request",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration=duration,
    )
    
    return response
```

### Frontend Error Tracking
```typescript
// frontend/src/lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

export const trackAPIError = (error: any, context: any) => {
  console.error('API Error:', error);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      contexts: {
        api: context,
      },
    });
  }
};
```

## 🎯 Success Metrics

### Performance Targets
- API Response Time: < 200ms (excluding LLM calls)
- WebSocket Latency: < 50ms
- Frontend Load Time: < 2s
- Time to Interactive: < 3s

### Integration Milestones
- [ ] Week 1: Core API integration complete
- [ ] Week 2: Real-time updates working
- [ ] Week 3: All features connected to real data
- [ ] Week 4: Performance optimization and testing

## 🔄 Migration Checklist

### Backend
- [ ] Add CORS configuration
- [ ] Implement missing endpoints
- [ ] Add WebSocket support
- [ ] Create demo mode endpoints
- [ ] Add request caching
- [ ] Implement rate limiting
- [ ] Add comprehensive logging

### Frontend
- [ ] Create API client
- [ ] Add React Query
- [ ] Replace mock data with API calls
- [ ] Implement error handling
- [ ] Add loading states
- [ ] Connect WebSocket
- [ ] Update tests

### DevOps
- [ ] Update Docker compose
- [ ] Configure environment variables
- [ ] Set up monitoring
- [ ] Configure CI/CD
- [ ] Load testing

## 🚨 Rollback Plan

If integration issues arise:

1. **Feature Flags**: Use environment variables to toggle between mock and real data
2. **Gradual Rollout**: Integrate one component at a time
3. **Fallback Mode**: Implement fallback to mock data if API fails
4. **Version Control**: Tag stable versions before major changes

```typescript
// frontend/src/lib/api/fallback.ts
export const withFallback = async <T>(
  apiCall: () => Promise<T>,
  mockData: T
): Promise<T> => {
  if (!process.env.NEXT_PUBLIC_ENABLE_REAL_API) {
    return mockData;
  }
  
  try {
    return await apiCall();
  } catch (error) {
    console.error('API call failed, using mock data:', error);
    return mockData;
  }
};
```

## 📝 Next Steps

1. **Review** this plan with the team
2. **Set up** development environment
3. **Begin** Phase 1 implementation
4. **Test** each integration point
5. **Document** any deviations from plan
6. **Deploy** to staging for testing
7. **Monitor** performance metrics
8. **Iterate** based on feedback

---

**Timeline**: 3-4 weeks for complete integration
**Team Size**: 1-2 developers
**Risk Level**: Low (with proper testing and rollback plan)