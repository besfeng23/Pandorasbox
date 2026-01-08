
'use client';

import { Message as MessageType } from '@/lib/types';
import { cn, formatTime, formatMessageTime, formatFullDateTime, toDate } from '@/lib/utils';
import { useState } from 'react';
import { AlertTriangle, Sun, CheckCircle2, Clock, XCircle, User, BrainCircuit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { ThinkingIndicator } from './thinking-indicator';
import { useArtifactStore } from '@/store/artifacts';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { FileText } from 'lucide-react';
import { CodeBlock } from './code-block';
import { MessageMenu } from './message-menu';
import type { Components } from 'react-markdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Copy, Check } from 'lucide-react';

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const timestamp = formatMessageTime(message.createdAt);
  const fullTimestamp = formatFullDateTime(message.createdAt);
  const setActiveArtifactId = useArtifactStore(state => state.setActiveArtifactId);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [copied, setCopied] = useState(false);

  // Determine status indicator for user messages
  const getStatusIcon = () => {
    if (!isUser) return null;
    if (message.status === 'error') {
      return <XCircle className="h-3 w-3 text-red-400" />;
    }
    if (message.status === 'processing') {
      return <Clock className="h-3 w-3 text-cyan-400/70 animate-pulse" />;
    }
    return <CheckCircle2 className="h-3 w-3 text-cyan-400/70" />;
  };

  const ARTIFACT_REGEX = /\[Artifact Created: (.*?)\]/g;
  
  const handleArtifactClick = async (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!user?.uid) {
      toast({ variant: "destructive", title: "Error", description: "User not authenticated." });
      return;
    }

    try {
      const q = query(collection(firestore, 'artifacts'), where('userId', '==', user.uid), where('title', '==', title));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const artifactDoc = querySnapshot.docs[0];
        setActiveArtifactId(artifactDoc.id);
      } else {
        toast({ variant: "destructive", title: "Error", description: `Artifact "${title}" not found.` });
      }
    } catch (error) {
      console.error("Error fetching artifact by title:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to retrieve artifact." });
    }
  };

  const markdownComponents: Components = {
    code({ node, className, children, ...props }: any) {
      const inline = !className || !className.includes('language-');
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      
      if (!inline && match) {
        return (
          <CodeBlock
            code={codeString}
            language={match[1]}
            className="my-4"
          />
        );
      }
      
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-white/10 border border-cyan-400/20 text-cyan-300 text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    },
    a({ node, href, children, ...props }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
          {...props}
        >
          {children}
        </a>
      );
    },
    ul({ node, children, ...props }) {
      return (
        <ul className="list-disc list-inside space-y-1 my-2 ml-4" {...props}>
          {children}
        </ul>
      );
    },
    ol({ node, children, ...props }) {
      return (
        <ol className="list-decimal list-inside space-y-1 my-2 ml-4" {...props}>
          {children}
        </ol>
      );
    },
    li({ node, children, ...props }) {
      return (
        <li className="pl-2" {...props}>
          {children}
        </li>
      );
    },
    table({ node, children, ...props }) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border-collapse glass-panel rounded-lg border border-cyan-400/15" {...props}>
            {children}
          </table>
        </div>
      );
    },
    thead({ node, children, ...props }) {
      return (
        <thead className="bg-white/5" {...props}>
          {children}
        </thead>
      );
    },
    th({ node, children, ...props }) {
      return (
        <th className="px-4 py-2 text-left border-b border-cyan-400/20 text-cyan-400 font-semibold" {...props}>
          {children}
        </th>
      );
    },
    td({ node, children, ...props }) {
      return (
        <td className="px-4 py-2 border-b border-cyan-400/10" {...props}>
          {children}
        </td>
      );
    },
    p({ node, children, ...props }) {
      return (
        <p className="my-2 leading-loose" {...props}>
          {children}
        </p>
      );
    },
    h1({ node, children, ...props }) {
      return (
        <h1 className="text-2xl font-bold my-4 neon-text-cyan" {...props}>
          {children}
        </h1>
      );
    },
    h2({ node, children, ...props }) {
      return (
        <h2 className="text-xl font-bold my-3 neon-text-cyan" {...props}>
          {children}
        </h2>
      );
    },
    h3({ node, children, ...props }) {
      return (
        <h3 className="text-lg font-semibold my-2 text-cyan-400" {...props}>
          {children}
        </h3>
      );
    },
    blockquote({ node, children, ...props }) {
      return (
        <blockquote className="border-l-4 border-cyan-400/30 pl-4 my-3 italic text-white/70" {...props}>
          {children}
        </blockquote>
      );
    },
  };

  const renderContent = (content: string) => {
    const parts = content.split(ARTIFACT_REGEX);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        const artifactTitle = part;
        return (
          <Button
            key={index}
            variant="secondary"
            size="sm"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800"
            onClick={(e) => handleArtifactClick(artifactTitle, e)}
          >
            <FileText className="h-3 w-3" />
            {artifactTitle}
          </Button>
        );
      }
      return (
        <ReactMarkdown
          key={index}
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
          className="prose prose-sm prose-zinc dark:prose-invert max-w-none"
        >
          {part}
        </ReactMarkdown>
      );
    });
  };

  if (message.role === 'system') {
    return (
      <div className="flex items-center gap-3 my-2 text-xs text-red-400 font-medium justify-center w-full">
        <AlertTriangle className="h-4 w-4 text-red-400" strokeWidth={1.5} />
        <span>{message.content}</span>
      </div>
    )
  }

  if (message.type === 'briefing') {
    return (
        <div className="w-full my-4 p-4 rounded-lg glass-panel border border-cyan-400/20">
            <div className="flex items-center gap-2 mb-3">
                <Sun className="h-5 w-5 text-cyan-400" />
                <h3 className="font-semibold text-base neon-text-cyan">Morning Briefing</h3>
                <span className="text-xs text-white/40 ml-auto">{timestamp}</span>
            </div>
             <article className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{message.content}</ReactMarkdown>
            </article>
        </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex items-start gap-3 w-full">
        {/* Avatar/Icon */}
        {!isUser && (
          <div className="flex-shrink-0 mt-1">
            <div className="h-8 w-8 rounded-full glass-panel border border-purple-400/30 flex items-center justify-center shadow-neon-purple-sm">
              <BrainCircuit className="h-4 w-4 text-purple-400" strokeWidth={1.5} />
            </div>
          </div>
        )}
        
        <div
          className={cn(
            'group rounded-2xl px-4 py-3 sm:px-5 sm:py-4 flex flex-col relative transition-all duration-200',
            'max-w-[85%] sm:max-w-[75%]',
            'hover:scale-[1.01] hover:shadow-lg active:scale-[0.99]',
            isUser
              ? 'bg-gradient-to-br from-cyan-400/80 to-cyan-500/70 text-white border border-cyan-300/25 shadow-neon-cyan-sm hover:border-cyan-300/35'
              : 'glass-panel border border-purple-400/20 text-white/90 shadow-lg hover:border-purple-400/30'
          )}
        >
          
          {/* Quick copy button - visible on hover */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-7 w-7 text-white/40 hover:text-white/80 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                    copied && 'opacity-100 text-green-400'
                  )}
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await navigator.clipboard.writeText(message.content);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch (error) {
                      toast({
                        variant: 'destructive',
                        title: 'Failed to copy',
                        description: 'Could not copy message to clipboard',
                      });
                    }
                  }}
                  aria-label="Copy message"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="glass-panel-strong border border-cyan-400/30 text-white">
                <p>{copied ? 'Copied!' : 'Copy'}</p>
              </TooltipContent>
            </Tooltip>
            <MessageMenu
              content={message.content}
              role={message.role}
              onRegenerate={message.role === 'assistant' ? undefined : undefined}
            />
          </div>
          {isUser ? (
            <p className="message-text whitespace-pre-wrap break-words">
              {message.content}
            </p>
        ) : message.status === 'processing' ? (
          <ThinkingIndicator logs={message.progress_log || []} createdAt={message.createdAt} />
        ) : (
            <div className="message-text prose prose-sm dark:prose-invert max-w-none break-words">
              {renderContent(message.content)}
            </div>
          )}

          {message.imageUrl && (
            <div className="relative w-full max-w-sm mt-3 rounded-lg overflow-hidden">
              <Image src={message.imageUrl} alt="Uploaded content" width={400} height={300} className="object-cover" />
            </div>
          )}

          {/* Timestamp and status indicator */}
          <div className={cn(
            "flex items-center gap-1.5 mt-2 text-xs",
            isUser ? "justify-end text-white/70" : "justify-start text-white/50"
          )}>
            {isUser && getStatusIcon()}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">{timestamp}</span>
              </TooltipTrigger>
              <TooltipContent className="glass-panel-strong border border-cyan-400/30 text-white">
                <p>{fullTimestamp}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* Avatar/Icon for user messages (after) */}
        {isUser && (
          <div className="flex-shrink-0 mt-1">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400/80 to-cyan-500/70 border border-cyan-300/30 flex items-center justify-center shadow-neon-cyan-sm">
              <User className="h-4 w-4 text-white" strokeWidth={1.5} />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
