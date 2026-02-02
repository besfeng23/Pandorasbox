
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Brain, Eye } from 'lucide-react';

export default function AISettingsPage() {
    const [visionEnabled, setVisionEnabled] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    // In a real app, this would fetch from user settings in Firestore
    useEffect(() => {
        const stored = localStorage.getItem('vision_enabled');
        if (stored) setVisionEnabled(stored === 'true');
    }, []);

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));
            localStorage.setItem('vision_enabled', visionEnabled.toString());

            toast({
                title: "Settings Saved",
                description: `AI Vision is now ${visionEnabled ? 'enabled' : 'disabled'}.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error saving settings',
                description: error.message || "An unknown error occurred.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        <CardTitle>AI Configuration</CardTitle>
                    </div>
                    <CardDescription>
                        Customize how the Sovereign Brain behaves and what models are used.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between space-x-2 border-b pb-4">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="vision-mode" className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                <span>Vision Model (Llava)</span>
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Allow the AI to see and describe images. Uses a local Vision-Language Model.
                            </p>
                        </div>
                        <Switch
                            id="vision-mode"
                            checked={visionEnabled}
                            onCheckedChange={setVisionEnabled}
                        />
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Advanced Features</h4>
                        <div className="grid gap-4">
                            <div className="flex items-center justify-between border p-3 rounded-lg">
                                <div>
                                    <span className="text-sm font-medium">Extended Thinking (Chain of Thought)</span>
                                    <p className="text-xs text-muted-foreground mt-1">Available via agent routing in chat</p>
                                </div>
                                <Badge variant="outline">Active</Badge>
                            </div>
                            <div className="flex items-center justify-between border p-3 rounded-lg">
                                <div>
                                    <span className="text-sm font-medium">Knowledge Base Search</span>
                                    <p className="text-xs text-muted-foreground mt-1">Automatic RAG from Qdrant memory</p>
                                </div>
                                <Badge variant="outline">Active</Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save AI Preferences
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
