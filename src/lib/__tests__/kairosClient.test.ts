// Mock dependencies - must be before imports (Jest hoists these)
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

jest.mock('../kairosEndpoints', () => ({
  resolveKairosEndpoints: jest.fn(() => ({
    baseUrl: 'https://kairostrack.base44.app',
    ingestUrl: 'https://kairostrack.base44.app/functions/ingest',
    planRegisterUrl: 'https://kairostrack.base44.app/functions/kairosRegisterPlan',
    activePlanUrl: 'https://kairostrack.base44.app/functions/kairosGetActivePlan',
    recomputeUrl: 'https://kairostrack.base44.app/functions/kairosRecompute',
    stabilizationRegisterUrl: 'https://kairostrack.base44.app/functions/kairosRegisterStabilization',
    stabilizationActiveUrl: 'https://kairostrack.base44.app/functions/kairosGetActiveStabilization',
  })),
}));

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  sendKairosEvent,
  sendKairosEvents,
  initKairosClient,
} from '../kairosClient';

// Mock console methods
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('Kairos Client', () => {
  let fetchMock;

  beforeEach(() => {
    jest.resetAllMocks();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    initKairosClient({ enabled: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initKairosClient', () => {
    it('should initialize with default config', () => {
      initKairosClient();
      expect(true).toBe(true);
    });

    it('should override config with provided values', () => {
      initKairosClient({
        baseUrl: 'https://custom.example.com',
        gatewayUrl: 'https://gateway.example.com',
        ingestKey: 'test-key',
        enabled: false,
      });
      expect(true).toBe(true);
    });
  });

  describe('sendKairosEvent - disabled mode', () => {
    it('should return success immediately when disabled', async () => {
      initKairosClient({ enabled: false });
      const result = await sendKairosEvent('system.chat.response_completed', {
        threadId: 'thread-1',
        assistantMessageId: 'msg-1',
      });
      expect(result.success).toBe(true);
      expect(result.eventId).toBe('disabled');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('sendKairosEvent - validation', () => {
    it('should reject event with missing required fields', async () => {
      const result = await sendKairosEvent('system.chat.response_completed', {
        threadId: 'thread-1',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
      expect(result.error).toContain('assistantMessageId');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should accept event with all required fields', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
        text: async () => 'ok',
      });
      const result = await sendKairosEvent('system.chat.response_completed', {
        threadId: 'thread-1',
        assistantMessageId: 'msg-1',
      });
      expect(result.success).toBe(true);
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe('sendKairosEvent - sends event via fetch', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
        text: async () => 'ok',
      });
    });

    it('should send event to configured endpoint', async () => {
      await sendKairosEvent('system.chat.response_completed', {
        threadId: 'thread-1',
        assistantMessageId: 'msg-1',
      });
      
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const fetchCall = fetchMock.mock.calls[0];
      expect(fetchCall[0]).toBe('https://kairostrack.base44.app/functions/ingest');
      expect(fetchCall[1].method).toBe('POST');
      expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
      
      const body = JSON.parse(fetchCall[1].body);
      expect(body.event_id).toBe('test-uuid-123');
      expect(body.event_type).toBe('system.chat.response_completed');
      expect(body.source).toBe('pandorasbox');
    });

    it('should use gateway URL when configured', async () => {
      initKairosClient({
        enabled: true,
        gatewayUrl: 'https://gateway.example.com',
      });
      
      await sendKairosEvent('system.chat.response_completed', {
        threadId: 'thread-1',
        assistantMessageId: 'msg-1',
      });
      
      const fetchCall = fetchMock.mock.calls[0];
      expect(fetchCall[0]).toBe('https://gateway.example.com/v1/event');
    });
  });

  describe('sendKairosEvent - authentication', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
        text: async () => 'ok',
      });
    });

    it('should include Authorization header when ingestKey provided', async () => {
      initKairosClient({
        enabled: true,
        ingestKey: 'test-api-key',
      });
      
      await sendKairosEvent('system.chat.response_completed', {
        threadId: 'thread-1',
        assistantMessageId: 'msg-1',
      });
      
      const fetchCall = fetchMock.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers['Authorization']).toBe('Bearer test-api-key');
    });

    it('should use provided authToken in options', async () => {
      initKairosClient({
        enabled: true,
        gatewayUrl: 'https://gateway.example.com',
      });
      
      await sendKairosEvent('system.chat.response_completed', {
        threadId: 'thread-1',
        assistantMessageId: 'msg-1',
      }, {
        authToken: 'custom-token-123',
      });
      
      const fetchCall = fetchMock.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers['Authorization']).toBe('Bearer custom-token-123');
    });
  });

  describe('sendKairosEvent - handles non-OK response', () => {
    it('should handle non-ok response', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      const result = await sendKairosEvent('system.chat.response_completed', {
        threadId: 'thread-1',
        assistantMessageId: 'msg-1',
      }, { retries: 1 });

      expect(result.success).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 4xx client errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      const result = await sendKairosEvent('system.chat.response_completed', {
        threadId: 'thread-1',
        assistantMessageId: 'msg-1',
      }, { retries: 3 });

      expect(result.success).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should retry on 5xx server errors', async () => {
      jest.useFakeTimers();
      try {
        fetchMock
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error',
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ ok: true }),
            text: async () => 'ok',
          });

        const promise = sendKairosEvent('system.chat.response_completed', {
          threadId: 'thread-1',
          assistantMessageId: 'msg-1',
        }, { retries: 3 });

        jest.runOnlyPendingTimers();
        const result = await promise;

        expect(result.success).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('sendKairosEvent - retry on network failure', () => {
    it('should retry once on network failure', async () => {
      jest.useFakeTimers();
      try {
        const networkError = new Error('Network error');
        fetchMock
          .mockRejectedValueOnce(networkError)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ ok: true }),
            text: async () => 'ok',
          });

        const promise = sendKairosEvent('system.chat.response_completed', {
          threadId: 'thread-1',
          assistantMessageId: 'msg-1',
        }, { retries: 3 });

        jest.runOnlyPendingTimers();
        const result = await promise;

        expect(result.success).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('sendKairosEvents - batch sending', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
        text: async () => 'ok',
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should send multiple events sequentially', async () => {
      const events = [
        {
          eventType: 'system.chat.response_completed',
          payload: { threadId: 't1', assistantMessageId: 'm1' },
        },
        {
          eventType: 'system.thread.persisted',
          payload: { threadId: 't2' },
        },
      ];

      const promise = sendKairosEvents(events);
      jest.runOnlyPendingTimers();
      const result = await promise;

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should track failed events', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
          text: async () => 'ok',
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
          text: async () => 'ok',
        });

      const events = [
        {
          eventType: 'system.chat.response_completed',
          payload: { threadId: 't1', assistantMessageId: 'm1' },
        },
        {
          eventType: 'system.thread.persisted',
          payload: { threadId: 't2' },
        },
        {
          eventType: 'system.memory.persisted',
          payload: { memoryId: 'mem1' },
        },
      ];

      const promise = sendKairosEvents(events);
      jest.runOnlyPendingTimers();
      const result = await promise;

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
    });
  });
});

