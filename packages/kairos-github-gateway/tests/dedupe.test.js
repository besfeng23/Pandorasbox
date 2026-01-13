"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dedupe_1 = require("../src/utils/dedupe");
describe('dedupe store', () => {
    test('memory dedupe prevents double send', async () => {
        process.env.DEDUPE_MODE = 'memory';
        const store = (0, dedupe_1.createDedupeStore)();
        const key = 'github.pr.opened:acme_widgets:12:PB-CORE-CHAT-001';
        const first = await store.isDuplicateAndRecord(key);
        const second = await store.isDuplicateAndRecord(key);
        expect(first).toBe(false);
        expect(second).toBe(true);
    });
});
