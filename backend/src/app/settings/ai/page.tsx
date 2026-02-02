
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
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <section className="space-y-8">
                <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60 mb-2 block">Cognitive Configuration</span>
                    <h2 className="text-xl font-light tracking-tight text-foreground/90">Sovereign Brain</h2>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between py-6 border-b border-border/5">
                        <div className="space-y-1">
                            <Label htmlFor="vision-mode" className="text-[13px] font-medium text-foreground/80 flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5 stroke-[1]" />
                                Vision Model (Llava)
                            </Label>
                            <p className="text-[11px] text-foreground/30 max-w-sm">
                                Enable visual perception for local VLM agents.
                            </p>
                        </div>
                        <Switch
                            id="vision-mode"
                            checked={visionEnabled}
                            onCheckedChange={setVisionEnabled}
                            className="scale-90"
                        />
                    </div>

                    <div className="space-y-4 pt-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/20">Operational Modules</p>
                        <div className="grid gap-2">
                            {[
                                { name: 'Extended Thinking', desc: 'Chain-of-Thought reasoning logs', status: 'Active' },
                                { name: 'Knowledge Synthesis', desc: 'Automatic RAG vector retrieval', status: 'Active' }
                            ].map((mod, i) => (
                                <div key={i} className="flex items-center justify-between text-[12px] py-1">
                                    <span className="text-foreground/60">{mod.name}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-foreground/20 italic font-mono text-[10px]">{mod.desc}</span>
                                        <span className="h-1 w-1 rounded-full bg-primary/40"></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-8">
                    <Button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="h-10 px-8 text-[11px] font-bold uppercase tracking-widest rounded-none bg-primary hover:bg-primary/90 text-white transition-all"
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-3 w-3 animate-spin stroke-[1]" /> : 'Initialize Changes'}
                    </Button>
                </div>
            </section>
        </div>
    );
}
