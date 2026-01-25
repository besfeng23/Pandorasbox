import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message as MessageType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Bot, Cog, RefreshCw, Loader2, Globe } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { ArtifactViewer } from './artifact-viewer';

function ToolIoDisplay({ data }: { data: any }) {
    if (typeof data !== 'object' || data === null) {
      return <p className="text-sm">{String(data)}</p>;
    }
  
    return (
      <div className="space-y-1">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="font-semibold text-foreground/80">{key}:</span>
            <span className="break-all text-foreground/90">{JSON.stringify(value)}</span>
          </div>
        ))}
      </div>
    );
}

export function Message({ 
  message,
  onRegenerate,
  isLastAssistantMessage,
  isRegenerating,
}: { 
  message: MessageType,
  onRegenerate?: () => void,
  isLastAssistantMessage?: boolean,
  isRegenerating?: boolean
}) {
  const isUser = message.role === 'user';

  return (
    <div className="group/message">
      <div className={cn('flex items-start gap-4', isUser ? 'justify-end' : 'justify-start')}>
        {!isUser && (
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              <Bot className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className={cn(
            'max-w-2xl w-full rounded-lg px-4 py-3',
            isUser
              ? 'rounded-br-none bg-primary text-primary-foreground'
              : 'rounded-bl-none bg-card text-foreground'
          )}
        >
          {isUser ? (
            <p className="text-base whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          {message.isError && (
              <p className="mt-2 text-xs text-destructive-foreground/80">Could not generate response.</p>
          )}
          {message.toolUsages && message.toolUsages.length > 0 && (
            <div className="mt-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-b-0">
                  <AccordionTrigger className="text-xs hover:no-underline p-2 rounded-md hover:bg-white/10">
                    <div className="flex items-center gap-2">
                      <Cog className="h-4 w-4" />
                      <span>View Agent Reasoning</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 p-2 bg-background/50 rounded-md mt-1">
                      {message.toolUsages.map((tool, index) => {
                        if (tool.toolName === 'web_retrieval') {
                            return (
                                <div key={index} className="text-xs border-t border-border pt-3 first:border-t-0 first:pt-0">
                                    <p className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2"><Globe className="h-4 w-4" /> Web Results</p>
                                    <div className="mt-1 space-y-2">
                                        {(tool.output as any[]).map((citation: any, idx) => (
                                            <div key={idx} className="p-2 bg-muted/50 rounded-md">
                                                <a href={citation.source} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline block truncate text-sm">{citation.title}</a>
                                                <p className="text-muted-foreground text-xs mt-1">{citation.source}</p>
                                                <p className="mt-2 text-foreground/90 italic">"{citation.snippet}"</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        }
                        
                        // Handle Artifacts
                        if (tool.toolName === 'generate_artifact') {
                            const { title, type, content } = tool.input;
                            const artifactContent = content || tool.output?.content || '';
                            
                            return (
                                <div key={index} className="text-xs border-t border-border pt-3 first:border-t-0 first:pt-0">
                                     <p className="font-semibold text-foreground text-sm mb-2">Generated Artifact</p>
                                     <ArtifactViewer 
                                        title={title || 'Untitled Artifact'} 
                                        type={type || 'code'} 
                                        content={artifactContent} 
                                     />
                                </div>
                            );
                        }

                        return (
                        <div key={index} className="text-xs border-t border-border pt-3 first:border-t-0 first:pt-0">
                          <p className="font-semibold text-foreground text-sm mb-2">{tool.toolName}</p>
                          <div className="mt-1 space-y-3 p-2 bg-muted/50 rounded-md">
                            <div>
                              <p className="font-medium text-muted-foreground mb-1">Input</p>
                              <ToolIoDisplay data={tool.input} />
                            </div>
                            <div>
                              <p className="font-medium text-muted-foreground mt-2 mb-1">Output</p>
                             <ToolIoDisplay data={tool.output} />
                            </div>
                          </div>
                        </div>
                      )})}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </div>
        {isUser && (
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      {isLastAssistantMessage && onRegenerate && (
          <div className={cn('flex pt-2 transition-opacity group-hover/message:opacity-100', isRegenerating ? 'opacity-100' : 'opacity-0' , isUser ? 'justify-end' : 'justify-start pl-12')}>
              <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isRegenerating}>
                  {isRegenerating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Regenerate
              </Button>
          </div>
        )}
    </div>
  );
}
