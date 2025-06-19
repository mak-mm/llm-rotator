import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProcessingFlow } from '../ProcessingFlow';
import { SSEProvider } from '@/contexts/sse-context';
import { QueryProvider } from '@/contexts/query-context';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock React Flow
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: any) => <div data-testid="react-flow">{children}</div>,
  Background: () => <div data-testid="react-flow-background" />,
  Controls: () => <div data-testid="react-flow-controls" />,
  MiniMap: () => <div data-testid="react-flow-minimap" />,
  Handle: ({ type, position }: any) => (
    <div data-testid={`handle-${type}-${position}`} />
  ),
  Position: {
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
    Left: 'left',
  },
  MarkerType: {
    ArrowClosed: 'arrowclosed',
  },
}));

const mockRequestData = {
  requestId: 'test-123',
  status: 'processing',
  progress: {
    currentStep: 2,
    totalSteps: 7,
    stepName: 'detection',
    percentage: 28.6,
  },
  detection: {
    hasPII: true,
    hasCode: false,
    sensitivityScore: 0.7,
    entities: ['John Doe', 'Acme Corp'],
  },
  fragments: [
    { id: 'f1', content: 'Fragment 1', metadata: { index: 0 } },
    { id: 'f2', content: 'Fragment 2', metadata: { index: 1 } },
  ],
  providers: ['openai', 'anthropic'],
};

describe('ProcessingFlow', () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryProvider>
      <SSEProvider>
        {children}
      </SSEProvider>
    </QueryProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the flow diagram', () => {
    render(
      <ProcessingFlow requestId="test-123" requestData={mockRequestData} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    expect(screen.getByTestId('react-flow-background')).toBeInTheDocument();
    expect(screen.getByTestId('react-flow-controls')).toBeInTheDocument();
  });

  it('should display progress information', () => {
    render(
      <ProcessingFlow requestId="test-123" requestData={mockRequestData} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText(/Step 2 of 7/i)).toBeInTheDocument();
    expect(screen.getByText(/detection/i)).toBeInTheDocument();
  });

  it('should show processing nodes', async () => {
    render(
      <ProcessingFlow requestId="test-123" requestData={mockRequestData} />,
      { wrapper: Wrapper }
    );

    // Wait for nodes to render
    await waitFor(() => {
      expect(screen.getByText(/Query Input/i)).toBeInTheDocument();
      expect(screen.getByText(/Detection/i)).toBeInTheDocument();
      expect(screen.getByText(/Fragmentation/i)).toBeInTheDocument();
    });
  });

  it('should update based on SSE events', async () => {
    const { rerender } = render(
      <ProcessingFlow requestId="test-123" requestData={mockRequestData} />,
      { wrapper: Wrapper }
    );

    // Simulate progress update
    const updatedData = {
      ...mockRequestData,
      progress: {
        currentStep: 4,
        totalSteps: 7,
        stepName: 'routing',
        percentage: 57.1,
      },
    };

    rerender(
      <ProcessingFlow requestId="test-123" requestData={updatedData} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Step 4 of 7/i)).toBeInTheDocument();
      expect(screen.getByText(/routing/i)).toBeInTheDocument();
    });
  });

  it('should show completion state', async () => {
    const completedData = {
      ...mockRequestData,
      status: 'completed',
      progress: {
        currentStep: 7,
        totalSteps: 7,
        stepName: 'complete',
        percentage: 100,
      },
      aggregatedResponse: 'Final response text',
    };

    render(
      <ProcessingFlow requestId="test-123" requestData={completedData} />,
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText(/Complete/i)).toBeInTheDocument();
      expect(screen.getByText(/100%/i)).toBeInTheDocument();
    });
  });

  it('should show error state', async () => {
    const errorData = {
      ...mockRequestData,
      status: 'failed',
      error: 'Processing failed',
    };

    render(
      <ProcessingFlow requestId="test-123" requestData={errorData} />,
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Processing failed/i)).toBeInTheDocument();
    });
  });

  it('should display fragment information', () => {
    render(
      <ProcessingFlow requestId="test-123" requestData={mockRequestData} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText(/2 fragments/i)).toBeInTheDocument();
  });

  it('should show provider information', () => {
    render(
      <ProcessingFlow requestId="test-123" requestData={mockRequestData} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText(/openai/i)).toBeInTheDocument();
    expect(screen.getByText(/anthropic/i)).toBeInTheDocument();
  });

  it('should handle missing request data gracefully', () => {
    render(
      <ProcessingFlow requestId="test-123" requestData={null} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText(/Waiting for data/i)).toBeInTheDocument();
  });

  it('should highlight active step', async () => {
    render(
      <ProcessingFlow requestId="test-123" requestData={mockRequestData} />,
      { wrapper: Wrapper }
    );

    // Current step is 'detection' (step 2)
    await waitFor(() => {
      const detectionNode = screen.getByText(/Detection/i).closest('div');
      expect(detectionNode).toHaveClass('active');
    });
  });
});