
import 'server-only';
import type { AgentId } from '@/lib/agent-types';

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  sanitizedContent?: string;
}

const BLOCKED_PATTERNS_BUILDER = [
  /malware/i,
  /ransomware/i,
  /keylogger/i,
  /spyware/i,
  /exploit\s+code/i,
  /weaponiz/i,
  /surveillance\s+tool/i,
  /ddos\s+attack/i,
];

const BLOCKED_PATTERNS_UNIVERSE = [
  /\bminor\b.*\bsexual/i,
  /child.*porn/i,
  /non-?consensual/i,
  /\brape\b(?!seed|flower)/i,
];

const SAFE_REFUSAL_BUILDER =
  "I can't help with creating malware, surveillance tools, or weaponization requests. Let me know if there's something else I can assist with.";
const SAFE_REFUSAL_UNIVERSE =
  "I can't generate content that violates consent or involves minors. Let's explore something else.";

export function preCheck(content: string, agentId: AgentId): GuardrailResult {
  const patterns = agentId === 'builder' ? BLOCKED_PATTERNS_BUILDER : BLOCKED_PATTERNS_UNIVERSE;

  for (const pattern of patterns) {
    if (pattern.test(content)) {
      return {
        allowed: false,
        reason: agentId === 'builder' ? SAFE_REFUSAL_BUILDER : SAFE_REFUSAL_UNIVERSE,
      };
    }
  }

  return { allowed: true, sanitizedContent: content };
}

export function postCheck(content: string, agentId: AgentId): GuardrailResult {
  const patterns = agentId === 'builder' ? BLOCKED_PATTERNS_BUILDER : BLOCKED_PATTERNS_UNIVERSE;

  for (const pattern of patterns) {
    if (pattern.test(content)) {
      return {
        allowed: false,
        reason: agentId === 'builder' ? SAFE_REFUSAL_BUILDER : SAFE_REFUSAL_UNIVERSE,
      };
    }
  }

  return { allowed: true, sanitizedContent: content };
}
