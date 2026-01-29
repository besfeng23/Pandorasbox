'use client';

import React, { useState } from 'react';
import {
    Shield,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Search,
    ExternalLink,
    Lock,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass';
import { Badge } from '@/components/ui/badge';

interface Source {
    title: string;
    url?: string;
    snippet: string;
    relevance: number;
    sourceType: 'file' | 'web' | 'memory';
}

interface AssistantEvidenceBlockProps {
    sources: Source[];
    status?: 'authenticated' | 'verifying' | 'found';
    className?: string;
}

export function AssistantEvidenceBlock({
    sources,
    status = 'found',
    className
}: AssistantEvidenceBlockProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!sources || sources.length === 0) return null;

    return (
        <div className={cn("my-4 animate-in-fade-slide", className)}>
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-white/5",
                    "bg-white/[0.02] hover:bg-white/[0.05] group"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Shield className={cn(
                            "h-5 w-5",
                            status === 'found' ? "text-primary" : "text-yellow-500 animate-pulse"
                        )} />
                        <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 group-hover:text-foreground transition-colors">
                            Sovereign Evidence Block
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[9px] py-0 h-4 bg-primary/5 border-primary/20 text-primary uppercase">
                                {sources.length} Sources Found
                            </Badge>
                            <span className="text-[10px] text-muted-foreground/40 font-mono">
                                Lat: 42ms
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5 mr-2">
                        {sources.slice(0, 3).map((_, i) => (
                            <div key={i} className="h-5 w-5 rounded-full border border-black/50 bg-white/10 flex items-center justify-center">
                                <BookOpen className="h-2.5 w-2.5 text-white/40" />
                            </div>
                        ))}
                        {sources.length > 3 && (
                            <div className="h-5 w-5 rounded-full border border-black/50 bg-white/5 flex items-center justify-center text-[8px] font-bold text-white/30">
                                +{sources.length - 3}
                            </div>
                        )}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
            </div>

            {isExpanded && (
                <div className="mt-2 space-y-2 pl-4 border-l border-white/5 animate-in-slide-down">
                    {sources.map((source, index) => (
                        <GlassCard key={index} className="p-3 border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {source.sourceType === 'file' ? <BookOpen className="h-3 w-3 text-blue-400" /> : <Search className="h-3 w-3 text-green-400" />}
                                    <span className="text-xs font-semibold truncate max-w-[200px]">{source.title}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono text-muted-foreground">{Math.round(source.relevance * 100)}% Match</span>
                                    {source.url && (
                                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3 italic">
                                "{source.snippet}"
                            </p>
                            <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <Lock className="h-2.5 w-2.5 text-muted-foreground/40" />
                                    <span className="text-[9px] uppercase tracking-tighter text-muted-foreground/30 font-bold">Encrypted Memory</span>
                                </div>
                                <Badge variant="outline" className="text-[9px] h-4 border-white/5 bg-white/5 text-muted-foreground/60">
                                    Chunk {index + 1}
                                </Badge>
                            </div>
                        </GlassCard>
                    ))}

                    <div className="flex items-center justify-center p-2 opacity-30 hover:opacity-100 transition-opacity">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                        <Zap className="h-3 w-3 mx-3 text-primary" />
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                    </div>
                </div>
            )}
        </div>
    );
}
