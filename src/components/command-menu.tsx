'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Command } from 'cmdk';
import { searchMemoryAction } from '@/app/actions';
import { useUser } from '@/firebase';
import { Database, Loader2 } from 'lucide-react';
import { SearchResult } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDistanceToNow } from 'date-fns';

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, startSearchTransition] = useTransition();
  const { user } = useUser();
  const debouncedQuery = useDebounce(query, 300);

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
      const searchResults = await searchMemoryAction(debouncedQuery, user.uid);
      setResults(searchResults);
    });
  }, [debouncedQuery, user]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setOpen(false); // Close the dialog on selection
  };

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Search Memory">
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="Search through your memory..."
      />
      <Command.List>
        {isSearching && <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>}
        
        {!isSearching && results.length === 0 && (
          <Command.Empty>No results found.</Command.Empty>
        )}

        {!isSearching && results.length > 0 && (
          <Command.Group heading="Relevant Memories">
            {results.map(item => (
              <Command.Item
                key={item.id}
                onSelect={() => copyToClipboard(item.text)}
                value={item.id}
              >
                <Database className="mr-2 h-4 w-4 shrink-0" />
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
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
