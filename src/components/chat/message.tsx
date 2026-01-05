
'use client';

import { Message as MessageType } from '@/lib/types';
import { cn, formatTime } from '@/lib/utils';
import { AlertTriangle, Sun } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { ThinkingIndicator } from './thinking-indicator';


interface MessageProps {
  message: MessageType;
}

const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar');

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';

  const artifactRegex = /\[Artifact Created: (.*?)\]/g;
  
  const handleArtifactClick = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    console.log("Artifact clicked:", title);
  };

  const renderContent = (content: string) => {
    const parts = content.split(artifactRegex);
    return parts.map((part, index) => {
      if (index % 2 === 1) { // This is the captured group (the artifact title)
        return (
          <button 
            key={index}
            onClick={(e) => handleArtifactClick(part, e)}
            className="inline-block bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 rounded-md text-sm font-medium transition-colors"
          >
            [Artifact: {part}]
          </button>
        );
      }
      return <ReactMarkdown key={index} remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown>;
    });
  };

  if (message.role === 'system') {
    return (
      <div className="flex items-center gap-3 my-2 text-xs text-muted-foreground font-medium justify-center w-full">
        <AlertTriangle className="h-4 w-4 text-destructive" strokeWidth={1.5} />
        <span>{message.content}</span>
      </div>
    )
  }

  if (message.type === 'briefing') {
    return (
        <div className="w-full my-4 p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-950/50 dark:to-card border-l-4 border-indigo-500 dark:border-indigo-400 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <Sun className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                <h3 className="font-semibold text-base text-indigo-900 dark:text-indigo-200">Morning Briefing</h3>
                <span className="text-xs text-muted-foreground ml-auto">{timestamp}</span>
            </div>
             <article className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </article>
        </div>
    )
  }

  return (
    <div
      className={cn(
        'group flex items-start gap-2 sm:gap-4 w-full',
        isUser ? 'flex-row-reverse' : ''
      )}
    >
      <div
        className={cn(
          'rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col relative max-w-[85%] sm:max-w-[80%]',
          isUser
            ? 'bg-primary text-primary-foreground ml-auto'
            : 'bg-muted'
        )}
      >
        {isUser ? (
          <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        ) : message.status === 'processing' ? (
          <ThinkingIndicator logs={message.progress_log || []} />
        ) : (
          <div className="text-sm sm:text-[15px] leading-relaxed prose prose-sm dark:prose-invert max-w-none break-words">
            {renderContent(message.content)}
          </div>
        )}

        {message.imageUrl && (
          <div className="relative w-full max-w-sm mt-3 rounded-lg overflow-hidden">
            <Image src={message.imageUrl} alt="Uploaded content" width={400} height={300} className="object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}
