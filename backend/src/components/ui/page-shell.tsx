import { cn } from '@/lib/utils';

export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-content-dense px-4 py-6 md:px-6 md:py-8', className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 border-b border-border/70 pb-5 md:mb-8 md:flex-row md:items-end md:justify-between', className)}>
      <div className="space-y-2">
        <h1 className="text-title-1 text-foreground">{title}</h1>
        {description ? <p className="max-w-3xl text-subhead text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
