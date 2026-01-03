'use client';

import React from 'react';
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

// User Node - Purple borders, glassmorphism
export function UserNode({ data }: NodeProps<CustomNodeData>) {
  const { message } = data;
  const timestamp = formatTime(message.createdAt);

  return (
    <div className="px-4 py-3 min-w-[200px] max-w-[400px] rounded-xl bg-black/40 backdrop-blur-md border-2 border-purple-500/50 shadow-lg shadow-purple-500/20">
      <Handle type="target" position={Position.Top} className="!bg-purple-500" />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="h-6 w-6 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/50">
          <User className="h-3.5 w-3.5 text-purple-400" strokeWidth={2} />
        </div>
        <span className="text-xs font-semibold text-purple-300">You</span>
        {message.source === 'voice' && (
          <Mic className="h-3 w-3 text-purple-400/70" strokeWidth={2} />
        )}
        <span className="text-xs text-purple-400/60 ml-auto">{timestamp}</span>
      </div>
      
      <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
        {message.content}
      </p>
      
      {message.imageUrl && (
        <div className="mt-2 rounded-lg overflow-hidden border border-purple-500/30">
          <img 
            src={message.imageUrl} 
            alt="Uploaded content" 
            className="w-full h-auto"
          />
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
    </div>
  );
}

// Assistant Node - Cyan borders, larger, supports markdown
export function AssistantNode({ data }: NodeProps<CustomNodeData>) {
  const { message } = data;
  const timestamp = formatTime(message.createdAt);
  const isProcessing = message.status === 'processing';

  const artifactRegex = /\[Artifact Created: (.*?)\]/g;
  
  const renderContent = (content: string) => {
    const parts = content.split(artifactRegex);
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
  };

  return (
    <div className={cn(
      "px-5 py-4 min-w-[300px] max-w-[600px] rounded-xl bg-black/40 backdrop-blur-md border-2 shadow-lg",
      "border-cyan-500/50 shadow-cyan-500/20"
    )}>
      <Handle type="target" position={Position.Top} className="!bg-cyan-500" />
      
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">
          <BrainCircuit className="h-4 w-4 text-cyan-400" strokeWidth={2} />
        </div>
        <span className="text-sm font-semibold text-cyan-300">Pandora</span>
        <span className="text-xs text-cyan-400/60 ml-auto">{timestamp}</span>
      </div>
      
      {isProcessing ? (
        <ThinkingIndicator logs={message.progress_log || []} />
      ) : (
        <article className="prose prose-sm prose-invert max-w-none text-white/90">
          {renderContent(message.content)}
        </article>
      )}
      
      {message.imageUrl && (
        <div className="mt-3 rounded-lg overflow-hidden border border-cyan-500/30">
          <img 
            src={message.imageUrl} 
            alt="Response image" 
            className="w-full h-auto"
          />
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500" />
    </div>
  );
}

// Node types mapping for ReactFlow
export const nodeTypes = {
  user: UserNode,
  assistant: AssistantNode,
};

