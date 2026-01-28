'use client';

import React, { useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Message as MessageType } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import { User, BrainCircuit, Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThinkingIndicator } from '../chat/thinking-indicator';
import { cn } from '@/lib/utils';

interface CustomNodeData {
  message: MessageType;
}

// User Node - Gradient style
const UserNode = React.memo(function UserNode({ data }: NodeProps<CustomNodeData>) {
  const { message } = data;
  const timestamp = formatTime(message.createdAt);

  return (
    <div className="px-5 py-3 min-w-[100px] max-w-[500px] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground shadow-sm relative overflow-hidden">
      {/* Standard Blue Bubble */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1 opacity-80">
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/90">You</span>
          {message.source === 'voice' && (
            <Mic className="h-3 w-3 text-white/80" strokeWidth={2} />
          )}
          <span className="text-[10px] text-white/60 ml-auto">{timestamp}</span>
        </div>

        <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-sans">
          {message.content}
        </p>

        {message.imageUrl && (
          <div className="mt-2 rounded-lg overflow-hidden border border-primary/10">
            <img
              src={message.imageUrl}
              alt="Uploaded content"
              className="w-full h-auto"
            />
          </div>
        )}

        <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
      </div>
    </div>
  );
});

// Assistant Node - Cyan borders, larger, supports markdown
const ARTIFACT_REGEX = /\[Artifact Created: (.*?)\]/g;

const AssistantNode = React.memo(function AssistantNode({ data }: NodeProps<CustomNodeData>) {
  const { message } = data;
  const timestamp = formatTime(message.createdAt);
  const isProcessing = message.status === 'processing';

  const renderContent = useMemo(() => {
    const parts = message.content.split(ARTIFACT_REGEX);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <span
            key={index}
            className="inline-block bg-accent/20 text-accent-foreground px-2 py-1 rounded-md text-sm font-medium border border-accent/30"
          >
            [Artifact: {part}]
          </span>
        );
      }
      return <ReactMarkdown key={index} remarkPlugins={[remarkGfm]} className="prose prose-sm dark:prose-invert max-w-none">{part}</ReactMarkdown>;
    });
  }, [message.content]);

  return (
    <div className={cn(
      "px-5 py-4 min-w-[300px] max-w-[650px] rounded-2xl rounded-tl-sm bg-secondary text-secondary-foreground relative overflow-hidden border border-black/5 dark:border-white/5 shadow-sm"
    )}>
      <div className="relative z-10">
        <Handle type="target" position={Position.Top} className="!bg-zinc-400 !w-2 !h-2" />

        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-inner">
            <BrainCircuit className="h-3.5 w-3.5 text-white" strokeWidth={2} />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Pandora</span>
          <span className="text-[10px] text-muted-foreground/60 ml-auto">{timestamp}</span>
        </div>

        {isProcessing ? (
          <ThinkingIndicator logs={message.progress_log || []} />
        ) : (
          <article className="prose prose-sm dark:prose-invert max-w-none text-foreground">
            {renderContent}
          </article>
        )}

        {message.imageUrl && (
          <div className="mt-3 rounded-lg overflow-hidden border border-primary/30">
            <img
              src={message.imageUrl}
              alt="Response image"
              className="w-full h-auto"
            />
          </div>
        )}

        <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
      </div>
    </div>
  );
});

// Node types mapping for ReactFlow (stable reference)
export const nodeTypes = {
  user: UserNode,
  assistant: AssistantNode,
} as const;

