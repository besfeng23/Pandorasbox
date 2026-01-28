'use client';

import React from 'react';
import { AppLayout } from '@/components/dashboard/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Server, Database, Users, AlertTriangle } from 'lucide-react';

export default function AdminPage() {
    return (
        <AppLayout>
            <div className="flex-1 space-y-4 p-8 pt-6">
                <h2 className="text-3xl font-bold tracking-tight">Admin Cockpit</h2>

                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="logs">Logs</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">1</div>
                                    <p className="text-xs text-muted-foreground">+0% from last month</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">System Health</CardTitle>
                                    <Activity className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">Healthy</div>
                                    <p className="text-xs text-muted-foreground">All systems operational</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Vector Count</CardTitle>
                                    <Database className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">128</div>
                                    <p className="text-xs text-muted-foreground">Memories indexed</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Server Load</CardTitle>
                                    <Server className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">12%</div>
                                    <p className="text-xs text-muted-foreground">CPU Usage (vLLM)</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                            <Card className="col-span-4">
                                <CardHeader>
                                    <CardTitle>System Telemetry</CardTitle>
                                    <CardDescription>Real-time metrics from the Sovereign Brain.</CardDescription>
                                </CardHeader>
                                <CardContent className="pl-2">
                                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                                        Graph Placeholder (Latency/Tokens per sec)
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="col-span-3">
                                <CardHeader>
                                    <CardTitle>Recent Alerts</CardTitle>
                                    <CardDescription>System notifications and warnings.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center">
                                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                            <div className="ml-2 space-y-1">
                                                <p className="text-sm font-medium leading-none">vLLM Started</p>
                                                <p className="text-xs text-muted-foreground">2 hours ago</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="users">
                        <Card>
                            <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
                            <CardContent>User list coming soon.</CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="logs">
                        <Card>
                            <CardHeader><CardTitle>Audit Logs</CardTitle></CardHeader>
                            <CardContent>System logs coming soon.</CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
