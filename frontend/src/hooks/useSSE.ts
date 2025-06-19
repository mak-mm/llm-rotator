import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';

interface SSEOptions {
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useSSE(url: string | null, options: SSEOptions = {}) {
  const {
    onMessage,
    onError,
    onOpen,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connect = useCallback(() => {
    // Skip if already connected or URL is invalid
    if (!url || url.includes('null') || url.includes('undefined')) {
      console.log('🚫 SSE connection skipped: invalid URL', { url });
      return;
    }
    
    if (eventSourceRef.current) {
      console.log('🚫 SSE connection skipped: already connected', { url });
      return;
    }

    try {
      // Ensure we have the full URL with proper base
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
      
      console.log('🔄 SSE connecting to:', fullUrl);
      
      const eventSource = new EventSource(fullUrl);
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = (event) => {
        console.log('✅ SSE Connected to:', fullUrl);
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        onOpen?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 SSE:', data.type);
          onMessage?.(event);
        } catch (error) {
          console.error('❌ SSE Parse Error:', error.message);
        }
      };

      eventSource.onerror = (error) => {
        const readyStateMap = { 0: 'CONNECTING', 1: 'OPEN', 2: 'CLOSED' };
        console.error(`❌ SSE Error: ${readyStateMap[eventSource.readyState]} - ${fullUrl}`);
        
        setIsConnected(false);
        setConnectionError(`SSE connection error (readyState: ${eventSource.readyState} - ${readyStateMap[eventSource.readyState] || 'UNKNOWN'})`);
        onError?.(error);

        eventSource.close();
        eventSourceRef.current = null;

        // Attempt to reconnect if enabled
        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 [SSE-DEBUG] Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          console.log(`🔄 [SSE-DEBUG] Reconnect delay: ${reconnectInterval}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`🔄 [SSE-DEBUG] Executing reconnect attempt ${reconnectAttemptsRef.current}`);
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('❌ [SSE-DEBUG] Maximum reconnection attempts exceeded');
          setConnectionError('Maximum reconnection attempts exceeded');
          toast.error('Lost real-time connection. Please refresh the page.');
        }
      };

    } catch (error) {
      console.error('❌ [SSE-DEBUG] Failed to establish SSE connection:', error);
      console.error('❌ [SSE-DEBUG] Error name:', error.name);
      console.error('❌ [SSE-DEBUG] Error message:', error.message);
      console.error('❌ [SSE-DEBUG] Error stack:', error.stack);
      setConnectionError('Failed to establish connection');
    }
  }, [url, onMessage, onError, onOpen, reconnect, reconnectInterval, maxReconnectAttempts]);

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
  }, []);

  useEffect(() => {
    if (url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url]); // Only depend on URL changes, not the callbacks

  return {
    isConnected,
    connectionError,
    disconnect,
    reconnect: connect,
  };
}