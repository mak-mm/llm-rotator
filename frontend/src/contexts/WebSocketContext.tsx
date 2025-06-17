"use client";

import React, { createContext, useContext } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: any;
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const webSocketState = useWebSocket({
    reconnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 5
  });

  return (
    <WebSocketContext.Provider value={webSocketState}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}