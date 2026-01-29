import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function PandoraBoxIcon({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", className)} {...props}>
      <img
        src="/logo.png"
        alt="Pandora's Box Logo"
        className="w-full h-full object-contain brightness-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
      />
    </div>
  );
}
