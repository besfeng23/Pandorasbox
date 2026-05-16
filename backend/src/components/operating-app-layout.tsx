'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useAuthActions } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  BadgeCheck,
  BarChart3,
  Book,
  BookOpen,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Database,
  FileCheck2,
  FolderArchive,
  Gavel,
  GitBranch,
  Home,
  Inbox,
  LockKeyhole,
  LogOut,
  Menu,
  Network,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  UserRoundCheck,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createThread } from '@/app/actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { CommandMenu } from '@/components/command-menu';
import { OperatingKeyboardShortcuts } from '@/components/operating-keyboard-shortcuts';

type NavItem = { label: string; href: string; icon: LucideIcon; badge?: string };
type NavSection = { title: string; items: NavItem[] };

const sections: NavSection[] = [
  { title: 'Command', items: [
    { label: 'Command Center', href: '/', icon: Home },
    { label: 'Today', href: '/operating/today', icon: CalendarClock },
    { label: 'AI Chief of Staff', href: '/operating/ai-chief-of-staff', icon: Bot },
  ]},
  { title: 'Capture', items: [
    { label: 'Raw Movement Inbox', href: '/operating/raw-movement-inbox', icon: Inbox, badge: 'N' },
    { label: 'Priority Lock', href: '/operating/priority-lock', icon: LockKeyhole },
    { label: 'Parked Projects', href: '/operating/parked-projects', icon: FolderArchive },
    { label: 'Authority Matrix', href: '/operating/authority-matrix', icon: UserRoundCheck },
    { label: 'Proof Vault', href: '/operating/proof-vault', icon: FileCheck2 },
    { label: 'Claims Vault', href: '/operating/claims-vault', icon: BadgeCheck },
  ]},
  { title: 'CRM', items: [
    { label: 'Contacts', href: '/operating/contacts', icon: Users },
    { label: 'Companies', href: '/operating/companies', icon: Building2 },
    { label: 'Pipeline', href: '/operating/pipeline', icon: BriefcaseBusiness, badge: 'D' },
    { label: 'Clients', href: '/operating/clients', icon: WalletCards },
    { label: 'Tasks', href: '/operating/tasks', icon: CheckCircle2, badge: 'T' },
  ]},
  { title: 'Execution', items: [
    { label: 'Deal Control Sheets', href: '/operating/deal-control-sheets', icon: ClipboardCheck, badge: 'C' },
    { label: 'Decision Gates', href: '/operating/decision-gates', icon: GitBranch, badge: 'G' },
    { label: 'Repair Queue', href: '/operating/repair-queue', icon: Gavel },
    { label: 'Weekly Scoreboard', href: '/operating/weekly-scoreboard', icon: BarChart3 },
  ]},
  { title: 'Intelligence', items: [
    { label: 'Life Import', href: '/operating/life-import', icon: Database },
    { label: 'Business Map', href: '/operating/business-map', icon: Network },
    { label: 'Pattern Analysis', href: '/operating/pattern-analysis', icon: Search },
    { label: 'Operating Rules', href: '/operating/operating-rules', icon: BookOpen },
  ]},
  { title: 'System', items: [
    { label: 'Memory Vault', href: '/memory', icon: BrainCircuit },
    { label: 'Artifacts', href: '/artifacts', icon: Book },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]},
];

function activePath(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

function NavSectionBlock({ section, pathname, navigate }: { section: NavSection; pathname: string; navigate: (href: string) => void }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="px-3 py-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <span>{section.title}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {section.items.map((item) => {
            const Icon = item.icon;
            const active = activePath(pathname, item.href);
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                className={cn(
                  'flex h-9 w-full items-center gap-2 rounded-xl px-2 text-left text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-950',
                  active && 'bg-slate-950 text-white hover:bg-slate-900 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className={cn('ml-auto rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', active ? 'border-white/30 text-white/80' : 'border-slate-200 text-slate-400')}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function OperatingAppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { logout } = useAuthActions();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = (href: string) => {
    router.push(href);
    setMobileOpen(false);
  };

  const handleCreateThread = async (agent: 'builder' | 'universe') => {
    if (!user) return;
    try {
      const result = await createThread(agent, user.uid);
      if (result?.id) {
        router.push(`/chat/${result.id}`);
        setMobileOpen(false);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not create thread', description: error.message || 'The AI thread failed to start.' });
    }
  };

  return (
    <div className="flex min-h-[100dvh] w-full overflow-hidden bg-slate-50 text-slate-950">
      <CommandMenu />
      <OperatingKeyboardShortcuts />
      <aside className={cn('fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm"><ShieldCheck className="h-5 w-5" /></span>
              <span>
                <span className="block text-sm font-semibold tracking-tight text-slate-950">Joven Command</span>
                <span className="block text-xs text-slate-500">Personal command center</span>
              </span>
            </button>
            <button type="button" onClick={() => setMobileOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Close menu">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3">
            {sections.map((section) => <NavSectionBlock key={section.title} section={section} pathname={pathname} navigate={navigate} />)}

            <div className="mx-5 my-4 h-px bg-slate-200" />

            <div className="px-5">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">AI Workbench</p>
              <div className="mt-3 grid gap-2">
                <Button variant="outline" onClick={() => handleCreateThread('builder')} className="h-10 justify-start rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Builder Chat
                </Button>
                <Button variant="outline" onClick={() => handleCreateThread('universe')} className="h-10 justify-start rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Universe Chat
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 p-3">
            <div className="flex items-center gap-3 rounded-2xl p-2">
              <Avatar className="h-8 w-8 rounded-xl">
                <AvatarImage src={user?.photoURL || ''} />
                <AvatarFallback className="rounded-xl bg-slate-100 text-slate-600"><User className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-slate-900">{user?.displayName || 'User'}</span>
                <span className="block truncate text-[11px] text-slate-500">Personal Vault</span>
              </span>
              <button type="button" onClick={logout} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950" aria-label="Log out">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && <button type="button" aria-label="Close menu overlay" className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100" aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-slate-900">Joven Command</span>
        </div>
        {children}
      </main>
    </div>
  );
}
