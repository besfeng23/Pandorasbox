export const KAIROS_NODE_ID_REGEX = /\bPB-[A-Z0-9]+-[A-Z0-9]+-\d{3}\b/g;

export function extractNodeIds(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.match(KAIROS_NODE_ID_REGEX);
  if (!matches || matches.length === 0) return [];
  // deterministic order: first occurrence order + unique
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    if (!seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}

export type NodeIdSearchInputs = {
  title?: string | null;
  branch?: string | null;
  commitMessages?: Array<string | null | undefined> | null;
  body?: string | null;
};

/**
 * Deterministic nodeId resolution:
 * 1) PR title
 * 2) branch name
 * 3) commit messages (if available)
 * 4) PR body (optional)
 */
export function resolveNodeIdsByPriority(inputs: NodeIdSearchInputs): { nodeIds: string[]; source: string | null } {
  const fromTitle = extractNodeIds(inputs.title ?? '');
  if (fromTitle.length > 0) return { nodeIds: fromTitle, source: 'title' };

  const fromBranch = extractNodeIds(inputs.branch ?? '');
  if (fromBranch.length > 0) return { nodeIds: fromBranch, source: 'branch' };

  const commits = Array.isArray(inputs.commitMessages) ? inputs.commitMessages : [];
  for (const msg of commits) {
    const found = extractNodeIds(msg ?? '');
    if (found.length > 0) return { nodeIds: found, source: 'commit' };
  }

  const fromBody = extractNodeIds(inputs.body ?? '');
  if (fromBody.length > 0) return { nodeIds: fromBody, source: 'body' };

  return { nodeIds: [], source: null };
}


