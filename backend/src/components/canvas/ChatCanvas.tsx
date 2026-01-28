'use client';

import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  Panel,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
// @ts-ignore - dagre types might not be available
import dagre from 'dagre';
import type { Message, Thread } from '@/lib/types';
import { nodeTypes } from './CustomNodes';
import { ChatInput } from '../chat/chat-input';
import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatCanvasProps {
  messages: Message[];
  thread: Thread | null;
  userId: string;
  onMessageSubmit: (formData: FormData) => boolean;
  isSending: boolean;
}

const nodeWidth = 400;
const nodeHeight = 200;

// Stable edge style references
const USER_EDGE_STYLE = { stroke: '#007AFF', strokeWidth: 2 };
const ASSISTANT_EDGE_STYLE = { stroke: '#8E8E93', strokeWidth: 2 };

// Convert linear messages array to ReactFlow nodes and edges with dagre layout
function convertMessagesToFlow(messages: Message[]): { nodes: Node[]; edges: Edge[] } {
  if (messages.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Create nodes and edges from messages
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  messages.forEach((message, index) => {
    const nodeId = message.id;
    const nodeType = message.role === 'user' ? 'user' : 'assistant';

    nodes.push({
      id: nodeId,
      type: nodeType,
      data: { message },
      position: { x: 0, y: 0 }, // Will be calculated by dagre
    });

    // Create edges: each message connects to the next one
    if (index > 0) {
      const prevNodeId = messages[index - 1].id;
      edges.push({
        id: `e${prevNodeId}-${nodeId}`,
        source: prevNodeId,
        target: nodeId,
        type: 'smoothstep',
        animated: true,
        style: message.role === 'user' ? USER_EDGE_STYLE : ASSISTANT_EDGE_STYLE,
      });
    }
  });

  // Use dagre to layout nodes in a tree (vertical flow)
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB', // Top to Bottom
    nodesep: 50,
    ranksep: 100,
    align: 'UL',
  });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  // Update node positions from dagre
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

function ChatCanvasInner({
  messages,
  thread,
  userId,
  onMessageSubmit,
  isSending
}: ChatCanvasProps) {
  // Memoize nodes/edges conversion - use message IDs as dependency for stability
  const messagesKey = useMemo(() => messages.map(m => m.id).join(','), [messages]);
  const { nodes, edges } = useMemo(
    () => convertMessagesToFlow(messages),
    [messagesKey]
  );

  const { fitView } = useReactFlow();
  const hasScrolledToLatest = useRef(false);
  const fitViewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized fitView callback
  const scrollToLatest = useCallback(() => {
    if (nodes.length > 0 && !hasScrolledToLatest.current) {
      // Clear any pending fitView calls
      if (fitViewTimeoutRef.current) {
        clearTimeout(fitViewTimeoutRef.current);
      }

      // Small delay to ensure nodes are rendered
      fitViewTimeoutRef.current = setTimeout(() => {
        const latestNode = nodes[nodes.length - 1];
        if (latestNode) {
          fitView({
            nodes: [{ id: latestNode.id }],
            padding: 0.2,
            duration: 800,
          });
        }
        hasScrolledToLatest.current = true;
      }, 150);
    }
  }, [nodes, fitView]);

  // Scroll to latest message when messages change
  useEffect(() => {
    scrollToLatest();
    return () => {
      if (fitViewTimeoutRef.current) {
        clearTimeout(fitViewTimeoutRef.current);
      }
    };
  }, [scrollToLatest]);

  // Reset scroll flag when thread changes
  useEffect(() => {
    hasScrolledToLatest.current = false;
    if (fitViewTimeoutRef.current) {
      clearTimeout(fitViewTimeoutRef.current);
    }
  }, [thread?.id]);

  const hasSummary = useMemo(
    () => thread?.summary && thread.summary.length > 0,
    [thread?.summary]
  );

  // Memoize MiniMap nodeColor function
  const getNodeColor = useCallback((node: Node) => {
    return node.type === 'user' ? '#007AFF' : '#8E8E93';
  }, []);

  return (
    <div className="relative w-full h-full bg-background">

      {/* Thread summary panel */}
      {hasSummary && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 right-4 z-10 max-w-md p-4 rounded-xl glass-panel-strong border-primary/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <h3 className="font-semibold text-base text-primary">Conversation Summary</h3>
          </div>
          <p className="text-sm text-muted-foreground italic">
            {thread?.summary}
          </p>
        </motion.div>
      )}

      {/* ReactFlow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        className="bg-transparent"
        edgesUpdatable={false}
        nodesDraggable={true}
        nodesConnectable={false}
        selectNodesOnDrag={false}
        nodesFocusable={false}
        edgesFocusable={false}
        onlyRenderVisibleElements={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="rgba(147, 197, 253, 0.05)"
          gap={20}
          size={1}
        />
        <Controls
          className="glass-panel-strong border-primary/20 rounded-lg"
          showInteractive={false}
        />
        <MiniMap
          className="glass-panel-strong border-primary/20 rounded-lg"
          nodeColor={getNodeColor}
          maskColor="rgba(2, 4, 10, 0.8)"
        />

        {/* Empty state */}
        {nodes.length === 0 && !hasSummary && (
          <Panel position="top-center" className="mt-20">
            <div className="text-center text-muted-foreground glass-panel-strong border-primary/20 p-6 rounded-xl">
              <p className="text-lg font-medium text-foreground">No messages yet.</p>
              <p className="text-sm mt-2 text-muted-foreground">Start a conversation below.</p>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Floating Command Bar (Omni-Bar) */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-2xl px-4">
        <ChatInput
          userId={userId}
          onMessageSubmit={onMessageSubmit}
          isSending={isSending}
        />
      </div>
    </div>
  );
}

export function ChatCanvas(props: ChatCanvasProps) {
  return (
    <ReactFlowProvider>
      <ChatCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
