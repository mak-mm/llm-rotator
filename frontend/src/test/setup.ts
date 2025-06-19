import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock EventSource for SSE tests
global.EventSource = class MockEventSource {
  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  
  constructor(url: string) {
    this.url = url;
    this.readyState = MockEventSource.CONNECTING;
    
    // Simulate connection open
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }
  
  close() {
    this.readyState = MockEventSource.CLOSED;
  }
  
  // Helper method for tests to simulate events
  simulateMessage(data: any, eventType?: string) {
    if (this.onmessage && this.readyState === MockEventSource.OPEN) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data),
        origin: this.url,
      });
      if (eventType) {
        Object.defineProperty(event, 'type', { value: eventType });
      }
      this.onmessage(event);
    }
  }
  
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
} as any;