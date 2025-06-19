# SSE Refactoring Summary

## Overview
Refactored the Server-Sent Events (SSE) implementation in the LLM-Model-Rotator project to follow industry best practices by implementing a single, global SSE connection that multiplexes different event types.

## Key Changes

### 1. Created Global SSE Context (`/frontend/src/contexts/sse-context.tsx`)
- Implements a single SSE connection manager using React Context
- Provides event routing/multiplexing capabilities
- Supports subscribing to specific event types
- Includes automatic reconnection logic with exponential backoff
- Manages connection lifecycle based on active request ID

Key features:
- `SSEProvider`: Wraps the application and manages the SSE connection
- `useSSEContext`: Hook to access SSE connection state and methods
- `useSSESubscription`: Hook to subscribe to specific event types

### 2. Updated Application Providers (`/frontend/src/components/providers.tsx`)
- Added `SSEProvider` to the component hierarchy
- Ensures both `QueryProvider` and `SSEProvider` are available throughout the app

### 3. Refactored ProcessingFlow Component (`/frontend/src/components/flow/ProcessingFlow.tsx`)
- Removed direct SSE connection using `useSSE`
- Now uses `useSSESubscription` to listen for 'step_progress' events
- Maintains same functionality with cleaner implementation

### 4. Refactored QueryInterface Component (`/frontend/src/components/query/query-interface.tsx`)
- Removed direct SSE connection and `shouldConnectSSE` state
- Uses `useSSEContext` to manage active request ID
- Uses `useSSESubscription` to listen for multiple event types
- Properly cleans up active request ID when processing completes or errors occur

### 5. Other Components
- `SimpleQueryFlow`, `QueryFragmentationFlow`, and `3d-fragmentation-sse` already had SSE disabled
- No changes needed for these components

## Benefits of the Refactoring

1. **Single Connection**: Only one SSE connection per session, respecting browser limits (6 concurrent connections per domain)
2. **Event Multiplexing**: Multiple components can subscribe to different event types on the same connection
3. **Centralized Management**: Connection lifecycle is managed in one place
4. **Better Error Handling**: Automatic reconnection with exponential backoff
5. **Cleaner Code**: Components no longer need to manage their own SSE connections
6. **Resource Efficiency**: Reduced overhead from multiple connections
7. **Easier Debugging**: All SSE logic is centralized in the context

## Migration Guide

To use the new SSE system in a component:

1. Import the hooks:
```typescript
import { useSSEContext, useSSESubscription } from '@/contexts/sse-context';
```

2. For managing the active request:
```typescript
const { setActiveRequestId } = useSSEContext();
// Set when starting a new request
setActiveRequestId(requestId);
// Clear when done
setActiveRequestId(null);
```

3. For subscribing to events:
```typescript
useSSESubscription(['event_type1', 'event_type2'], (message) => {
  if (message.type === 'event_type1') {
    // Handle event_type1
  } else if (message.type === 'event_type2') {
    // Handle event_type2
  }
}, [/* dependencies */]);
```

## Testing

The refactored implementation maintains full compatibility with the existing backend SSE infrastructure. No backend changes were required. The system has been tested with:
- Multiple simultaneous event types
- Reconnection scenarios
- Error handling
- Component mounting/unmounting

## Future Improvements

1. **Backend Event Filtering**: The backend SSE manager could be enhanced to support client-side event type filtering to reduce bandwidth
2. **Event History**: Consider implementing event replay for components that mount after events have been sent
3. **Performance Monitoring**: Add metrics to track SSE connection health and event throughput
4. **Compression**: Implement SSE compression for large payloads