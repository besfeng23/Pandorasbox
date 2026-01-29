'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
    title: string;
    rightAction?: React.ReactNode;
    className?: string;
}

export function MobileHeader({ title, rightAction, className }: MobileHeaderProps) {
    return (
        <header className={cn(
            "md:hidden sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-white/5 pt-[env(safe-area-inset-top)]",
            className
        )}>
            <div className="flex items-center justify-between h-14 px-4">
                <h1 className="text-[17px] font-semibold tracking-tight text-foreground/90 mx-auto absolute left-0 right-0 text-center pointer-events-none">
                    {title}
                </h1>

                {/* Spacer for centered title */}
                <div className="w-8" />

                {rightAction && (
                    <div className="relative z-10">
                        {rightAction}
                    </div>
                )}
            </div>
        </header>
    );
}
