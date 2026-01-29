'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Home,
    MessageSquare,
    Brain,
    Settings,
    Code,
    Bell
} from 'lucide-react';

interface NavItem {
    href: string;
    icon: React.ReactNode;
    label: string;
}

const navItems: NavItem[] = [
    { href: '/', icon: <Home className="h-5 w-5" />, label: 'Home' },
    { href: '/chat', icon: <MessageSquare className="h-5 w-5" />, label: 'Chat' },
    { href: '/memory', icon: <Brain className="h-5 w-5" />, label: 'Memory' },
    { href: '/artifacts', icon: <Code className="h-5 w-5" />, label: 'Artifacts' },
    { href: '/settings', icon: <Settings className="h-5 w-5" />, label: 'Settings' },
];

export function MobileNavigation() {
    const pathname = usePathname();

    // Don't show on auth pages
    if (pathname === '/login' || pathname === '/signup') {
        return null;
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            {/* Gradient blur background */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent" />

            {/* Glass effect container */}
            <div className="relative bg-background/80 backdrop-blur-xl border-t border-white/10">
                <div className="flex items-center justify-around px-2 py-2 safe-area-pb">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/' && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-xl transition-all duration-200",
                                    isActive
                                        ? "text-primary bg-primary/10"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                <span className={cn(
                                    "transition-transform duration-200",
                                    isActive && "scale-110"
                                )}>
                                    {item.icon}
                                </span>
                                <span className={cn(
                                    "text-[10px] font-medium uppercase tracking-wider",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {item.label}
                                </span>
                                {/* Active indicator dot */}
                                {isActive && (
                                    <span className="absolute -top-0.5 w-1 h-1 rounded-full bg-primary animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}

// Add safe area padding for iOS devices
const styles = `
  .safe-area-pb {
    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}
