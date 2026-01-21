'use client';

import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
// @ts-ignore - dagre types might not be available
import dagre from 'dagre';
import { cn } from '@/lib/utils';

export interface GraphViewNode {
  id: string;
  label: string;
  type?: string;
}

export interface GraphViewEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation?: string;
  weight?: number;
}

interface GraphViewProps {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
  className?: string;
}

const nodeWidth = 200;
const nodeHeight = 60;

function layoutGraph(nodes: GraphViewNode[], edges: GraphViewEdge[]) {
  const flowNodes: Node[] = nodes.map(node => ({
    id: node.id,
    position: { x: 0, y: 0 },
    data: {
      label: node.label,
    },
    type: 'default',
  }));

  const flowEdges: Edge[] = edges.map(edge => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.relation,
    animated: true,
    style: {
      strokeWidth: Math.max(1, (edge.weight ?? 0.5) * 2),
      stroke: '#22d3ee',
    },
  }));

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: 'LR',
    nodesep: 50,
    ranksep: 120,
  });

  flowNodes.forEach(node => {
    graph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  flowEdges.forEach(edge => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  const layoutedNodes = flowNodes.map(node => {
    const nodeWithPosition = graph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges: flowEdges };
}

function GraphViewInner({ nodes, edges, className }: GraphViewProps) {
  const graphKey = useMemo(() => `${nodes.length}-${edges.length}`, [nodes.length, edges.length]);
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => layoutGraph(nodes, edges),
    [graphKey, nodes, edges]
  );

  if (nodes.length === 0) {
    return (
      <div className={cn('flex h-full w-full items-center justify-center text-sm text-muted-foreground', className)}>
        No relationships yet. Add memories to grow the graph.
      </div>
    );
  }

  return (
    <div className={cn('h-full w-full rounded-xl border border-border/60 bg-background/80', className)}>
      <ReactFlow
        nodes={layoutedNodes}
        edges={layoutedEdges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background gap={24} size={1} color="rgba(148, 163, 184, 0.15)" />
        <Controls />
        <MiniMap nodeColor={() => '#38bdf8'} />
        <Panel position="top-left" className="rounded-lg border border-border/60 bg-background/90 px-3 py-2 text-xs">
          Dynamic Knowledge Graph
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function GraphView(props: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} />
    </ReactFlowProvider>
  );
}
