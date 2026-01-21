
export function extractArtifacts(text: string) {
  const artifacts: { type: string; content: string; title?: string; language?: string }[] = [];
  const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = match[1] || 'text';
    const content = match[2].trim();
    // Simple heuristic for title: first line comment or just "Snippet"
    const titleMatch = content.match(/^(?:\/\/|#)\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1] : `Code Snippet (${language})`;

    artifacts.push({
      type: 'code',
      language,
      content,
      title
    });
  }

  return artifacts;
}


