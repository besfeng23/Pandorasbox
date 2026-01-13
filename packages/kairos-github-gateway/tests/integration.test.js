"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const verify_1 = require("../src/github/verify");
const server_1 = require("../src/server");
function makeMockKairos() {
    const ingested = [];
    const recomputeFull = jest.fn(async () => { });
    const client = {
        async ingestEvent(e) {
            ingested.push(e);
        },
        recomputeFull,
    };
    return { client, ingested, recomputeFull };
}
describe('integration: /webhooks/github', () => {
    test('valid signature -> emits to Kairos once, dedupes repeat, recompute once', async () => {
        process.env.GITHUB_WEBHOOK_SECRET = 'whsec_test';
        process.env.ALLOWED_REPOS = 'acme/widgets';
        // Simple in-memory deduper
        const seen = new Set();
        const dedupe = {
            async isDuplicateAndRecord(key) {
                if (seen.has(key))
                    return true;
                seen.add(key);
                return false;
            },
        };
        const mock = makeMockKairos();
        const app = (0, server_1.createApp)({ kairos: mock.client, dedupe, logger: { log() { }, warn() { }, error() { } } });
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
        const rawText = JSON.stringify(payload);
        const raw = Buffer.from(rawText, 'utf8');
        const sig = (0, verify_1.computeGithubSignature256)(process.env.GITHUB_WEBHOOK_SECRET, raw);
        const headers = {
            'Content-Type': 'application/json',
            'X-GitHub-Event': 'pull_request',
            'X-Hub-Signature-256': sig,
        };
        const r1 = await (0, supertest_1.default)(app).post('/webhooks/github').set(headers).send(rawText);
        expect(r1.status).toBe(200);
        expect(mock.ingested).toHaveLength(1);
        expect(mock.ingested[0].event_type).toBe('github.pr.opened');
        expect(mock.recomputeFull).toHaveBeenCalledTimes(1);
        const r2 = await (0, supertest_1.default)(app).post('/webhooks/github').set(headers).send(rawText);
        expect(r2.status).toBe(200);
        // still only 1 ingested due to dedupe
        expect(mock.ingested).toHaveLength(1);
        expect(mock.recomputeFull).toHaveBeenCalledTimes(1);
    });
    test('invalid signature -> 401', async () => {
        process.env.GITHUB_WEBHOOK_SECRET = 'whsec_test';
        const mock = makeMockKairos();
        const app = (0, server_1.createApp)({ kairos: mock.client, dedupe: { async isDuplicateAndRecord() { return false; } }, logger: { log() { }, warn() { }, error() { } } });
        const payload = { hello: 'world' };
        const raw = Buffer.from(JSON.stringify(payload), 'utf8');
        const r = await (0, supertest_1.default)(app)
            .post('/webhooks/github')
            .set({
            'Content-Type': 'application/json',
            'X-GitHub-Event': 'ping',
            'X-Hub-Signature-256': 'sha256=' + '0'.repeat(64),
        })
            .send(raw);
        expect(r.status).toBe(401);
        expect(mock.ingested).toHaveLength(0);
    });
});
