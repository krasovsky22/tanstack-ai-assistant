import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest';
import { handleWidgetPost } from './index';

// Mock DB and chat services — widget route runs these server-side
vi.mock('@/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) }),
  },
}));

vi.mock('@/services/chat', () => ({
  buildChatOptions: vi.fn().mockResolvedValue({}),
  runChatWithToolCollection: vi.fn().mockResolvedValue({
    text: 'Hello from LLM',
    assistantParts: [{ type: 'text', content: 'Hello from LLM' }],
  }),
  getOpenConversationByChatId: vi.fn().mockResolvedValue(null),
  saveConversationToDb: vi.fn().mockResolvedValue(undefined),
  appendMessagesToConversation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/user-settings', () => ({
  getUserSettings: vi.fn().mockResolvedValue(null),
  toJiraSettings: vi.fn().mockReturnValue(null),
  toGitHubSettings: vi.fn().mockReturnValue(null),
}));

describe('Widget API: key validation (W9-01)', () => {
  it('rejects request with missing api key', async () => {
    const req = new Request('http://localhost/api/gateway/widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: 'abc', message: 'hello' }),
    });
    const res = await handleWidgetPost(req, '');
    expect(res.status).toBe(401);
  });

  it('rejects request with wrong api key', async () => {
    const req = new Request('http://localhost/api/gateway/widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-widget-api-key': 'wrong' },
      body: JSON.stringify({ chatId: 'abc', message: 'hello' }),
    });
    const res = await handleWidgetPost(req, 'correct-key');
    expect(res.status).toBe(401);
  });
});

describe('Widget API: direct conversation creation (W9-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/gateway/widget returns { conversationId, text }', async () => {
    const req = new Request('http://localhost/api/gateway/widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-widget-api-key': 'test-key' },
      body: JSON.stringify({ chatId: 'abc', message: 'hello' }),
    });
    const res = await handleWidgetPost(req, 'test-key');
    expect(res.status).toBe(200);
    const body = await res.json() as { conversationId: string; text: string };
    expect(typeof body.conversationId).toBe('string');
    expect(typeof body.text).toBe('string');
  });

  it('POST with username resolves userId before chat', async () => {
    const { getOpenConversationByChatId } = await import('@/services/chat');
    const req = new Request('http://localhost/api/gateway/widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-widget-api-key': 'test-key' },
      body: JSON.stringify({ chatId: 'abc', message: 'hello', username: 'alice' }),
    });
    await handleWidgetPost(req, 'test-key');
    // getOpenConversationByChatId should have been called (userId resolved to null since mock returns no user)
    expect(getOpenConversationByChatId).toHaveBeenCalledWith('abc', null);
  });
});

describe('Widget API: CORS headers (W9-03)', () => {
  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('POST response includes Access-Control-Allow-Origin header', async () => {
    const req = new Request('http://localhost/api/gateway/widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-widget-api-key': 'test-key' },
      body: JSON.stringify({ chatId: 'abc', message: 'hello' }),
    });
    const res = await handleWidgetPost(req, 'test-key');
    expect(res.headers.get('Access-Control-Allow-Origin')).not.toBeNull();
  });

  it('OPTIONS response includes Access-Control-Allow-Origin header', async () => {
    const req = new Request('http://localhost/api/gateway/widget', {
      method: 'OPTIONS',
    });
    const res = await handleWidgetPost(req, 'test-key');
    expect(res.headers.get('Access-Control-Allow-Origin')).not.toBeNull();
  });
});
