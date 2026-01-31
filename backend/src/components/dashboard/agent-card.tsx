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
                'group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 p-6 transition-all hover:-translate-y-1 hover:border-white/10 hover:shadow-2xl hover:shadow-black/50',
                className
            )}
        >
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                <div>
                    <h3 className="text-xl font-semibold text-white">{title}</h3>
                    <p className="mt-2 text-sm text-zinc-400 leading-relaxed max-w-[280px]">
                        {description}
                    </p>
                </div>

                <Button
                    onClick={onClick}
                    className="w-full bg-[#007AFF] hover:bg-[#0069d9] text-white font-medium rounded-xl h-12 shadow-lg shadow-blue-500/20 transition-all group-hover:shadow-blue-500/30 flex items-center justify-center gap-2"
                >
                    {Icon && <Icon className="h-5 w-5" />}
                    {buttonText}
                </Button>
            </div>

            {/* Subtle Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
    );
}
