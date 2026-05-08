export type ChatStreamLine =
  | { type: 'text'; text: string; rawType: '0' }
  | { type: 'data'; payload: unknown; rawType: '2' }
  | { type: 'unknown'; rawType: string; content: string };

export type ChatStreamHandlers = {
  onTextDelta?: (text: string) => void;
  onData?: (payload: unknown) => void;
  onLine?: (line: ChatStreamLine) => void;
  onParseError?: (error: unknown, line: string) => void;
};

function parseJsonOrRaw(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

function parseTextDelta(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed === 'object') {
      const candidate = parsed as { text?: unknown; content?: unknown };
      return typeof candidate.text === 'string' ? candidate.text : typeof candidate.content === 'string' ? candidate.content : '';
    }
    return String(parsed);
  } catch {
    return content.replace(/^"|"$/g, '');
  }
}

export function parseChatStreamLine(line: string): ChatStreamLine | null {
  if (!line.trim()) return null;

  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return null;

  const rawType = line.substring(0, colonIndex);
  const content = line.substring(colonIndex + 1);

  if (rawType === '0') {
    return { type: 'text', text: parseTextDelta(content), rawType };
  }

  if (rawType === '2') {
    return { type: 'data', payload: parseJsonOrRaw(content), rawType };
  }

  return { type: 'unknown', rawType, content };
}

export async function consumeChatStream(response: Response, handlers: ChatStreamHandlers = {}) {
  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      try {
        const parsedLine = parseChatStreamLine(line);
        if (!parsedLine) continue;

        handlers.onLine?.(parsedLine);
        if (parsedLine.type === 'text') handlers.onTextDelta?.(parsedLine.text);
        if (parsedLine.type === 'data') handlers.onData?.(parsedLine.payload);
      } catch (parseError) {
        handlers.onParseError?.(parseError, line);
      }
    }
  }
}
