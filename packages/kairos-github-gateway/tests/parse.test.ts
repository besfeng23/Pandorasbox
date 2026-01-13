import { parseGithubWebhook } from '../src/github/parse';

describe('github webhook parsing', () => {
  test('pull_request opened emits github.pr.opened with correct weight', () => {
    const payload = {
      action: 'opened',
      repository: { full_name: 'acme/widgets' },
      pull_request: {
        number: 12,
        title: 'PB-CORE-CHAT-001 Implement chat core',
        body: '',
        html_url: 'https://github.com/acme/widgets/pull/12',
        head: { ref: 'feature/PB-CORE-CHAT-001', sha: 'abc123' },
        created_at: '2026-01-13T00:00:00Z',
        updated_at: '2026-01-13T00:00:01Z',
      },
    };

    const res = parseGithubWebhook({ eventName: 'pull_request', payload });
    expect(res.events).toHaveLength(1);
    expect(res.events[0].event_type).toBe('github.pr.opened');
    expect(res.events[0].confidence).toBeCloseTo(0.05);
    expect(res.events[0].node_id).toBe('PB-CORE-CHAT-001');
    expect(res.events[0].payload.dedupe_key).toBe('github.pr.opened:acme_widgets:12:PB-CORE-CHAT-001');
  });

  test('workflow_run completed success maps to explicit workflow event type', () => {
    const payload = {
      action: 'completed',
      repository: { full_name: 'acme/widgets' },
      workflow_run: {
        id: 999,
        name: 'E2E',
        conclusion: 'success',
        head_branch: 'feature/PB-CORE-MEMORY-001',
        head_sha: 'deadbeef',
        display_title: 'PB-CORE-MEMORY-001 add memory',
        head_commit: { message: 'feat: memory\n\nKairos-Node: PB-CORE-MEMORY-001' },
        updated_at: '2026-01-13T00:02:00Z',
      },
    };

    const res = parseGithubWebhook({ eventName: 'workflow_run', payload });
    expect(res.events).toHaveLength(1);
    expect(res.events[0].event_type).toBe('github.workflow.e2e_pass');
    expect(res.events[0].confidence).toBeCloseTo(0.3);
    expect(res.events[0].node_id).toBe('PB-CORE-MEMORY-001');
  });

  test('workflow_run unmapped name emits nothing', () => {
    const payload = {
      action: 'completed',
      repository: { full_name: 'acme/widgets' },
      workflow_run: { id: 1, name: 'Docs', conclusion: 'success', head_branch: 'main', updated_at: '2026-01-13T00:00:00Z' },
    };
    const res = parseGithubWebhook({ eventName: 'workflow_run', payload });
    expect(res.events).toHaveLength(0);
  });
});


