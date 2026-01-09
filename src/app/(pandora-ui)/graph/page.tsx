'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { GraphView, GraphViewNode, GraphViewEdge } from '@/components/GraphView';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="h-full bg-black text-white flex flex-col">
      {/* Page Header */}
      <div className="border-b border-white/10 px-4 py-3 bg-black flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium text-white">Knowledge Graph</h1>
          <span className="text-sm text-white/60">
            ({nodes.length} nodes, {edges.length} edges)
          </span>
        </div>
        <Button
          onClick={fetchGraphData}
          disabled={isLoading}
          variant="outline"
          className="bg-black border-white/10 text-white hover:bg-white/10"
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Graph Visualization */}
      <div className="flex-1 p-4 sm:px-6 lg:px-8 bg-black overflow-hidden">
        <div className="h-full w-full">
          <GraphView nodes={nodes} edges={edges} className="h-full" />
        </div>
      </div>
    </div>
  );
}
