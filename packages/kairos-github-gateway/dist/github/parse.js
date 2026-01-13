"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGithubWebhook = parseGithubWebhook;
const nodeid_1 = require("../utils/nodeid");
const WEIGHTS = {
    'github.pr.opened': 0.05,
    'github.workflow.lint_pass': 0.1,
    'github.workflow.unit_pass': 0.15,
    'github.workflow.integration_pass': 0.15,
    'github.workflow.e2e_pass': 0.3,
    'github.pr.merged': 0.35,
    'github.deploy.preview_success': 0, // optional; default neutral unless you enable it explicitly
    'github.deploy.prod_success': 0.5,
    'github.release.published': 0, // optional
};
function workflowRunMapping(workflowName) {
    const name = (workflowName ?? '').trim();
    if (!name)
        return null;
    // Explicit mapping list (priority order: e2e > integration > unit > lint).
    // We use word boundaries to avoid accidental substring matches.
    const n = name.toLowerCase();
    if (/\be2e\b/.test(n) || /\bend[- ]to[- ]end\b/.test(n))
        return { event_type: 'github.workflow.e2e_pass', confidence: WEIGHTS['github.workflow.e2e_pass'] };
    if (/\bintegration\b/.test(n))
        return { event_type: 'github.workflow.integration_pass', confidence: WEIGHTS['github.workflow.integration_pass'] };
    if (/\bunit\b/.test(n))
        return { event_type: 'github.workflow.unit_pass', confidence: WEIGHTS['github.workflow.unit_pass'] };
    if (/\blint\b/.test(n))
        return { event_type: 'github.workflow.lint_pass', confidence: WEIGHTS['github.workflow.lint_pass'] };
    return null;
}
function iso(x) {
    const s = typeof x === 'string' ? x : null;
    if (s && !Number.isNaN(Date.parse(s)))
        return new Date(s).toISOString();
    return new Date().toISOString();
}
function repoFullNameFromPayload(payload) {
    const rn = payload?.repository?.full_name;
    if (typeof rn === 'string' && rn.trim())
        return rn.trim();
    return null;
}
function dedupeKey(args) {
    // Firestore doc IDs cannot contain '/', so we sanitize repo for dedupe keys deterministically.
    // Repo is still included in payload.repo as full "owner/repo".
    const repoKey = (args.repo ?? 'unknown').replace(/\//g, '_');
    const identity = args.pr_number ?? args.run_id ?? args.sha ?? 'unknown';
    return `${args.event_type}:${repoKey}:${identity}:${args.node_id}`;
}
function parseGithubWebhook(args) {
    const logs = [];
    const repo = repoFullNameFromPayload(args.payload);
    const out = [];
    if (!repo)
        logs.push('missing repository.full_name');
    if (args.eventName === 'pull_request') {
        const action = String(args.payload?.action ?? '');
        const pr = args.payload?.pull_request ?? {};
        const prNumber = typeof pr?.number === 'number' ? pr.number : typeof args.payload?.number === 'number' ? args.payload.number : null;
        const title = typeof pr?.title === 'string' ? pr.title : null;
        const body = typeof pr?.body === 'string' ? pr.body : null;
        const branch = typeof pr?.head?.ref === 'string' ? pr.head.ref : null;
        const sha = typeof pr?.head?.sha === 'string' ? pr.head.sha : null;
        const prUrl = typeof pr?.html_url === 'string' ? pr.html_url : null;
        let eventType = null;
        if (action === 'opened' || action === 'reopened')
            eventType = 'github.pr.opened';
        if (action === 'closed' && pr?.merged === true)
            eventType = 'github.pr.merged';
        if (!eventType)
            return { repoFullName: repo, events: [], logs };
        const nodeIdResolution = (0, nodeid_1.resolveNodeIdsByPriority)({
            title: title ?? '',
            branch: branch ?? '',
            commitMessages: [], // commit messages are not available in pull_request webhook payload
            body: body ?? '',
        });
        if (nodeIdResolution.nodeIds.length === 0) {
            logs.push(`no nodeId (pull_request ${action})`);
            return { repoFullName: repo, events: [], logs };
        }
        for (const nodeId of nodeIdResolution.nodeIds) {
            out.push({
                event_time: iso(pr?.updated_at ?? pr?.created_at),
                event_type: eventType,
                actor: 'github',
                source: 'github',
                node_id: nodeId,
                confidence: WEIGHTS[eventType],
                payload: {
                    repo,
                    pr_number: prNumber,
                    pr_url: prUrl,
                    sha,
                    branch,
                    dedupe_key: dedupeKey({ event_type: eventType, repo: repo ?? 'unknown', pr_number: prNumber, sha, node_id: nodeId }),
                },
            });
        }
        return { repoFullName: repo, events: out, logs };
    }
    if (args.eventName === 'workflow_run') {
        const action = String(args.payload?.action ?? '');
        const run = args.payload?.workflow_run ?? {};
        const conclusion = String(run?.conclusion ?? '');
        if (action !== 'completed' || conclusion !== 'success')
            return { repoFullName: repo, events: [], logs };
        const map = workflowRunMapping(typeof run?.name === 'string' ? run.name : null);
        if (!map) {
            logs.push(`unmapped workflow_run name: ${(run?.name ?? '').toString()}`);
            return { repoFullName: repo, events: [], logs };
        }
        const runId = typeof run?.id === 'number' ? run.id : null;
        const sha = typeof run?.head_sha === 'string' ? run.head_sha : null;
        const branch = typeof run?.head_branch === 'string' ? run.head_branch : null;
        const displayTitle = typeof run?.display_title === 'string' ? run.display_title : null;
        const headCommitMsg = typeof run?.head_commit?.message === 'string' ? run.head_commit.message : null;
        const nodeIdResolution = (0, nodeid_1.resolveNodeIdsByPriority)({
            title: displayTitle ?? '',
            branch: branch ?? '',
            commitMessages: headCommitMsg ? [headCommitMsg] : [],
            body: null,
        });
        if (nodeIdResolution.nodeIds.length === 0) {
            logs.push('no nodeId (workflow_run success)');
            return { repoFullName: repo, events: [], logs };
        }
        for (const nodeId of nodeIdResolution.nodeIds) {
            out.push({
                event_time: iso(run?.updated_at ?? run?.run_started_at),
                event_type: map.event_type,
                actor: 'github',
                source: 'github',
                node_id: nodeId,
                confidence: map.confidence,
                payload: {
                    repo,
                    workflow: run?.name ?? null,
                    run_id: runId,
                    sha,
                    branch,
                    conclusion: 'success',
                    dedupe_key: dedupeKey({ event_type: map.event_type, repo: repo ?? 'unknown', run_id: runId, sha, node_id: nodeId }),
                },
            });
        }
        return { repoFullName: repo, events: out, logs };
    }
    if (args.eventName === 'release') {
        const action = String(args.payload?.action ?? '');
        if (action !== 'published')
            return { repoFullName: repo, events: [], logs };
        const rel = args.payload?.release ?? {};
        const name = typeof rel?.name === 'string' ? rel.name : null;
        const tag = typeof rel?.tag_name === 'string' ? rel.tag_name : null;
        const body = typeof rel?.body === 'string' ? rel.body : null;
        const target = typeof rel?.target_commitish === 'string' ? rel.target_commitish : null;
        const nodeIdResolution = (0, nodeid_1.resolveNodeIdsByPriority)({
            title: name ?? tag ?? '',
            branch: target ?? '',
            commitMessages: [],
            body: body ?? '',
        });
        if (nodeIdResolution.nodeIds.length === 0) {
            logs.push('no nodeId (release published)');
            return { repoFullName: repo, events: [], logs };
        }
        for (const nodeId of nodeIdResolution.nodeIds) {
            const eventType = 'github.release.published';
            out.push({
                event_time: iso(rel?.published_at ?? rel?.created_at),
                event_type: eventType,
                actor: 'github',
                source: 'github',
                node_id: nodeId,
                confidence: WEIGHTS[eventType],
                payload: {
                    repo,
                    release: {
                        id: rel?.id ?? null,
                        name,
                        tag_name: tag,
                        url: rel?.html_url ?? null,
                    },
                    dedupe_key: dedupeKey({ event_type: eventType, repo: repo ?? 'unknown', sha: tag ?? null, node_id: nodeId }),
                },
            });
        }
        return { repoFullName: repo, events: out, logs };
    }
    return { repoFullName: repo, events: [], logs };
}
