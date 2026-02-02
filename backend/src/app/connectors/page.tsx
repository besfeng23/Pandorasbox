'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/firebase';
import type { UserConnector } from '@/lib/types';
import { staticConnectors, type StaticConnector } from '@/lib/connectors';
import { connectDataSource, disconnectDataSource, getUserConnectors } from '@/app/actions';
import { cn } from '@/lib/utils';
import { Loader2, Plus, Info } from 'lucide-react';

type UiConnector = StaticConnector & {
  status: 'connected' | 'available' | 'error' | 'disconnected';
};

export default function ConnectorsPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [userConnectors, setUserConnectors] = useState<UserConnector[]>([]);

  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedConnector, setSelectedConnector] = useState<UiConnector | null>(null);
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    };

    const fetchConnectors = async () => {
      setIsLoading(true);
      try {
        const connectors = await getUserConnectors(user.uid);
        setUserConnectors(connectors);
      } catch (error) {
        console.error('Error fetching connectors:', error);
        toast({
          variant: 'destructive',
          title: 'Error fetching connectors',
          description: 'Could not fetch data connectors.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnectors();
  }, [user]);

  const uiConnectors = useMemo((): UiConnector[] => {
    return staticConnectors.map((staticConnector) => {
      const userConnector = userConnectors.find(uc => uc.id === staticConnector.id);
      let status: UiConnector['status'] = 'available';

      if (userConnector) {
        if (userConnector.status === 'connected') status = 'connected';
        else if (userConnector.status === 'error') status = 'error';
        else if (userConnector.status === 'disconnected') status = 'available'; // Treat disconnected as available to reconnect
      }

      return { ...staticConnector, status };
    });
  }, [userConnectors]);

  const handleConnectorClick = (connector: UiConnector) => {
    setSelectedConnector(connector);
    if (connector.status === 'connected') {
      setDisconnectDialogOpen(true);
      return;
    }

    // Handle connection flow
    switch (connector.type) {
      case 'url':
        setUrlDialogOpen(true);
        break;

      case 'config':
        toast({
          title: 'Configuration Required',
          description: 'This connector requires configuration.',
        });
        break;
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim() || !selectedConnector || !user) {
      toast({ variant: 'destructive', title: 'URL is required.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await connectDataSource(user.uid, selectedConnector.id, { url: urlInput.trim() });
      toast({
        title: 'Website Indexed!',
        description: `Started indexing: ${urlInput}`,
      });
      setUrlDialogOpen(false);
      setUrlInput('');
      // Refresh connectors
      const updatedConnectors = await getUserConnectors(user.uid);
      setUserConnectors(updatedConnectors);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!selectedConnector || !user) return;
    setIsSubmitting(true);
    try {
      await disconnectDataSource(user.uid, selectedConnector.id);
      toast({
        title: 'Disconnected',
        description: `Successfully disconnected from ${selectedConnector.name}.`
      });
      setDisconnectDialogOpen(false);
      // Refresh connectors
      const updatedConnectors = await getUserConnectors(user.uid);
      setUserConnectors(updatedConnectors);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const getStatusBadge = (status: UiConnector['status']) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'available':
        return <Badge variant="outline" className="text-muted-foreground">Available</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Available</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex-1 max-w-6xl mx-auto w-full py-12 md:py-20 px-8">
        <header className="mb-16">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/40 mb-4 block underline decoration-primary/30 underline-offset-8">Neural Pathways</span>
          <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground/90">Data Connectors</h1>
        </header>

        <div className="grid gap-px bg-border/5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {uiConnectors.map((connector) => {
            const Icon = connector.icon;
            const isActionable = connector.availability !== 'coming_soon';
            const isConnected = connector.status === 'connected';

            return (
              <div
                key={connector.id}
                className={cn(
                  "group relative p-8 bg-background border border-border/5 transition-all duration-500 hover:border-primary/20 hover:z-10",
                  !isActionable && "opacity-30 grayscale",
                  isConnected && "bg-primary/[0.01]"
                )}
              >
                <div className="flex flex-col h-full gap-8">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "p-3 transition-colors",
                      isConnected ? "text-primary bg-primary/5" : "text-foreground/20 bg-foreground/[0.03]"
                    )}>
                      <Icon className="h-5 w-5 stroke-[1]" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-widest",
                        isConnected ? "text-primary" : "text-foreground/20"
                      )}>
                        {connector.status}
                      </span>
                      {isConnected && <div className="h-0.5 w-4 bg-primary/40 animate-pulse" />}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[15px] font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                      {connector.name}
                    </h3>
                    <p className="text-[11px] text-foreground/30 leading-relaxed min-h-[3em]">
                      {connector.description}
                    </p>
                  </div>

                  <div className="mt-auto pt-6 border-t border-border/5">
                    <Button
                      className={cn(
                        "w-full h-10 rounded-none text-[10px] font-bold uppercase tracking-widest transition-all",
                        isConnected
                          ? "bg-transparent border border-red-500/20 text-red-400/60 hover:bg-red-500/5"
                          : "bg-foreground/5 text-foreground/60 hover:bg-primary hover:text-white"
                      )}
                      onClick={() => handleConnectorClick(connector)}
                      disabled={!isActionable || isSubmitting}
                    >
                      {isSubmitting && selectedConnector?.id === connector.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        isConnected ? 'Deactivate' : 'Initialize'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
        <DialogContent className="rounded-none border-border/10 bg-background/95 backdrop-blur-xl max-w-md p-10">
          <DialogHeader className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60">Input Protocol</span>
            <DialogTitle className="text-2xl font-light tracking-tight text-foreground/90">Index Website</DialogTitle>
            <DialogDescription className="text-xs text-foreground/40 leading-relaxed">
              Identify the target URL for neural ingestion. This process will decompose web content into semantic memory chunks.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="url" className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Target URI</Label>
              <Input
                id="url"
                placeholder="https://vault.fragment.io"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="rounded-none border-border/10 bg-foreground/[0.02] focus:ring-0 focus:border-primary/40 text-[13px] h-12"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUrlSubmit();
                }}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button
              onClick={handleUrlSubmit}
              className="w-full h-12 rounded-none bg-primary text-white text-[11px] font-bold uppercase tracking-widest hover:bg-primary/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin stroke-[1]" /> : 'Begin Ingestion'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setUrlDialogOpen(false)}
              className="w-full h-10 rounded-none text-[10px] font-bold uppercase tracking-widest text-foreground/30 hover:bg-foreground/5 hover:text-foreground"
            >
              Abort
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent className="rounded-none border-border/10 bg-background/95 backdrop-blur-xl max-w-sm p-10">
          <AlertDialogHeader className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-500/60 font-medium">Warning Protocol</span>
            <AlertDialogTitle className="text-xl font-light tracking-tight text-foreground/90 text-center">Sever Connection?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-foreground/40 text-center leading-relaxed">
              This action will disconnect the {selectedConnector?.name} substrate. Associated data fragments may become volatile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-8">
            <AlertDialogAction
              className="w-full h-12 rounded-none bg-red-500/10 text-red-500 border border-red-500/20 text-[11px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-none"
              onClick={handleDisconnect}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Severance'}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-10 rounded-none border-none text-[10px] font-bold uppercase tracking-widest text-foreground/30 hover:bg-foreground/5 bg-transparent">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
