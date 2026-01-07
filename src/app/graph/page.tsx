'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { GraphView, GraphViewNode, GraphViewEdge } from '@/components/GraphView';
import { Loader2, RefreshCw, GitGraph } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function GraphPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const [nodes, setNodes] = useState<GraphViewNode[]>([]);
  const [edges, setEdges] = useState<GraphViewEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchGraphData = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/system/knowledge?userId=${user.uid}`);
      const data = await response.json();

      if (data.success && data.graph) {
        // Transform data to match GraphView format
        const graphNodes: GraphViewNode[] = data.graph.nodes.map((node: any) => ({
          id: node.id,
          label: node.label,
          type: node.type,
        }));

        const graphEdges: GraphViewEdge[] = data.graph.edges.map((edge: any) => ({
          id: edge.id,
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          relation: edge.relation,
          weight: edge.weight,
        }));

        setNodes(graphNodes);
        setEdges(graphEdges);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to load knowledge graph',
        });
      }
    } catch (error) {
      console.error('Error fetching graph data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load knowledge graph',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid && !isUserLoading) {
      fetchGraphData();
    }
  }, [user?.uid, isUserLoading]);

  if (isUserLoading || isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-black via-gray-900 to-black flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitGraph className="h-6 w-6 text-cyan-400" />
              <h1 className="text-2xl font-bold text-white">Knowledge Graph</h1>
              <span className="text-sm text-gray-400">
                ({nodes.length} nodes, {edges.length} edges)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={fetchGraphData}
                disabled={isLoading}
                variant="outline"
                className="bg-black/40 border-white/10 text-white hover:bg-white/10"
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                Refresh
              </Button>
              <Link href="/">
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  ← Back to Chat
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Graph Visualization */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto h-full min-h-[calc(100vh-120px)]">
          <GraphView nodes={nodes} edges={edges} className="h-full" />
        </div>
      </div>
    </div>
  );
}

