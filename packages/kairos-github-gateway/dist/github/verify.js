"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeGithubSignature256 = computeGithubSignature256;
exports.verifyGithubWebhookSignature = verifyGithubWebhookSignature;
const crypto_1 = __importDefault(require("crypto"));
function timingSafeEqualHex(aHex, bHex) {
    try {
        const a = Buffer.from(aHex, 'hex');
        const b = Buffer.from(bHex, 'hex');
        if (a.length !== b.length)
            return false;
        return crypto_1.default.timingSafeEqual(a, b);
    }
    catch {
        return false;
    }
}
function computeGithubSignature256(secret, rawBody) {
    const h = crypto_1.default.createHmac('sha256', secret);
    h.update(rawBody);
    return `sha256=${h.digest('hex')}`;
}
/**
 * Verify GitHub webhook signature.
 *
 * IMPORTANT: Must use raw request body bytes (NOT JSON-parsed body).
 * Header format: X-Hub-Signature-256: sha256=<hex>
 */
function verifyGithubWebhookSignature(args) {
    const secret = (args.secret ?? '').trim();
    if (!secret)
        return false;
    if (!args.rawBody || !Buffer.isBuffer(args.rawBody))
        return false;
    const header = Array.isArray(args.signature256Header) ? args.signature256Header[0] : args.signature256Header;
    if (!header)
        return false;
    if (!header.startsWith('sha256='))
        return false;
    const provided = header.slice('sha256='.length).trim();
    if (!/^[0-9a-f]{64}$/i.test(provided))
        return false;
    const expected = computeGithubSignature256(secret, args.rawBody);
    const expectedHex = expected.slice('sha256='.length);
    return timingSafeEqualHex(provided.toLowerCase(), expectedHex.toLowerCase());
}
