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
import { useUser, useFirestore } from '@/firebase';
import type { UserConnector } from '@/lib/types';
import { staticConnectors, type StaticConnector } from '@/lib/connectors';
import { connectDataSource, disconnectDataSource, getUserConnectors } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

type UiConnector = StaticConnector & {
  status: 'connected' | 'available' | 'coming_soon' | 'error' | 'disconnected';
};

export default function ConnectorsPage() {
  const { user } = useUser();
  const db = useFirestore();
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

      if (staticConnector.availability === 'coming_soon') {
        status = 'coming_soon';
      } else if (userConnector) {
        if (userConnector.status === 'connected') status = 'connected';
        else if (userConnector.status === 'error') status = 'error';
        else if (userConnector.status === 'disconnected') status = 'available'; // Treat disconnected as available to reconnect
      }

      return { ...staticConnector, status };
    });
  }, [userConnectors]);

  const handleConnectorClick = (connector: UiConnector) => {
    setSelectedConnector(connector);
    if (connector.availability === 'coming_soon') {
      toast({
        title: 'Coming Soon',
        description: `${connector.name} integration is on our roadmap!`,
      });
      return;
    }

    if (connector.status === 'connected') {
      setDisconnectDialogOpen(true);
      return;
    }

    // Handle connection flow
    switch (connector.type) {
      case 'oauth':
        setIsSubmitting(true);
        console.log(`OAuth Flow Initiated for: ${connector.name}`);
        toast({
          title: 'Connecting (Mock)',
          description: `Please follow the OAuth flow for ${connector.name}.`,
        });
        // In a real app, this would redirect to an OAuth provider.
        // Here we simulate a successful connection.
        setTimeout(async () => {
          if(user) {
            await connectDataSource(user.uid, connector.id);
            toast({
              title: 'Connected!',
              description: `Successfully connected to ${connector.name}.`,
            });
            // Refresh connectors
            const updatedConnectors = await getUserConnectors(user.uid);
            setUserConnectors(updatedConnectors);
          }
          setIsSubmitting(false);
        }, 1500);
        break;

      case 'url':
        setUrlDialogOpen(true);
        break;

      case 'config':
        toast({
          title: 'Configuration Required',
          description: 'Database configuration is not yet available.',
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
    } catch(e: any) {
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
    } catch(e: any) {
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
      case 'coming_soon':
      default:
        return <Badge variant="secondary" className="text-muted-foreground">Coming Soon</Badge>;
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
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Data Connectors</h1>
          <p className="text-muted-foreground">
            Connect your data sources to enhance your AI's knowledge base.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {uiConnectors.map((connector) => {
            const Icon = connector.icon;
            const isActionable = connector.availability !== 'coming_soon';
            return (
              <Card
                key={connector.id}
                className={`flex flex-col transition-all ${
                  isActionable ? 'cursor-pointer hover:border-primary/50' : 'opacity-60'
                } ${connector.status === 'connected' ? 'border-green-500/30' : ''}`}
              >
                <CardHeader className="pb-3" onClick={() => isActionable && handleConnectorClick(connector)}>
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    {getStatusBadge(connector.status)}
                  </div>
                  <CardTitle className="text-lg mt-3">{connector.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow" onClick={() => isActionable && handleConnectorClick(connector)}>
                  <CardDescription>{connector.description}</CardDescription>
                </CardContent>
                <CardContent>
                    <Button 
                        className="w-full"
                        onClick={() => handleConnectorClick(connector)}
                        disabled={!isActionable || isSubmitting}
                        variant={connector.status === 'connected' ? 'destructive' : 'default'}
                    >
                        {connector.status === 'connected' ? 'Disconnect' : 'Connect'}
                    </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Index a Public Website</DialogTitle>
            <DialogDescription>
              Provide a URL to index its content. This may take a few minutes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                placeholder="https://example.com"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUrlSubmit();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUrlDialogOpen(false)}>Cancel</Button>
            <Button type="submit" onClick={handleUrlSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Index URL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will disconnect your account from {selectedConnector?.name}. Any indexed data may be removed.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    className={buttonVariants({ variant: 'destructive' })}
                    onClick={handleDisconnect}
                    disabled={isSubmitting}
                >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Disconnect
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
 