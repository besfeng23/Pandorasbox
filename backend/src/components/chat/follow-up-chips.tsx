'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowUpChipsProps {
    suggestions: string[];
    onSelect: (suggestion: string) => void;
    className?: string;
    isLoading?: boolean;
}

export function FollowUpChips({
    suggestions,
    onSelect,
    className,
    isLoading = false
}: FollowUpChipsProps) {
    if (suggestions.length === 0 || isLoading) return null;

    return (
        <div className={cn("flex flex-wrap gap-2 py-2", className)}>
            {suggestions.map((suggestion, index) => (
                <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-3 text-[11px] font-medium uppercase tracking-wider rounded-md border border-border/50 hover:border-border hover:bg-muted/50 transition-colors text-foreground/60"
                    onClick={() => onSelect(suggestion)}
                >
                    {suggestion}
                </Button>
            ))}
        </div>
    );
}

// Utility function to generate follow-up suggestions based on context
export function generateFollowUpSuggestions(lastMessage: string, agentType: 'builder' | 'universe'): string[] {
    const builderSuggestions = [
        "Can you add error handling?",
        "Make it more efficient",
        "Add TypeScript types",
        "Write tests for this",
        "Explain this code",
    ];

    const universeSuggestions = [
        "Tell me more",
        "What are the implications?",
        "Any related concepts?",
        "Can you give an example?",
        "How does this connect to...",
    ];

    // Simple heuristic - in practice, could use LLM to generate context-aware suggestions
    const baseSuggestions = agentType === 'builder' ? builderSuggestions : universeSuggestions;

    // Shuffle and pick 3
    return baseSuggestions
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
}
