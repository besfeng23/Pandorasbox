"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KAIROS_NODE_ID_REGEX = void 0;
exports.extractNodeIds = extractNodeIds;
exports.resolveNodeIdsByPriority = resolveNodeIdsByPriority;
exports.KAIROS_NODE_ID_REGEX = /\bPB-[A-Z0-9]+-[A-Z0-9]+-\d{3}\b/g;
function extractNodeIds(text) {
    if (!text)
        return [];
    const matches = text.match(exports.KAIROS_NODE_ID_REGEX);
    if (!matches || matches.length === 0)
        return [];
    // deterministic order: first occurrence order + unique
    const seen = new Set();
    const out = [];
    for (const m of matches) {
        if (!seen.has(m)) {
            seen.add(m);
            out.push(m);
        }
    }
    return out;
}
/**
 * Deterministic nodeId resolution:
 * 1) PR title
 * 2) branch name
 * 3) commit messages (if available)
 * 4) PR body (optional)
 */
function resolveNodeIdsByPriority(inputs) {
    const fromTitle = extractNodeIds(inputs.title ?? '');
    if (fromTitle.length > 0)
        return { nodeIds: fromTitle, source: 'title' };
    const fromBranch = extractNodeIds(inputs.branch ?? '');
    if (fromBranch.length > 0)
        return { nodeIds: fromBranch, source: 'branch' };
    const commits = Array.isArray(inputs.commitMessages) ? inputs.commitMessages : [];
    for (const msg of commits) {
        const found = extractNodeIds(msg ?? '');
        if (found.length > 0)
            return { nodeIds: found, source: 'commit' };
    }
    const fromBody = extractNodeIds(inputs.body ?? '');
    if (fromBody.length > 0)
        return { nodeIds: fromBody, source: 'body' };
    return { nodeIds: [], source: null };
}
