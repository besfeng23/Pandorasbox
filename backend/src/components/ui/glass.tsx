'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: 'default' | 'subtle' | 'strong' | 'frosted';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    border?: boolean;
    glow?: boolean;
}

const variantStyles = {
    default: 'bg-background/60 backdrop-blur-md',
    subtle: 'bg-background/40 backdrop-blur-sm',
    strong: 'bg-background/80 backdrop-blur-xl',
    frosted: 'bg-white/10 dark:bg-black/20 backdrop-blur-xl',
};

const paddingStyles = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
};

const roundedStyles = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
};

export function GlassPanel({
    children,
    className,
    variant = 'default',
    padding = 'md',
    rounded = 'lg',
    border = true,
    glow = false,
    ...props
}: GlassPanelProps) {
    return (
        <div
            className={cn(
                variantStyles[variant],
                paddingStyles[padding],
                roundedStyles[rounded],
                border && 'border border-white/10 dark:border-white/5',
                glow && 'shadow-lg shadow-primary/5',
                'transition-all duration-300',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: 'default' | 'subtle' | 'strong' | 'frosted';
    hover?: boolean;
    glow?: boolean;
}

export function GlassCard({
    children,
    className,
    variant = 'default',
    hover = true,
    glow = false,
    ...props
}: GlassCardProps) {
    return (
        <div
            className={cn(
                variantStyles[variant],
                'rounded-xl border border-white/10 dark:border-white/5 p-4',
                hover && 'hover:bg-background/70 hover:border-white/20 hover:translate-y-[-2px]',
                glow && 'shadow-lg shadow-primary/10',
                'transition-all duration-300 ease-out',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'default' | 'primary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
}

const buttonVariants = {
    default: 'bg-white/10 hover:bg-white/20 text-foreground',
    primary: 'bg-primary/20 hover:bg-primary/30 text-primary',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-500',
};

const buttonSizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
};

export function GlassButton({
    children,
    className,
    variant = 'default',
    size = 'md',
    ...props
}: GlassButtonProps) {
    return (
        <button
            className={cn(
                'backdrop-blur-md rounded-lg border border-white/10',
                'transition-all duration-200 ease-out',
                'active:scale-[0.98]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                buttonVariants[variant],
                buttonSizes[size],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}

export function GlassInput({
    className,
    error = false,
    ...props
}: GlassInputProps) {
    return (
        <input
            className={cn(
                'w-full px-4 py-2.5 rounded-lg',
                'bg-white/5 backdrop-blur-md',
                'border border-white/10',
                'text-foreground placeholder:text-muted-foreground/50',
                'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50',
                'transition-all duration-200',
                error && 'border-red-500/50 focus:ring-red-500/30',
                className
            )}
            {...props}
        />
    );
}

interface GlassBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const badgeVariants = {
    default: 'bg-white/10 text-foreground',
    success: 'bg-green-500/20 text-green-500',
    warning: 'bg-amber-500/20 text-amber-500',
    danger: 'bg-red-500/20 text-red-500',
    info: 'bg-blue-500/20 text-blue-500',
};

export function GlassBadge({
    children,
    className,
    variant = 'default',
    ...props
}: GlassBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                'backdrop-blur-sm border border-white/10',
                badgeVariants[variant],
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
}
