'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: KeyboardShortcut[] = [
  {
    keys: ['⌘', 'K'],
    description: 'Open command menu / Search memory',
    category: 'Navigation',
  },
  {
    keys: ['⌘', 'B'],
    description: 'Toggle sidebar',
    category: 'Navigation',
  },
  {
    keys: ['Enter'],
    description: 'Send message',
    category: 'Chat',
  },
  {
    keys: ['Shift', 'Enter'],
    description: 'New line in message',
    category: 'Chat',
  },
  {
    keys: ['Esc'],
    description: 'Close dialogs / Cancel',
    category: 'General',
  },
];

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
      {children}
    </kbd>
  );
}

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcuts({ open, onOpenChange }: KeyboardShortcutsProps) {
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel-strong border-glow-cyan max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-white/10 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl neon-text-cyan">
            <Keyboard className="h-5 w-5" strokeWidth={2} />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider">
                {category}
              </h3>
              <div className="space-y-2 pl-4">
                {items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="text-white/80 text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <Key>{key}</Key>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-white/40 mx-1">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-white/10 text-xs text-white/50">
          <p>
            <strong>Note:</strong> On Windows/Linux, use <Key>Ctrl</Key> instead of{' '}
            <Key>⌘</Key>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

