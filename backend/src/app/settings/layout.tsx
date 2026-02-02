'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppLayout } from '@/components/dashboard/app-layout';
import { cn } from '@/lib/utils';
import { User, Lock, Bell, BrainCircuit, Book, Plug } from 'lucide-react';
const navItems = [
    { name: 'Profile', href: '/settings/profile', icon: User, category: 'Account' },
    { name: 'AI Intelligence', href: '/settings/ai', icon: BrainCircuit, category: 'Account' },
    { name: 'Billing', href: '/settings/billing', icon: Bell, category: 'Account' },
    { name: 'Knowledge', href: '/knowledge', icon: Book, category: 'Data' },
    { name: 'Connectors', href: '/connectors', icon: Plug, category: 'Data' },
    { name: 'Security', href: '/settings/security', icon: Lock, category: 'System' },
];

const categories = ['Account', 'Data', 'System'];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    return (
        <AppLayout>
            <div className="flex-1 max-w-6xl mx-auto w-full py-12 md:py-20 px-8">
                <header className="mb-20">
                    <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/40 mb-4 block underline decoration-primary/30 underline-offset-8">Configuration</span>
                    <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground/90">System Substrate</h1>
                </header>

                <div className="flex flex-col lg:flex-row gap-20">
                    <aside className="lg:w-1/5 shrink-0">
                        <nav className="flex flex-col gap-12">
                            {categories.map(category => (
                                <div key={category} className="space-y-6">
                                    <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.3em]">
                                        {category}
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {navItems.filter(item => item.category === category).map((item) => (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                className={cn(
                                                    'group flex items-center gap-3 text-[13px] font-medium transition-colors py-1',
                                                    pathname === item.href
                                                        ? 'text-primary'
                                                        : 'text-foreground/40 hover:text-foreground/70'
                                                )}
                                            >
                                                <item.icon className={cn("h-4 w-4 stroke-[1] transition-transform group-hover:scale-110", pathname === item.href ? "text-primary" : "text-foreground/20")} />
                                                {item.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </aside>
                    <main className="flex-1 max-w-2xl">{children}</main>
                </div>
            </div>
        </AppLayout>
    );
}
