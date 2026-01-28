'use client';

import React from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Building, ShieldCheck } from 'lucide-react';

export default function WorkspacesPage() {
    return (
        <AppLayout>
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Workspaces</h2>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> New Workspace
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Personal Workspace</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Active</div>
                            <p className="text-xs text-muted-foreground">
                                Your private Sovereign AI environment.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="opacity-60">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Team Workspace</CardTitle>
                            <Building className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Coming Soon</div>
                            <p className="text-xs text-muted-foreground">
                                Collaborate with your team on shared memories and agents.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Enterprise Security</CardTitle>
                        <CardDescription>Multi-tenant isolation ensures data sovereignty.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-4">
                            <ShieldCheck className="h-10 w-10 text-green-500" />
                            <div>
                                <p className="font-semibold">Sovereign Encryption</p>
                                <p className="text-sm text-muted-foreground">Each workspace has its own encryption keys and isolated vector collection.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
