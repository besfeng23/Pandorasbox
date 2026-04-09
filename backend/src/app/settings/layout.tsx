'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppLayout } from '@/components/dashboard/app-layout';
import { cn } from '@/lib/utils';
import { User, CreditCard } from 'lucide-react';
import { PageHeader, PageShell } from '@/components/ui/page-shell';

const navItems = [
  { name: 'Profile', href: '/settings/profile', icon: User },
  { name: 'Billing', href: '/settings/billing', icon: CreditCard },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AppLayout>
      <PageShell>
        <PageHeader title="Settings" description="Manage your account, billing preferences, and workspace profile." />
        <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-start">
          <aside>
            <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'inline-flex min-h-[40px] items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </PageShell>
    </AppLayout>
  );
}
