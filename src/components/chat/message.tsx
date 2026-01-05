
'use client';

import { Message as MessageType } from '@/lib/types';
import { cn, formatTime } from '@/lib/utils';
import { AlertTriangle, Sun } from 'lucide-react';
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

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const timestamp = formatTime(message.createdAt);
  const setActiveArtifactId = useArtifactStore(state => state.setActiveArtifactId);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

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
      return <ReactMarkdown key={index} remarkPlugins={[remarkGfm]} className="prose prose-sm prose-zinc dark:prose-invert max-w-none">{part}</ReactMarkdown>;
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
          'rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col relative max-w-[85%] sm:max-w-[80%] shadow-lg',
          isUser
            ? 'bg-gradient-to-br from-cyan-400/90 to-cyan-500/80 text-white ml-auto border border-cyan-300/30'
            : 'glass-panel border border-purple-400/20 text-white/90'
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
