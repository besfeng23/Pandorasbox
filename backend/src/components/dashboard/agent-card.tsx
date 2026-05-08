'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  title: string;
  kicker?: string;
  description: string;
  actionLabel: string;
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
}

export function AgentCard({
  title,
  kicker,
  description,
  actionLabel,
  icon: Icon,
  onClick,
  className,
}: AgentCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex h-full flex-col rounded-xl border border-border/80 bg-card/70 p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          {kicker && <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-primary/80">{kicker}</p>}
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>

      <span className="mt-5 inline-flex h-10 w-full items-center justify-between rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors group-hover:bg-primary/90">
        {actionLabel}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
