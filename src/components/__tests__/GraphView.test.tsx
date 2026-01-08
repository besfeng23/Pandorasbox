/**
 * Phase 4: GraphView Component Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import { GraphView } from '../GraphView';

// Mock ReactFlow
jest.mock('reactflow', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReactFlow: ({ children }: { children: React.ReactNode }) => <div data-testid="reactflow">{children}</div>,
  Background: () => <div>Background</div>,
  Controls: () => <div>Controls</div>,
  MiniMap: () => <div>MiniMap</div>,
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock fetch
global.fetch = jest.fn();

describe('GraphView Component', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, nodes: [], edges: [] }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render GraphView component', () => {
    render(<GraphView userId="test-user" />);
    expect(screen.getByText(/Knowledge Graph/i)).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(<GraphView userId="test-user" />);
    expect(screen.getByPlaceholderText(/Search nodes/i)).toBeInTheDocument();
  });

  it('should render control buttons', () => {
    render(<GraphView userId="test-user" />);
    expect(screen.getByText(/Refresh/i)).toBeInTheDocument();
    expect(screen.getByText(/Enhance/i)).toBeInTheDocument();
  });
});

