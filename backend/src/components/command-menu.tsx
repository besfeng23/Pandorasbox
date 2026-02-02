'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Command } from 'cmdk';
import { searchMemoryAction } from '@/app/actions';
import { useUser } from '@/firebase';
import { Database, Loader2, Home, Settings, Bot, Activity, Boxes } from 'lucide-react';
import { SearchResult } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, startSearchTransition] = useTransition();
  const { user } = useUser();
  const router = useRouter();
  const debouncedQuery = useDebounce(query, 300);

  const navigationItems = [
    { id: 'home', label: 'Chat', icon: Home, path: '/' },
    { id: 'memories', label: 'Memory Vault', icon: Database, path: '/memory' },
    { id: 'connectors', label: 'Data Connectors', icon: Boxes, path: '/connectors' },
    { id: 'agents', label: 'Agents', icon: Bot, path: '/agents' },
    { id: 'health', label: 'System Health', icon: Activity, path: '/health' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  // Toggle the menu with Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(open => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (!debouncedQuery || !user) {
      setResults([]);
      return;
    }

    startSearchTransition(async () => {
      if (user) {
        // userId should be the uid, not the token. And we need to pass agentId.
        const searchResults = await searchMemoryAction(debouncedQuery, user.uid, 'universe');
        setResults(searchResults);
      }
    });
  }, [debouncedQuery, user]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setOpen(false); // Close the dialog on selection
  };

  const filteredNavItems = navigationItems.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.path.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Menu"
      className="bg-background border border-border/10 shadow-none rounded-none overflow-hidden max-w-2xl w-full"
    >
      <div className="border-b border-border/10 p-4">
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search substrate or run command..."
          className="w-full bg-transparent border-none focus:ring-0 text-sm placeholder:text-foreground/10 tracking-[0.1em]"
        />
      </div>
      <Command.List className="max-h-[60vh] overflow-y-auto p-1 no-scrollbar">
        {isSearching && query && <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-4 w-4 text-foreground/20 stroke-[1]" /></div>}

        {!query && (
          <Command.Group heading={<span className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40">Navigation</span>}>
            {navigationItems.map(item => {
              const Icon = item.icon;
              return (
                <Command.Item
                  key={item.id}
                  onSelect={() => {
                    router.push(item.path);
                    setOpen(false);
                  }}
                  value={item.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-none cursor-pointer hover:bg-foreground/[0.03] aria-selected:bg-foreground/[0.05] transition-colors"
                >
                  <Icon className="h-4 w-4 text-foreground/20 stroke-[1]" />
                  <span className="text-sm text-foreground/80">{item.label}</span>
                </Command.Item>
              );
            })}
          </Command.Group>
        )}

        {query && filteredNavItems.length > 0 && (
          <Command.Group heading={<span className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40">Navigation</span>}>
            {filteredNavItems.map(item => {
              const Icon = item.icon;
              return (
                <Command.Item
                  key={item.id}
                  onSelect={() => {
                    router.push(item.path);
                    setOpen(false);
                  }}
                  value={item.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-none cursor-pointer hover:bg-foreground/[0.03] aria-selected:bg-foreground/[0.05] transition-colors"
                >
                  <Icon className="h-4 w-4 text-foreground/20 stroke-[1]" />
                  <span className="text-sm text-foreground/80">{item.label}</span>
                </Command.Item>
              );
            })}
          </Command.Group>
        )}

        {query && user && (
          <Command.Group heading={<span className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/10">Memories</span>}>
            {isSearching ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-4 w-4 text-foreground/10 stroke-[1]" /></div>
            ) : results.length === 0 ? (
              <Command.Empty className="p-8 text-center text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/10 italic">No recollections found.</Command.Empty>
            ) : (
              results.map(item => (
                <Command.Item
                  key={item.id}
                  onSelect={() => copyToClipboard(item.text)}
                  value={item.id}
                  className="flex items-start gap-3 px-4 py-4 rounded-none cursor-pointer hover:bg-foreground/[0.03] aria-selected:bg-foreground/[0.05] transition-colors border-b border-border/5 last:border-none"
                >
                  <Database className="mt-0.5 h-4 w-4 text-foreground/10 shrink-0 stroke-[1]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">{item.text}</p>
                    {item.timestamp && (
                      <p className="text-[10px] text-muted-foreground/10 mt-1.5 uppercase tracking-[0.4em] font-bold">
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-foreground/10 ml-2">
                    {item.score.toFixed(2)}
                  </span>
                </Command.Item>
              ))
            )}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog >
  );
}
