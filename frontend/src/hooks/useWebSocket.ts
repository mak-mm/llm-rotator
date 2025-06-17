import { useEffect, useState, useCallback, useRef } from 'react';
import { createWebSocketConnection, getWebSocketClient } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface WebSocketMessage {
  type: 'provider_status' | 'metrics_update' | 'query_progress' | 'error';
  data: any;
  timestamp: string;
}

interface UseWebSocketOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    reconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = createWebSocketConnection();
      if (!ws) {
        throw new Error('Failed to create WebSocket connection');
      }

      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Handle different message types
          switch (message.type) {
            case 'provider_status':
              // Invalidate and refetch provider status
              queryClient.invalidateQueries({ queryKey: ['provider-status'] });
              break;
              
            case 'metrics_update':
              // Invalidate metrics queries
              queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
              queryClient.invalidateQueries({ queryKey: ['timeseries'] });
              break;
              
            case 'query_progress':
              // Update specific query status if we have the request ID
              if (message.data.request_id) {
                queryClient.invalidateQueries({ 
                  queryKey: ['query-status', message.data.request_id] 
                });
              }
              break;
              
            case 'error':
              console.error('WebSocket error message:', message.data);
              toast.error(`Real-time update error: ${message.data.message}`);
              break;
              
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect if enabled and we haven't exceeded max attempts
        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionError('Maximum reconnection attempts exceeded');
          toast.error('Lost real-time connection. Please refresh the page.');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionError('WebSocket connection error');
      };

    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      setConnectionError('Failed to establish connection');
    }
  }, [reconnect, reconnectInterval, maxReconnectAttempts, queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setLastMessage(null);
    setConnectionError(null);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    
    console.warn('WebSocket not connected, cannot send message');
    return false;
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    connectionError,
    connect,
    disconnect,
    sendMessage,
    reconnectAttempts: reconnectAttemptsRef.current,
    maxReconnectAttempts
  };
};

// Hook for subscribing to specific WebSocket message types
export const useWebSocketSubscription = (
  messageType: WebSocketMessage['type'],
  onMessage?: (data: any) => void
) => {
  const { lastMessage, isConnected } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === messageType && onMessage) {
      onMessage(lastMessage.data);
    }
  }, [lastMessage, messageType, onMessage]);

  return { isConnected, lastMessage };
};