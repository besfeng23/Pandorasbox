
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
        'group flex items-start gap-3 max-w-[80%]',
        isUser && 'flex-row-reverse'
      )}
    >
      <Avatar className="h-8 w-8 border shrink-0">
        {isUser && userAvatar ? (
            <AvatarImage src={userAvatar.imageUrl} alt="User" data-ai-hint={userAvatar.imageHint} />
        ) : null }
        <AvatarFallback className={cn(!isUser ? "bg-transparent text-foreground" : "bg-muted")}>
          {isUser ? (
            <User className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <BrainCircuit className="h-5 w-5" strokeWidth={1.5} />
          )}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          'p-3 rounded-lg flex flex-col relative',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Forget this memory?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this message from your history. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>

        <div className="flex items-center gap-2 mb-1">
            {message.source === 'voice' && isUser && <Mic className="h-3 w-3 text-muted-foreground" />}
            <span className="text-xs font-bold">{isUser ? 'You' : 'Pandora'}</span>
            <span className="text-xs text-muted-foreground">{timestamp}</span>
        </div>

        {message.imageUrl && (
            <div className="relative w-full max-w-sm mt-2 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]">
                 <Image src={message.imageUrl} alt="Uploaded content" width={400} height={300} className="object-cover" />
            </div>
        )}

        {isUser ? (
            <p className="text-base leading-relaxed whitespace-pre-wrap mt-2">
                {message.content}
            </p>
        ) : message.status === 'processing' ? (
            <ThinkingIndicator logs={message.progress_log || []} />
        ) : (
            <article className="prose prose-sm prose-zinc dark:prose-invert max-w-none mt-2">
                {renderContent(message.content)}
            </article>
        )}
      </div>
    </div>
  );
}
