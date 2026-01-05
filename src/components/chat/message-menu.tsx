'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Copy, Check, RotateCcw, Share2, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MessageMenuProps {
  content: string;
  role: 'user' | 'assistant';
  onRegenerate?: () => void;
  className?: string;
}

export function MessageMenu({ content, role, onRegenerate, className }: MessageMenuProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Message copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to copy',
        description: 'Could not copy message to clipboard',
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Pandora Message',
          text: content,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copy to clipboard
      handleCopy();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 sm:h-7 sm:w-7 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 text-white/40 hover:text-white/80 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 touch-manipulation',
            className
          )}
          aria-label="Message options"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="glass-panel-strong border border-cyan-400/20 min-w-[160px]"
      >
        <DropdownMenuItem
          onClick={handleCopy}
          className="cursor-pointer text-white/90 hover:text-cyan-400 hover:bg-white/10 focus:text-cyan-400 focus:bg-white/10"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="check"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4 text-green-400" />
                <span>Copied</span>
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                <span>Copy</span>
              </motion.div>
            )}
          </AnimatePresence>
        </DropdownMenuItem>
        {role === 'assistant' && onRegenerate && (
          <DropdownMenuItem
            onClick={onRegenerate}
            className="cursor-pointer text-white/90 hover:text-purple-400 hover:bg-white/10 focus:text-purple-400 focus:bg-white/10"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            <span>Regenerate</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={handleShare}
          className="cursor-pointer text-white/90 hover:text-cyan-400 hover:bg-white/10 focus:text-cyan-400 focus:bg-white/10"
        >
          <Share2 className="h-4 w-4 mr-2" />
          <span>Share</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

