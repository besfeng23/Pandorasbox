import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface StateBlockProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: React.ReactNode;
  className?: string;
}

export function StateBlock({ icon, title, description, action, children, className }: StateBlockProps) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/50 px-6 py-10 text-center',
        className
      )}
    >
      {icon ? <div className="mb-3 text-muted-foreground">{icon}</div> : null}
      <h3 className="text-headline text-foreground">{title}</h3>
      {description ? <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p> : null}
      {action ? (
        <Button className="mt-5" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
      {children}
    </div>
  );
}
