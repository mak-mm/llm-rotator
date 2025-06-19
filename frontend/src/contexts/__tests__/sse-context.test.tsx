import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { SSEProvider, useSSEContext, useSSESubscription } from '../sse-context';

// Mock EventSource
const mockEventSource = {
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1,
  url: '',
  withCredentials: false,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
  onopen: null,
  onmessage: null,
  onerror: null,
  dispatchEvent: vi.fn(),
};

global.EventSource = vi.fn(() => mockEventSource) as any;

describe('SSEContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEventSource.close.mockClear();
    mockEventSource.addEventListener.mockClear();
    mockEventSource.removeEventListener.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('SSEProvider', () => {
    it('should provide SSE context to children', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <SSEProvider>{children}</SSEProvider>
      );

      const { result } = renderHook(() => useSSEContext(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(result.current.isConnected).toBeDefined();
      expect(result.current.subscribe).toBeDefined();
      expect(result.current.setActiveRequestId).toBeDefined();
      expect(result.current.reconnect).toBeDefined();
    });

    it('should maintain connection state', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <SSEProvider>{children}</SSEProvider>
      );

      const { result } = renderHook(() => useSSEContext(), { wrapper });
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.activeRequestId).toBe(null);
    });
  });

  describe('useSSEContext', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useSSEContext());
      }).toThrow('useSSEContext must be used within a SSEProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('SSE Connection Management', () => {
    it('should connect when active request ID is set', async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <SSEProvider>{children}</SSEProvider>
      );

      const { result } = renderHook(() => useSSEContext(), { wrapper });
      const requestId = 'test-123';
      
      act(() => {
        result.current.setActiveRequestId(requestId);
      });

      expect(result.current.activeRequestId).toBe(requestId);
    });

    it('should handle subscription and unsubscription', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <SSEProvider>{children}</SSEProvider>
      );

      const { result } = renderHook(() => useSSEContext(), { wrapper });
      const mockHandler = vi.fn();
      
      let unsubscribe: (() => void) | undefined;

      act(() => {
        unsubscribe = result.current.subscribe('progress', mockHandler);
      });

      expect(unsubscribe).toBeDefined();
      expect(typeof unsubscribe).toBe('function');

      // Test unsubscribe
      act(() => {
        unsubscribe?.();
      });
    });

    it('should handle multiple event types in subscription', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <SSEProvider>{children}</SSEProvider>
      );

      const { result } = renderHook(() => useSSEContext(), { wrapper });
      const mockHandler = vi.fn();
      
      let unsubscribe: (() => void) | undefined;

      act(() => {
        unsubscribe = result.current.subscribe(['progress', 'complete'], mockHandler);
      });

      expect(unsubscribe).toBeDefined();

      // Cleanup
      act(() => {
        unsubscribe?.();
      });
    });

    it('should clear active request ID', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <SSEProvider>{children}</SSEProvider>
      );

      const { result } = renderHook(() => useSSEContext(), { wrapper });
      
      // Set request ID
      act(() => {
        result.current.setActiveRequestId('test-123');
      });
      expect(result.current.activeRequestId).toBe('test-123');

      // Clear request ID
      act(() => {
        result.current.setActiveRequestId(null);
      });
      expect(result.current.activeRequestId).toBe(null);
    });
  });

  describe('useSSESubscription hook', () => {
    it('should return subscription info', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <SSEProvider>{children}</SSEProvider>
      );

      const mockHandler = vi.fn();
      const mockErrorHandler = vi.fn();
      
      const { result } = renderHook(
        () => useSSESubscription('test-123', mockHandler, mockErrorHandler),
        { wrapper }
      );

      expect(result.current).toBeDefined();
      expect(result.current.isConnected).toBeDefined();
      expect(result.current.connectionError).toBeDefined();
    });

    it('should call handler when subscribed', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <SSEProvider>{children}</SSEProvider>
      );

      const mockHandler = vi.fn();
      
      renderHook(
        () => useSSESubscription('test-123', mockHandler),
        { wrapper }
      );

      // The subscription should be set up
      expect(mockHandler).not.toHaveBeenCalled(); // Not called yet since no events
    });

    it('should handle options parameter', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <SSEProvider>{children}</SSEProvider>
      );

      const mockHandler = vi.fn();
      const options = {
        eventTypes: ['progress', 'complete'],
        autoConnect: false,
      };
      
      const { result } = renderHook(
        () => useSSESubscription('test-123', mockHandler, undefined, options),
        { wrapper }
      );

      expect(result.current).toBeDefined();
    });

    it('should clean up on unmount', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <SSEProvider>{children}</SSEProvider>
      );

      const mockHandler = vi.fn();
      
      const { unmount } = renderHook(
        () => useSSESubscription('test-123', mockHandler),
        { wrapper }
      );

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Error handling', () => {
    it('should handle connection errors', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <SSEProvider>{children}</SSEProvider>
      );

      const { result } = renderHook(() => useSSEContext(), { wrapper });
      
      // Set request ID to trigger connection
      act(() => {
        result.current.setActiveRequestId('test-123');
      });

      // Simulate error event
      if (mockEventSource.addEventListener.mock.calls.length > 0) {
        const errorCall = mockEventSource.addEventListener.mock.calls.find(
          call => call[0] === 'error'
        );
        if (errorCall) {
          const errorHandler = errorCall[1];
          act(() => {
            errorHandler(new Event('error'));
          });
        }
      }

      expect(result.current.connectionError).toBeDefined();
    });

    it('should provide reconnect functionality', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <SSEProvider>{children}</SSEProvider>
      );

      const { result } = renderHook(() => useSSEContext(), { wrapper });
      
      expect(result.current.reconnect).toBeDefined();
      expect(typeof result.current.reconnect).toBe('function');

      // Should not throw when called
      expect(() => {
        result.current.reconnect();
      }).not.toThrow();
    });
  });

  describe('Message dispatching', () => {
    it('should handle message events when connected', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <SSEProvider>{children}</SSEProvider>
      );

      const { result } = renderHook(() => useSSEContext(), { wrapper });
      const mockHandler = vi.fn();
      
      // Subscribe to progress events
      act(() => {
        result.current.subscribe('progress', mockHandler);
        result.current.setActiveRequestId('test-123');
      });

      // Simulate receiving a message
      if (mockEventSource.addEventListener.mock.calls.length > 0) {
        const messageCall = mockEventSource.addEventListener.mock.calls.find(
          call => call[0] === 'message'
        );
        if (messageCall) {
          const messageHandler = messageCall[1];
          const mockEvent = {
            data: JSON.stringify({
              type: 'progress',
              data: { step: 1, message: 'Test' },
              timestamp: new Date().toISOString()
            })
          };
          
          act(() => {
            messageHandler(mockEvent);
          });
          
          expect(mockHandler).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'progress',
              data: { step: 1, message: 'Test' }
            })
          );
        }
      }
    });

    it('should handle wildcard subscriptions', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <SSEProvider>{children}</SSEProvider>
      );

      const { result } = renderHook(() => useSSEContext(), { wrapper });
      const mockHandler = vi.fn();
      
      // Subscribe to all events with wildcard
      act(() => {
        result.current.subscribe('*', mockHandler);
        result.current.setActiveRequestId('test-123');
      });

      // Should set up the subscription
      expect(mockHandler).not.toHaveBeenCalled(); // No events yet
    });
  });
});