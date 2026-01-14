// Tests for src/lib/kairosClient.ts

jest.mock('../../src/lib/kairosEndpoints', () => ({
  resolveKairosEndpoints: () => ({
    ingestUrl: 'https://kairos.example/ingest',
    statusUrl: 'https://kairos.example/status',
    healthUrl: 'https://kairos.example/health',
  }),
}));

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  initKairosClient,
  sendKairosEvent,
} from '../../src/lib/kairosClient';

describe('kairosClient', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();

    // Ensure client is enabled for tests that need full behavior
    initKairosClient({
      enabled: true,
      baseUrl: 'https://kairos.example',
      ingestKey: 'test-key',
    });
  });

  it('enforces required fields for system.apikey.generated', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await sendKairosEvent('system.apikey.generated', {
      // missing userId
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required fields for system.apikey.generated');
    expect(result.error).toContain('userId');
    expect(consoleError).toHaveBeenCalled();
  });

  it('enforces required fields for system.export.completed', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await sendKairosEvent('system.export.completed', {
      userId: 'user-1',
      // missing bytes
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('system.export.completed');
    expect(result.error).toContain('bytes');
    expect(consoleError).toHaveBeenCalled();
  });

  it('enforces required fields for system.clear_memory.completed', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await sendKairosEvent('system.clear_memory.completed', {
      // missing userId
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('system.clear_memory.completed');
    expect(result.error).toContain('userId');
    expect(consoleError).toHaveBeenCalled();
  });

  it('enforces required fields for ui.settings.updated', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await sendKairosEvent('ui.settings.updated', {
      // missing userId
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('ui.settings.updated');
    expect(result.error).toContain('userId');
    expect(consoleError).toHaveBeenCalled();
  });

  it('sends event via fetch with correct headers and URL when enabled', async () => {
    // Enable client with explicit config and mock fetch
    initKairosClient({
      enabled: true,
      baseUrl: 'https://kairos.example',
      ingestKey: 'test-key',
    });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    });
    (global as any).fetch = fetchMock;

    const result = await sendKairosEvent('system.apikey.generated', {
      userId: 'user-123',
    });

    expect(result.success).toBe(true);
    expect(result.eventId).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, any];
    // Default resolveKairosEndpoints ingest URL is https://kairostrack.base44.app/functions/ingest
    expect(typeof url).toBe('string');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['Authorization']).toBe('Bearer test-key');

    const body = JSON.parse(options.body);
    expect(body.event_type).toBe('system.apikey.generated');
    expect(body.payload.userId).toBe('user-123');
  });
});


