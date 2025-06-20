# Service Layer Architecture

This directory contains service components that handle business logic and data management, keeping our UI components clean and focused on presentation.

## QuerySSEService

The `QuerySSEService` component is a headless service that manages all Server-Sent Events (SSE) subscriptions related to query processing. It demonstrates proper separation of concerns by:

### Responsibilities:
1. **SSE Event Handling**: Subscribes to `step_progress`, `investor_kpis`, and `complete` events
2. **Global State Updates**: Updates the query context with processing steps and real-time data
3. **Result Fetching**: Automatically fetches the final query result when processing completes
4. **User Notifications**: Shows toast notifications for success/error states

### Benefits:
- **Decoupling**: UI components (like QueryInterface) no longer need to manage SSE subscriptions
- **Single Responsibility**: Each component has a clear, focused purpose
- **Reusability**: The service runs globally, so all components can access the updated state
- **Testability**: Business logic can be tested independently from UI components
- **Maintainability**: Changes to SSE handling don't require touching UI components

### Usage:
The service is automatically loaded in the app's provider hierarchy:

```tsx
<QueryProvider>
  <SSEProvider>
    <QuerySSEService />  {/* Runs globally */}
    {children}
  </SSEProvider>
</QueryProvider>
```

UI components can then simply consume the data from context:

```tsx
const { queryResult, isProcessing, requestId } = useQuery();
```

This architecture ensures that:
- QueryInterface only handles user input and displays results
- ProcessingFlow only visualizes the current processing state
- QuerySSEService manages all the complex SSE subscriptions and state updates

This is a best practice in React applications, promoting clean, maintainable, and testable code.