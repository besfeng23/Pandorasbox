
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message as MessageType } from '@/lib/types';
import { cn, formatTime } from '@/lib/utils';
import { BrainCircuit, User, AlertTriangle, Mic, Sun, Trash2 } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { useArtifactStore } from '@/store/artifacts';
import { ThinkingIndicator } from './thinking-indicator';
import { Button } from '../ui/button';
import { useFirestore } from '@/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteMemory } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';


interface MessageProps {
  message: MessageType;
}

const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar');

export function Message({ message }: MessageProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const isUser = message.role === 'user';
  const timestamp = formatTime(message.createdAt);
  const setActiveArtifactId = useArtifactStore(state => state.setActiveArtifactId);

  const artifactRegex = /\[Artifact Created: (.*?)\]/g;
  
  const handleArtifactClick = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    // This is a simplified approach. A real implementation would need to
    // look up the artifact ID based on the title from a list of artifacts.
    // For now, we'll assume the title can be used to find the artifact,
    // though this is not robust. A better way would be to embed the ID in the message.
    console.log("Artifact clicked:", title);
    // Since we don't have the ID, we can't set it yet.
    // We will need to enhance this later.
    // setActiveArtifactId(artifactId);
  };

  const handleDelete = async () => {
    if (!user || !message.id) return;
    const result = await deleteMemory(message.id, user.uid);
    if (result.success) {
      toast({ title: 'Memory forgotten.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
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
        'group flex items-start gap-4 w-full',
        isUser ? 'flex-row-reverse' : ''
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-muted">
            <BrainCircuit className="h-4 w-4" strokeWidth={1.5} />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div
        className={cn(
          'rounded-2xl px-4 py-3 flex flex-col relative max-w-[85%]',
          isUser
            ? 'bg-primary text-primary-foreground ml-auto'
            : 'bg-muted'
        )}
      >
        {isUser ? (
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        ) : message.status === 'processing' ? (
          <ThinkingIndicator logs={message.progress_log || []} />
        ) : (
          <div className="text-[15px] leading-relaxed prose prose-sm dark:prose-invert max-w-none">
            {renderContent(message.content)}
          </div>
        )}

        {message.imageUrl && (
          <div className="relative w-full max-w-sm mt-3 rounded-lg overflow-hidden">
            <Image src={message.imageUrl} alt="Uploaded content" width={400} height={300} className="object-cover" />
          </div>
        )}
      </div>

      {isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          {userAvatar ? (
            <AvatarImage src={userAvatar.imageUrl} alt="User" />
          ) : null}
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-4 w-4" strokeWidth={1.5} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
