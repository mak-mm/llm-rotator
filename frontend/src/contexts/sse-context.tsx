"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';

interface SSEMessage {
  type: string;
  data?: any;
  timestamp: string;
  request_id?: string;
}

interface SSEEventHandler {
  eventType: string | string[];
  handler: (message: SSEMessage) => void;
}

interface SSEContextType {
  isConnected: boolean;
  connectionError: string | null;
  activeRequestId: string | null;
  setActiveRequestId: (requestId: string | null) => void;
  subscribe: (eventTypes: string | string[], handler: (message: SSEMessage) => void) => () => void;
  reconnect: () => void;
}

const SSEContext = createContext<SSEContextType | undefined>(undefined);

interface SSEProviderProps {
  children: ReactNode;
}

export function SSEProvider({ children }: SSEProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const handlersRef = useRef<Map<string, Set<(message: SSEMessage) => void>>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const maxReconnectAttempts = 5;
  const reconnectInterval = 3000;

  // Subscribe to specific event types
  const subscribe = useCallback((eventTypes: string | string[], handler: (message: SSEMessage) => void) => {
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    
    types.forEach(type => {
      if (!handlersRef.current.has(type)) {
        handlersRef.current.set(type, new Set());
      }
      handlersRef.current.get(type)!.add(handler);
    });

    // Return unsubscribe function
    return () => {
      types.forEach(type => {
        handlersRef.current.get(type)?.delete(handler);
        if (handlersRef.current.get(type)?.size === 0) {
          handlersRef.current.delete(type);
        }
      });
    };
  }, []);

  // Dispatch message to all relevant handlers
  const dispatchMessage = useCallback((message: SSEMessage) => {
    // Dispatch to handlers for specific event type
    const handlers = handlersRef.current.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in SSE handler for ${message.type}:`, error);
        }
      });
    }

    // Also dispatch to wildcard handlers
    const wildcardHandlers = handlersRef.current.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in SSE wildcard handler:', error);
        }
      });
    }
  }, []);

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    if (!activeRequestId) {
      console.log('🚫 SSE connection skipped: no active request ID');
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      console.log('🔄 Closing existing SSE connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8003';
      const url = `${API_BASE_URL}/api/v1/stream/${activeRequestId}`;
      
      console.log('🔄 SSE connecting to:', url);
      
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        console.log('✅ Global SSE Connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          if (!event.data || event.data === 'null' || event.data.trim() === '') {
            console.warn('⚠️ SSE: Received empty or null data, skipping');
            return;
          }
          
          const message: SSEMessage = JSON.parse(event.data);
          console.log('📨 SSE Message:', message.type);
          dispatchMessage(message);
        } catch (error) {
          console.error('❌ SSE Parse Error:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE Error:', error);
        setIsConnected(false);
        setConnectionError('SSE connection error');

        eventSource.close();
        eventSourceRef.current = null;

        // Attempt to reconnect if enabled
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.error('❌ Maximum reconnection attempts exceeded');
          setConnectionError('Maximum reconnection attempts exceeded');
          toast.error('Lost real-time connection. Please refresh the page.');
        }
      };

    } catch (error) {
      console.error('❌ Failed to establish SSE connection:', error);
      setConnectionError('Failed to establish connection');
    }
  }, [activeRequestId, dispatchMessage]);

  // Disconnect SSE
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    handlersRef.current.clear();
  }, []);

  // Manual reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    if (activeRequestId) {
      setTimeout(connect, 100);
    }
  }, [activeRequestId, connect, disconnect]);

  // Connect/disconnect when activeRequestId changes
  useEffect(() => {
    if (activeRequestId) {
      // Small delay to ensure backend is ready
      const timer = setTimeout(() => {
        connect();
      }, 500);
      
      return () => {
        clearTimeout(timer);
        // Don't disconnect on unmount to survive Fast Refresh
        // disconnect();
      };
    } else {
      disconnect();
    }
  }, [activeRequestId]); // Only depend on activeRequestId changes
  
  // Cleanup on component unmount (but not on Fast Refresh)
  useEffect(() => {
    return () => {
      // Only disconnect if we're actually unmounting the app
      if (typeof window !== 'undefined' && !window.__NEXT_FAST_REFRESH) {
        disconnect();
      }
    };
  }, []);

  return (
    <SSEContext.Provider
      value={{
        isConnected,
        connectionError,
        activeRequestId,
        setActiveRequestId,
        subscribe,
        reconnect,
      }}
    >
      {children}
    </SSEContext.Provider>
  );
}

export function useSSEContext() {
  const context = useContext(SSEContext);
  if (context === undefined) {
    throw new Error('useSSEContext must be used within a SSEProvider');
  }
  return context;
}

// Custom hook for subscribing to specific SSE events
export function useSSESubscription(
  eventTypes: string | string[],
  handler: (message: SSEMessage) => void,
  deps: React.DependencyList = []
) {
  const { subscribe } = useSSEContext();

  useEffect(() => {
    const unsubscribe = subscribe(eventTypes, handler);
    return unsubscribe;
  }, [subscribe, ...deps]); // Include deps but not eventTypes/handler to avoid re-subscribing
}