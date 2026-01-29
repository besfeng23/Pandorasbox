'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, BrainCircuit, Library, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomTabBar() {
    const pathname = usePathname();

    const tabs = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Chat', href: '/chat', icon: MessageSquare, activeMatch: (path: string) => path.startsWith('/chat') },
        { name: 'Memory', href: '/memory', icon: BrainCircuit, activeMatch: (path: string) => path.startsWith('/memory') },
        { name: 'Library', href: '/knowledge', icon: Library, activeMatch: (path: string) => path.startsWith('/knowledge') || path.startsWith('/artifacts') },
        { name: 'Profile', href: '/settings', icon: User, activeMatch: (path: string) => path.startsWith('/settings') },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-16 px-2">
                {tabs.map((tab) => {
                    const isActive = tab.activeMatch ? tab.activeMatch(pathname) : pathname === tab.href;
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-90",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("h-6 w-6", isActive && "fill-current/10")} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">{tab.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
