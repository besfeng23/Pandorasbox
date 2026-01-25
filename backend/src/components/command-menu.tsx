'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Command } from 'cmdk';
import { searchMemoryAction } from '@/app/actions';
import { useUser } from '@/firebase';
import { Database, Loader2, Home, Settings, GitGraph, Building2, Library, Boxes, Sparkles } from 'lucide-react';
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
    { id: 'workspaces', label: 'Workspaces', icon: Building2, path: '/workspaces' },
    { id: 'knowledge', label: 'Knowledge', icon: Library, path: '/knowledge' },
    { id: 'memories', label: 'Memories', icon: Database, path: '/memories' },
    { id: 'artifacts', label: 'Artifacts', icon: Boxes, path: '/artifacts' },
    { id: 'graph', label: 'Graph', icon: GitGraph, path: '/graph' },
    { id: 'studio', label: 'Firebase Studio', icon: Database, path: '/studio' },
    { id: 'generate', label: 'Generate UI', icon: Sparkles, path: '/studio/generate' },
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
      className="glass-panel-strong border border-primary/30"
    >
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="Search memories, navigate, or type a command..."
        className="glass-panel border border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
      />
      <Command.List>
        {isSearching && query && <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}
        
        {!query && (
          <Command.Group heading="Navigation">
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
                >
                  <Icon className="mr-2 h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Command.Item>
              );
            })}
          </Command.Group>
        )}

        {query && filteredNavItems.length > 0 && (
          <Command.Group heading="Navigation">
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
                >
                  <Icon className="mr-2 h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Command.Item>
              );
            })}
          </Command.Group>
        )}

        {query && user && (
          <Command.Group heading="Memories">
            {isSearching ? (
              <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : results.length === 0 ? (
              <Command.Empty>No memories found.</Command.Empty>
            ) : (
              results.map(item => (
                <Command.Item
                  key={item.id}
                  onSelect={() => copyToClipboard(item.text)}
                  value={item.id}
                >
                  <Database className="mr-2 h-4 w-4 shrink-0 text-primary" />
                  <div className="flex-1 truncate">
                    <span>{item.text}</span>
                    {item.timestamp && (
                       <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                       </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                      {item.score.toFixed(2)}
                  </span>
                </Command.Item>
              ))
            )}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
