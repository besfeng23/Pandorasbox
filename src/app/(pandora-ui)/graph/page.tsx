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
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Knowledge Graph</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {nodes.length} nodes • {edges.length} edges
          </p>
        </div>
        <Button onClick={fetchGraphData} disabled={isLoading} variant="outline">
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card/30 overflow-hidden h-[calc(100dvh-220px)] min-h-[520px]">
        <GraphView nodes={nodes} edges={edges} className="h-full" />
      </div>
    </div>
  );
}
