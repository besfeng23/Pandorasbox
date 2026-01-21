'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

// Custom cyberpunk theme based on vscDarkPlus
const cyberpunkTheme = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    background: 'rgba(2, 4, 10, 0.6)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(0, 229, 255, 0.15)',
    borderRadius: '0.5rem',
    padding: '1rem',
    margin: '0.75rem 0',
    boxShadow: '0 0 8px rgba(0, 229, 255, 0.1)',
  },
  'code[class*="language-"]': {
    ...vscDarkPlus['code[class*="language-"]'],
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.875rem',
    lineHeight: '1.6',
  },
};

export function CodeBlock({ code, language = 'text', className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Code copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to copy',
        description: 'Could not copy code to clipboard',
      });
    }
  };

  return (
    <div className={cn('relative group', className)}>
      <div className="relative rounded-lg overflow-hidden glass-panel border border-cyan-400/15">
        <div className="absolute top-2 right-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-8 sm:w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 text-white/60 hover:text-cyan-400 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent transition-colors touch-manipulation"
            onClick={handleCopy}
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <SyntaxHighlighter
          language={language}
          style={cyberpunkTheme}
          customStyle={{
            background: 'transparent',
            margin: 0,
            padding: '1rem',
            paddingTop: '2.5rem',
            fontSize: '0.875rem',
            lineHeight: '1.6',
          }}
          codeTagProps={{
            style: {
              fontFamily: '"JetBrains Mono", monospace',
            },
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

