import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryInterface } from '../query-interface';
import { QueryProvider } from '@/contexts/query-context';
import { SSEProvider } from '@/contexts/sse-context';

// Mock the API
const mockSubmitQuery = vi.fn();
vi.mock('@/lib/api', () => ({
  submitQuery: () => mockSubmitQuery(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('QueryInterface', () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryProvider>
      <SSEProvider>
        {children}
      </SSEProvider>
    </QueryProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitQuery.mockReset();
  });

  it('should render query input form', () => {
    render(<QueryInterface />, { wrapper: Wrapper });

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('should allow typing in the query input', async () => {
    const user = userEvent.setup();
    render(<QueryInterface />, { wrapper: Wrapper });

    const input = screen.getByRole('textbox');
    await user.type(input, 'Test query');

    expect(input).toHaveValue('Test query');
  });

  it('should submit query when form is submitted', async () => {
    const user = userEvent.setup();
    mockSubmitQuery.mockResolvedValue({
      requestId: 'test-123',
      status: 'processing',
    });

    render(<QueryInterface />, { wrapper: Wrapper });

    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await user.type(input, 'Test query');
    await user.click(submitButton);

    expect(mockSubmitQuery).toHaveBeenCalledWith({
      query: 'Test query',
    });
  });

  it('should disable submit button when query is empty', () => {
    render(<QueryInterface />, { wrapper: Wrapper });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when query is not empty', async () => {
    const user = userEvent.setup();
    render(<QueryInterface />, { wrapper: Wrapper });

    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await user.type(input, 'Test');
    expect(submitButton).not.toBeDisabled();
  });

  it('should show loading state while submitting', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: any) => void;
    const submitPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    mockSubmitQuery.mockReturnValue(submitPromise);

    render(<QueryInterface />, { wrapper: Wrapper });

    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await user.type(input, 'Test query');
    await user.click(submitButton);

    expect(screen.getByText(/processing/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Resolve the promise
    resolvePromise!({
      requestId: 'test-123',
      status: 'processing',
    });

    await waitFor(() => {
      expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
    });
  });

  it('should handle submit error', async () => {
    const user = userEvent.setup();
    mockSubmitQuery.mockRejectedValue(new Error('Submit failed'));

    render(<QueryInterface />, { wrapper: Wrapper });

    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await user.type(input, 'Test query');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should clear query after successful submission', async () => {
    const user = userEvent.setup();
    mockSubmitQuery.mockResolvedValue({
      requestId: 'test-123',
      status: 'processing',
    });

    render(<QueryInterface />, { wrapper: Wrapper });

    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await user.type(input, 'Test query');
    await user.click(submitButton);

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('should show query examples', () => {
    render(<QueryInterface />, { wrapper: Wrapper });

    expect(screen.getByText(/example/i)).toBeInTheDocument();
  });

  it('should fill query with example when clicked', async () => {
    const user = userEvent.setup();
    render(<QueryInterface />, { wrapper: Wrapper });

    const input = screen.getByRole('textbox');
    
    // Click on an example (assuming there's an example button)
    const exampleButton = screen.getByText(/try example/i);
    await user.click(exampleButton);

    expect(input).not.toHaveValue('');
  });

  it('should handle keyboard shortcuts', async () => {
    const user = userEvent.setup();
    mockSubmitQuery.mockResolvedValue({
      requestId: 'test-123',
      status: 'processing',
    });

    render(<QueryInterface />, { wrapper: Wrapper });

    const input = screen.getByRole('textbox');
    await user.type(input, 'Test query');

    // Ctrl+Enter should submit
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(mockSubmitQuery).toHaveBeenCalled();
  });

  it('should validate query length', async () => {
    const user = userEvent.setup();
    render(<QueryInterface />, { wrapper: Wrapper });

    const input = screen.getByRole('textbox');
    const longQuery = 'a'.repeat(10000); // Very long query

    await user.type(input, longQuery);

    expect(screen.getByText(/too long/i)).toBeInTheDocument();
  });

  it('should show character count', async () => {
    const user = userEvent.setup();
    render(<QueryInterface />, { wrapper: Wrapper });

    const input = screen.getByRole('textbox');
    await user.type(input, 'Test');

    expect(screen.getByText(/4/)).toBeInTheDocument();
  });

  it('should handle SSE connection for real-time updates', async () => {
    const user = userEvent.setup();
    mockSubmitQuery.mockResolvedValue({
      requestId: 'test-123',
      status: 'processing',
    });

    render(<QueryInterface />, { wrapper: Wrapper });

    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await user.type(input, 'Test query');
    await user.click(submitButton);

    // Should start SSE connection
    await waitFor(() => {
      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });
  });

  it('should display progress from SSE events', async () => {
    const user = userEvent.setup();
    mockSubmitQuery.mockResolvedValue({
      requestId: 'test-123',
      status: 'processing',
    });

    render(<QueryInterface />, { wrapper: Wrapper });

    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await user.type(input, 'Test query');
    await user.click(submitButton);

    // Mock SSE progress update
    // This would typically come from the SSE context
    await waitFor(() => {
      expect(screen.getByText(/step/i)).toBeInTheDocument();
    });
  });

  it('should show result when processing completes', async () => {
    const user = userEvent.setup();
    mockSubmitQuery.mockResolvedValue({
      requestId: 'test-123',
      status: 'completed',
      aggregatedResponse: 'This is the final response',
    });

    render(<QueryInterface />, { wrapper: Wrapper });

    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await user.type(input, 'Test query');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/final response/i)).toBeInTheDocument();
    });
  });
});