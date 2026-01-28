'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Link as LinkIcon, FileText, Globe, Zap, Database, Brain } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { KnowledgeUpload } from './settings/knowledge-upload'; // Reuse existing file upload
import { useUser } from '@/firebase';

interface DataConnectorsProps {
  userId: string;
  agentId: string;
}

const MCP_TOOLS = [
  {
    name: 'search_knowledge_base',
    description: 'Semantic search across memories and history',
    icon: Database,
  },
  {
    name: 'add_memory',
    description: 'Store new memories with embeddings',
    icon: Brain,
  },
  {
    name: 'generate_artifact',
    description: 'Create and save code/markdown artifacts',
    icon: Zap,
  },
];

export function DataConnectors({ userId, agentId }: DataConnectorsProps) {
  const [url, setUrl] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [webDialogOpen, setWebDialogOpen] = useState(false);

  const handleWebSubmit = () => {
    if (!url) return;

    startTransition(async () => {
      try {
        const idToken = await (await import('@/firebase')).getAuthToken();
        const response = await fetch('/api/connectors/web', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ url, agentId }),
        });

        if (!response.ok) {
          throw new Error((await response.json()).error || 'Failed to ingest website');
        }

        const data = await response.json();

        toast({
          title: 'Success!',
          description: `Successfully indexed ${data.chunks} chunks from ${url}`,
        });
        setWebDialogOpen(false);
        setUrl('');
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Ingestion Failed',
          description: error.message,
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Website Connector */}
        <Dialog open={webDialogOpen} onOpenChange={setWebDialogOpen}>
          <DialogTrigger asChild>
            <div className="group relative glass-panel border border-cyan-400/20 rounded-xl p-6 cursor-pointer hover:bg-white/5 transition-all">
              <Globe className="h-8 w-8 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-lg mb-1 text-primary">Public Website</h3>
              <p className="text-sm text-white/60">Ingest content from any public URL.</p>
            </div>
          </DialogTrigger>
          <DialogContent className="glass-panel-strong border border-cyan-400/20">
            <DialogHeader>
              <DialogTitle>Connect Website</DialogTitle>
              <DialogDescription>
                Enter a public URL to ingest its text content into your knowledge base.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-black/40 border-white/10"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setWebDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleWebSubmit} disabled={isPending || !url} className="bg-cyan-600 hover:bg-cyan-700">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ingest
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* File Upload (Reusing Component) */}
        <div className="group relative glass-panel border border-cyan-400/20 rounded-xl p-6">
          <FileText className="h-8 w-8 text-cyan-400 mb-4" />
          <h3 className="font-semibold text-lg mb-4 text-primary">File Upload</h3>
          <KnowledgeUpload userId={userId} agentId={agentId} />
        </div>
      </div>

      <div className="pt-6 border-t border-cyan-400/20">
        <h3 className="text-sm font-semibold mb-4 text-primary flex items-center gap-2">
          <Zap className="h-4 w-4" /> Active Capabilities (MCP)
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {MCP_TOOLS.map((tool) => (
            <div key={tool.name} className="flex items-start gap-3 p-3 glass-panel border border-cyan-400/10 rounded-lg">
              <div className="p-2 bg-cyan-400/10 rounded-md">
                <tool.icon className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">{tool.name}</p>
                <p className="text-xs text-white/50">{tool.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


