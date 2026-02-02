import { ArrowRight, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AgentCardProps {
    title: string;
    description: string;
    icon?: LucideIcon;
    buttonText: string;
    onClick?: () => void;
    className?: string;
}

export function AgentCard({
    title,
    description,
    icon: Icon,
    buttonText,
    onClick,
    className,
}: AgentCardProps) {
    return (
        <div
            className={cn(
                'group relative flex flex-col p-8 bg-background border border-border/5 transition-all duration-500 hover:border-primary/20',
                className
            )}
        >
            <div className="flex-1 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="h-10 w-10 border border-foreground/5 flex items-center justify-center bg-foreground/[0.02] group-hover:border-primary/20 transition-colors">
                        {Icon && <Icon className="h-5 w-5 text-foreground/40 group-hover:text-primary transition-colors stroke-[1]" />}
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-[15px] font-medium text-foreground/80 group-hover:text-foreground transition-colors">{title}</h3>
                    <p className="text-[11px] text-foreground/30 leading-relaxed font-light">
                        {description}
                    </p>
                </div>
            </div>

            <div className="mt-10 pt-6 border-t border-border/5">
                <Button
                    onClick={onClick}
                    className="w-full h-11 rounded-none bg-foreground/5 text-foreground/60 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all shadow-none flex items-center justify-center gap-3"
                >
                    {buttonText}
                    <ArrowRight className="h-3 w-3 stroke-[1.5]" />
                </Button>
            </div>
        </div>
    );
}
