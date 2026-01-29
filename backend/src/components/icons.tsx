import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface PandoraBoxIconProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
}

export function PandoraBoxIcon({ className, width, height, style, ...props }: PandoraBoxIconProps) {
  return (
    <div
      className={cn("relative flex items-center justify-center overflow-hidden", className)}
      style={{ width, height, ...style }}
      {...props}
    >
      <img
        src="/logo.png"
        alt="Pandora's Box Logo"
        className="w-full h-full object-contain brightness-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
      />
    </div>
  );
}
