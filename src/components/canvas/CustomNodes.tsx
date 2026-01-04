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

// User Node - Gradient style (Digital Void theme)
const UserNode = React.memo(function UserNode({ data }: NodeProps<CustomNodeData>) {
  const { message } = data;
  const timestamp = formatTime(message.createdAt);

  return (
    <div className="px-4 py-3 min-w-[200px] max-w-[400px] rounded-xl border-glow-purple relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 via-neon-purple-light/10 to-transparent opacity-60" />
      <div className="absolute inset-0 glass-panel" />
      
      <div className="relative z-10">
        <Handle type="target" position={Position.Top} className="!bg-neon-purple !w-2 !h-2" />
        
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-neon-purple to-neon-purple-light flex items-center justify-center border border-neon-purple/50 shadow-neon-purple-sm">
            <User className="h-3.5 w-3.5 text-white" strokeWidth={2} />
          </div>
          <span className="text-xs font-semibold neon-text-purple">You</span>
          {message.source === 'voice' && (
            <Mic className="h-3 w-3 text-neon-purple/70" strokeWidth={2} />
          )}
          <span className="text-xs text-white/50 ml-auto">{timestamp}</span>
        </div>
        
        <p className="text-sm text-white/95 leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        
        {message.imageUrl && (
          <div className="mt-2 rounded-lg overflow-hidden border border-neon-purple/30">
            <img 
              src={message.imageUrl} 
              alt="Uploaded content" 
              className="w-full h-auto"
            />
          </div>
        )}
        
        <Handle type="source" position={Position.Bottom} className="!bg-neon-purple !w-2 !h-2" />
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
            className="inline-block bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-md text-sm font-medium border border-cyan-500/30"
          >
            [Artifact: {part}]
          </span>
        );
      }
      return <ReactMarkdown key={index} remarkPlugins={[remarkGfm]} className="prose prose-sm prose-invert max-w-none">{part}</ReactMarkdown>;
    });
  }, [message.content]);

  return (
    <div className={cn(
      "px-5 py-4 min-w-[300px] max-w-[600px] rounded-xl border-glow-cyan relative overflow-hidden"
    )}>
      {/* Glass Background */}
      <div className="absolute inset-0 glass-panel-strong" />
      
      <div className="relative z-10">
        <Handle type="target" position={Position.Top} className="!bg-neon-cyan !w-2 !h-2" />
        
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-full glass-panel border border-neon-cyan/50 flex items-center justify-center shadow-neon-cyan-sm">
            <BrainCircuit className="h-4 w-4 neon-text-cyan" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold neon-text-cyan">Pandora</span>
          <span className="text-xs text-white/50 ml-auto">{timestamp}</span>
        </div>
      
      {isProcessing ? (
        <ThinkingIndicator logs={message.progress_log || []} />
      ) : (
        <article className="prose prose-sm prose-invert max-w-none text-white/90">
          {renderContent}
        </article>
      )}
      
      {message.imageUrl && (
        <div className="mt-3 rounded-lg overflow-hidden border border-neon-cyan/30">
          <img 
            src={message.imageUrl} 
            alt="Response image" 
            className="w-full h-auto"
          />
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-neon-cyan !w-2 !h-2" />
      </div>
    </div>
  );
});

// Node types mapping for ReactFlow (stable reference)
export const nodeTypes = {
  user: UserNode,
  assistant: AssistantNode,
} as const;

