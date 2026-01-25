
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppLayout } from '@/components/dashboard/app-layout';
import { cn } from '@/lib/utils';
import { User, Lock, Bell, CreditCard } from 'lucide-react';

const navItems = [
  { name: 'Profile', href: '/settings/profile', icon: User },
  { name: 'Billing', href: '/settings/billing', icon: CreditCard },
  // { name: 'Security', href: '/settings/security', icon: Lock },
  // { name: 'Notifications', href: '/settings/notifications', icon: Bell },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    return (
        <AppLayout>
            <div className="flex-1 space-y-8 p-4 md:p-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <h1 className="font-headline text-3xl font-bold tracking-tight">Settings</h1>
                        <p className="text-muted-foreground">
                            Manage your account settings and preferences.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                    <aside className="lg:w-1/5">
                        <nav className="flex space-x-2 overflow-x-auto pb-2 lg:flex-col lg:space-x-0 lg:space-y-1 lg:overflow-x-visible lg:pb-0">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        'inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                                        pathname === item.href ? 'bg-accent' : 'transparent'
                                    )}
                                >
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                    </aside>
                    <div className="flex-1 lg:max-w-4xl">{children}</div>
                </div>
            </div>
        </AppLayout>
    );
}
