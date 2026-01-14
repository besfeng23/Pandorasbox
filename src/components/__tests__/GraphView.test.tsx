/**
 * Phase 4: GraphView Component Tests
 */

import { render, screen } from '@testing-library/react';
import { GraphView } from '../GraphView';

// Mock ReactFlow
jest.mock('reactflow', () => {
  const ReactFlowComponent = ({ children }: { children: React.ReactNode }) => <div data-testid="reactflow">{children}</div>;
  return {
    __esModule: true,
    default: ReactFlowComponent,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ReactFlow: ReactFlowComponent,
    Background: () => <div>Background</div>,
    Controls: () => <div>Controls</div>,
    MiniMap: () => <div>MiniMap</div>,
    Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

describe('GraphView Component', () => {
  const mockNodes = [
    { id: 'node1', label: 'Test Node 1', type: 'concept' },
    { id: 'node2', label: 'Test Node 2', type: 'entity' },
  ];

  const mockEdges = [
    { id: 'edge1', sourceId: 'node1', targetId: 'node2', relation: 'related_to', weight: 0.5 },
  ];

  it('should render GraphView component with empty graph', () => {
    render(<GraphView nodes={[]} edges={[]} />);
    expect(screen.getByText(/No relationships yet/i)).toBeInTheDocument();
  });

  it('should render GraphView component with nodes and edges', () => {
    render(<GraphView nodes={mockNodes} edges={mockEdges} />);
    expect(screen.getByTestId('reactflow')).toBeInTheDocument();
  });
});

