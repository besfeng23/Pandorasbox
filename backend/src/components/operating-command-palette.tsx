'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FolderArchive,
  GitBranch,
  Home,
  Inbox,
  LockKeyhole,
  Search,
  UserRoundCheck,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Item = {
  label: string;
  path: string;
  icon: LucideIcon;
  shortcut?: string;
};

const items: Item[] = [
  { label: 'Command Center', path: '/', icon: Home },
  { label: 'Today', path: '/operating/today', icon: CalendarClock },
  { label: 'Raw Movement Inbox', path: '/operating/raw-movement-inbox', icon: Inbox, shortcut: 'N' },
  { label: 'Priority Lock', path: '/operating/priority-lock', icon: LockKeyhole },
  { label: 'Parked Projects', path: '/operating/parked-projects', icon: FolderArchive },
  { label: 'Authority Matrix', path: '/operating/authority-matrix', icon: UserRoundCheck },
  { label: 'Proof Vault', path: '/operating/proof-vault', icon: FileCheck2 },
  { label: 'Claims Vault', path: '/operating/claims-vault', icon: BadgeCheck },
  { label: 'Pipeline', path: '/operating/pipeline', icon: BriefcaseBusiness, shortcut: 'D' },
  { label: 'Tasks', path: '/operating/tasks', icon: CheckCircle2, shortcut: 'T' },
  { label: 'Deal Control Sheets', path: '/operating/deal-control-sheets', icon: ClipboardCheck, shortcut: 'C' },
  { label: 'Decision Gates', path: '/operating/decision-gates', icon: GitBranch, shortcut: 'G' },
];

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

export function OperatingCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      const matched = items.find((item) => item.shortcut?.toLowerCase() === key);
      if (!matched) return;
      event.preventDefault();
      router.push(matched.path);
      setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, router]);

  const filtered = items.filter((item) => {
    const search = query.toLowerCase();
    return item.label.toLowerCase().includes(search) || item.path.toLowerCase().includes(search);
  });

  const navigate = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/30 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="mx-auto mt-16 w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/20" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-200 px-4">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search modules or actions..."
            className="h-14 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close command palette">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-2">
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-950')}
              >
                <Icon className="h-4 w-4 text-slate-500" />
                <span className="flex-1">{item.label}</span>
                {item.shortcut && <span className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">{item.shortcut}</span>}
              </button>
            );
          })}
          {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-500">No matching module.</p>}
        </div>
      </div>
    </div>
  );
}
