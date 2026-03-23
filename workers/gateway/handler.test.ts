import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// @ts-expect-error — will be resolved once handler is updated (Wave 0 RED)
import { handleMessage } from './handler.js';
import type { IncomingMessage, Provider } from './types.js';

const mockProvider: Provider = {
  name: 'telegram',
  start: vi.fn(),
  stop: vi.fn(),
  send: vi.fn().mockResolvedValue(undefined),
};

const baseMsg: IncomingMessage = {
  chatId: 99999,
  text: 'hello',
  provider: 'telegram',
  images: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Gateway handler link intercept (GID-06)', () => {
  it('intercepts /link CODE and calls /api/gateway-link, not /api/chat-sync', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Account linked!' }),
    });

    await handleMessage({ ...baseMsg, text: '/link ABC123' }, mockProvider);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0] as [string, ...unknown[]];
    expect(url).toContain('/api/gateway-link');
    expect(url).not.toContain('/api/chat-sync');
    expect(mockProvider.send).toHaveBeenCalledWith(99999, 'Account linked!');
  });
});

describe('Gateway handler blocks unlinked users (GID-07)', () => {
  it('sends linking prompt when chatId has no identity and never calls chat-sync', async () => {
    // resolve → no userId
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ userId: null }),
    });

    await handleMessage({ ...baseMsg, text: 'tell me the weather' }, mockProvider);

    // Only one fetch call (resolve), not two (resolve + chat-sync)
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockProvider.send).toHaveBeenCalledWith(
      99999,
      expect.stringContaining('/link'),
    );
  });
});
