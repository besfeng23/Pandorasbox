'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Plug,
    Search,
    ExternalLink,
    CheckCircle,
    Circle,
    Zap,
    Calendar,
    Mail,
    FileSpreadsheet,
    MessageCircle,
    Cloud,
    Database,
    Lock
} from 'lucide-react';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Integration {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    category: 'productivity' | 'communication' | 'storage' | 'ai';
    status: 'available' | 'connected' | 'coming-soon';
    popular?: boolean;
}

const integrations: Integration[] = [
    {
        id: 'google-calendar',
        name: 'Google Calendar',
        description: 'Sync events and schedule meetings with AI assistance.',
        icon: <Calendar className="h-6 w-6" />,
        category: 'productivity',
        status: 'available',
        popular: true,
    },
    {
        id: 'gmail',
        name: 'Gmail',
        description: 'Analyze emails and draft responses with AI.',
        icon: <Mail className="h-6 w-6" />,
        category: 'communication',
        status: 'available',
        popular: true,
    },
    {
        id: 'notion',
        name: 'Notion',
        description: 'Import documents and sync notes to your knowledge base.',
        icon: <FileSpreadsheet className="h-6 w-6" />,
        category: 'productivity',
        status: 'coming-soon',
    },
    {
        id: 'slack',
        name: 'Slack',
        description: 'Get AI insights directly in your Slack channels.',
        icon: <MessageCircle className="h-6 w-6" />,
        category: 'communication',
        status: 'coming-soon',
    },
    {
        id: 'google-drive',
        name: 'Google Drive',
        description: 'Index files and documents from your Drive.',
        icon: <Cloud className="h-6 w-6" />,
        category: 'storage',
        status: 'available',
    },
    {
        id: 'dropbox',
        name: 'Dropbox',
        description: 'Sync files and folders to your knowledge base.',
        icon: <Database className="h-6 w-6" />,
        category: 'storage',
        status: 'coming-soon',
    },
    {
        id: 'openai',
        name: 'OpenAI API',
        description: 'Use GPT-4 as an alternative inference backend.',
        icon: <Zap className="h-6 w-6" />,
        category: 'ai',
        status: 'available',
    },
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        description: 'Use Claude as an alternative inference backend.',
        icon: <Zap className="h-6 w-6" />,
        category: 'ai',
        status: 'coming-soon',
    },
];

export default function IntegrationsPage() {
    const { user } = useUser();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'connected' | 'available'>('all');

    const filteredIntegrations = integrations.filter(integration => {
        const matchesSearch = integration.name.toLowerCase().includes(search.toLowerCase()) ||
            integration.description.toLowerCase().includes(search.toLowerCase());

        if (!matchesSearch) return false;

        switch (filter) {
            case 'connected':
                return integration.status === 'connected';
            case 'available':
                return integration.status === 'available';
            default:
                return true;
        }
    });

    const handleConnect = (integration: Integration) => {
        if (integration.status === 'coming-soon') {
            toast.info(`${integration.name} is coming soon!`);
            return;
        }

        toast.success(`Connecting to ${integration.name}...`);
        // In production, this would open OAuth flow
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'connected':
                return (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                    </Badge>
                );
            case 'coming-soon':
                return (
                    <Badge variant="outline" className="text-muted-foreground">
                        <Lock className="h-3 w-3 mr-1" />
                        Coming Soon
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-primary border-primary/30">
                        <Circle className="h-3 w-3 mr-1" />
                        Available
                    </Badge>
                );
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'productivity':
                return 'bg-blue-500/10 text-blue-500';
            case 'communication':
                return 'bg-purple-500/10 text-purple-500';
            case 'storage':
                return 'bg-amber-500/10 text-amber-500';
            case 'ai':
                return 'bg-green-500/10 text-green-500';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    if (!user) return null;

    return (
        <AppLayout>
            <div className="flex-1 space-y-6 p-8 pt-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Plug className="h-8 w-8 text-primary" />
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">Integrations</h2>
                            <p className="text-sm text-muted-foreground">
                                Connect external services to enhance your AI experience
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search integrations..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={filter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('all')}
                        >
                            All
                        </Button>
                        <Button
                            variant={filter === 'available' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('available')}
                        >
                            Available
                        </Button>
                        <Button
                            variant={filter === 'connected' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('connected')}
                        >
                            Connected
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredIntegrations.map((integration) => (
                        <Card
                            key={integration.id}
                            className={cn(
                                "relative overflow-hidden transition-all hover:shadow-lg",
                                integration.status === 'coming-soon' && "opacity-70"
                            )}
                        >
                            {integration.popular && (
                                <div className="absolute top-0 right-0">
                                    <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground text-[10px]">
                                        Popular
                                    </Badge>
                                </div>
                            )}
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className={cn(
                                        "p-3 rounded-xl",
                                        getCategoryColor(integration.category)
                                    )}>
                                        {integration.icon}
                                    </div>
                                    {getStatusBadge(integration.status)}
                                </div>
                                <CardTitle className="mt-3">{integration.name}</CardTitle>
                                <CardDescription className="line-clamp-2">
                                    {integration.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <Badge
                                        variant="outline"
                                        className={cn("text-[10px] uppercase", getCategoryColor(integration.category))}
                                    >
                                        {integration.category}
                                    </Badge>
                                    <Button
                                        size="sm"
                                        variant={integration.status === 'connected' ? 'outline' : 'default'}
                                        disabled={integration.status === 'coming-soon'}
                                        onClick={() => handleConnect(integration)}
                                    >
                                        {integration.status === 'connected' ? (
                                            <>
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                Manage
                                            </>
                                        ) : integration.status === 'coming-soon' ? (
                                            'Coming Soon'
                                        ) : (
                                            <>
                                                <Plug className="h-4 w-4 mr-2" />
                                                Connect
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {filteredIntegrations.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Plug className="h-12 w-12 text-muted-foreground/20 mb-4" />
                        <p className="text-muted-foreground">No integrations found</p>
                        <p className="text-sm text-muted-foreground/60">
                            Try adjusting your search or filters
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
