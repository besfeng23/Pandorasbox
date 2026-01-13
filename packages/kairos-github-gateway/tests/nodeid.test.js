"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodeid_1 = require("../src/utils/nodeid");
describe('nodeId extraction', () => {
    test('extractNodeIds enforces PB-* regex and is deterministic', () => {
        const text = 'Implement PB-CORE-CHAT-001 and PB-CORE-CHAT-001 again; also PB-OPS-EXPORT-002.';
        expect((0, nodeid_1.extractNodeIds)(text)).toEqual(['PB-CORE-CHAT-001', 'PB-OPS-EXPORT-002']);
    });
    test('priority order: title > branch > commit messages > body', () => {
        const res = (0, nodeid_1.resolveNodeIdsByPriority)({
            title: 'PR: PB-CORE-CHAT-001 implement chat',
            branch: 'feature/PB-CORE-MEMORY-001',
            commitMessages: ['Kairos-Node: PB-OPS-EXPORT-002'],
            body: 'Also references PB-CORE-THREADS-003',
        });
        expect(res.nodeIds).toEqual(['PB-CORE-CHAT-001']);
        expect(res.source).toBe('title');
    });
    test('falls back to branch when title has no nodeId', () => {
        const res = (0, nodeid_1.resolveNodeIdsByPriority)({
            title: 'No node id here',
            branch: 'feature/PB-CORE-MEMORY-001',
            commitMessages: ['Kairos-Node: PB-OPS-EXPORT-002'],
            body: null,
        });
        expect(res.nodeIds).toEqual(['PB-CORE-MEMORY-001']);
        expect(res.source).toBe('branch');
    });
    test('falls back to commit message when title/branch have no nodeId', () => {
        const res = (0, nodeid_1.resolveNodeIdsByPriority)({
            title: 'No node id',
            branch: 'feature/no-node',
            commitMessages: ['fix: thing\n\nKairos-Node: PB-OPS-EXPORT-002'],
            body: null,
        });
        expect(res.nodeIds).toEqual(['PB-OPS-EXPORT-002']);
        expect(res.source).toBe('commit');
    });
});
