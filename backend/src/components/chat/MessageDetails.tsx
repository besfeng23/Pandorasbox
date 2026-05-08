'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Bot, Cog, ExternalLink, FileText, Globe } from 'lucide-react';
import { ArtifactViewer } from './artifact-viewer';
import type { ChatMessage, ChatToolUsage } from './ChatContainer';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isWebResult(value: unknown): value is { title?: string; source?: string; url?: string; snippet?: string } {
  return isRecord(value) && (typeof value.source === 'string' || typeof value.url === 'string' || typeof value.title === 'string');
}

function stringifyData(data: unknown) {
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function DataBlock({ data }: { data: unknown }) {
  if (typeof data === 'string') {
    return (
      <div className="prose prose-xs max-w-none text-foreground dark:prose-invert prose-p:my-2 prose-pre:my-2 prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:border prose-pre:border-border prose-pre:bg-background prose-pre:p-3 prose-code:text-foreground">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data}</ReactMarkdown>
      </div>
    );
  }

  return (
    <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-background p-3 text-xs leading-5 text-foreground">
      <code>{stringifyData(data)}</code>
    </pre>
  );
}

function WebResults({ output }: { output: unknown }) {
  const results = Array.isArray(output) ? output.filter(isWebResult) : [];

  if (results.length === 0) return <DataBlock data={output} />;

  return (
    <div className="space-y-2">
      {results.map((result, index) => {
        const href = result.source || result.url;
        return (
          <div key={`${href || result.title || 'web'}-${index}`} className="rounded-lg border border-border bg-background p-3">
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <span className="truncate">{result.title || href}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ) : (
              <p className="text-sm font-medium text-foreground">{result.title || 'Web result'}</p>
            )}
            {href && <p className="mt-1 truncate text-xs text-muted-foreground">{href}</p>}
            {result.snippet && <p className="mt-2 text-xs leading-5 text-muted-foreground">{result.snippet}</p>}
          </div>
        );
      })}
    </div>
  );
}

function getArtifact(tool: ChatToolUsage) {
  if (tool.toolName !== 'generate_artifact') return null;
  const input = isRecord(tool.input) ? tool.input : {};
  const output = isRecord(tool.output) ? tool.output : {};
  const content = typeof input.content === 'string' ? input.content : typeof output.content === 'string' ? output.content : '';
  if (!content) return null;

  const rawType = typeof input.type === 'string' ? input.type : typeof output.type === 'string' ? output.type : 'code';
  const type = ['code', 'markdown', 'html', 'svg', 'react'].includes(rawType) ? (rawType as 'code' | 'markdown' | 'html' | 'svg' | 'react') : 'code';

  return {
    title: typeof input.title === 'string' ? input.title : typeof output.title === 'string' ? output.title : 'Generated artifact',
    type,
    content,
    language: typeof input.language === 'string' ? input.language : typeof output.language === 'string' ? output.language : undefined,
  };
}

function ToolUsageItem({ tool, index }: { tool: ChatToolUsage; index: number }) {
  const artifact = getArtifact(tool);
  const isWebTool = tool.toolName === 'web_retrieval' || tool.toolName === 'web_search' || tool.toolName.includes('web');

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        {isWebTool ? <Globe className="h-4 w-4 text-primary" /> : artifact ? <FileText className="h-4 w-4 text-primary" /> : <Cog className="h-4 w-4 text-primary" />}
        <span className="truncate">{artifact ? 'Generated artifact' : tool.toolName || `Tool ${index + 1}`}</span>
      </div>

      {artifact ? (
        <ArtifactViewer {...artifact} />
      ) : isWebTool ? (
        <WebResults output={tool.output} />
      ) : (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Input</p>
            <DataBlock data={tool.input} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Output</p>
            <DataBlock data={tool.output} />
          </div>
        </div>
      )}
    </div>
  );
}

export function MessageDetails({ message }: { message: ChatMessage }) {
  const tools = message.toolUsages || [];
  const hasReasoning = Boolean(message.reasoning?.trim());
  const hasTools = tools.length > 0;

  if (!hasReasoning && !hasTools) return null;

  return (
    <div className="mt-3 max-w-full">
      <Accordion type="multiple" className="rounded-xl border border-border bg-card/60 px-3">
        {hasReasoning && (
          <AccordionItem value="reasoning" className="border-border last:border-b-0">
            <AccordionTrigger className="py-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                <Bot className="h-4 w-4" /> Reasoning
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <DataBlock data={message.reasoning || ''} />
            </AccordionContent>
          </AccordionItem>
        )}
        {hasTools && (
          <AccordionItem value="tools" className="border-border last:border-b-0">
            <AccordionTrigger className="py-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                <Cog className="h-4 w-4" /> Tool activity
                <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px]">{tools.length}</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pb-2">
                {tools.map((tool, index) => (
                  <ToolUsageItem key={`${tool.toolName || 'tool'}-${index}`} tool={tool} index={index} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
