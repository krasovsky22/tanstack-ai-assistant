import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock for getAgentByApiKey so it can be configured per test
const { mockGetAgentByApiKey } = vi.hoisted(() => ({
  mockGetAgentByApiKey: vi.fn(),
}));

vi.mock('@/services/agents', () => ({
  getAgentByApiKey: mockGetAgentByApiKey,
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/db/schema', () => ({
  users: {},
  agents: {},
}));

vi.mock('@/services/chat', () => ({
  buildChatOptions: vi.fn().mockResolvedValue({}),
  runChatWithToolCollection: vi.fn().mockResolvedValue({ text: 'ok', assistantParts: [] }),
  getOpenConversationByChatId: vi.fn().mockResolvedValue(null),
  saveConversationToDb: vi.fn().mockResolvedValue(undefined),
  appendMessagesToConversation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/user-settings', () => ({
  getUserSettings: vi.fn().mockResolvedValue(null),
  toJiraSettings: vi.fn().mockReturnValue(null),
  toGitHubSettings: vi.fn().mockReturnValue(null),
}));

import { handleWidgetPost } from '@/services/widget';

const mockAgent = {
  id: 'agent-id-123',
  name: 'Test Agent',
  model: 'gpt-4o',
  maxIterations: 10,
  systemPrompt: 'You are helpful.',
  isDefault: true,
  apiKey: 'valid-key-abc',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(apiKey: string | null, body?: object): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey !== null) {
    headers['x-widget-api-key'] = apiKey;
  }
  return new Request('http://localhost/api/gateway/widget', {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('handleWidgetPost auth validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unknown API key', async () => {
    mockGetAgentByApiKey.mockResolvedValueOnce(null);

    const request = makeRequest('unknown-key', { chatId: 'chat-1', message: 'Hello' });
    const response = await handleWidgetPost(request);

    expect(response.status).toBe(401);
    const body = await response.json() as { error: string };
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns non-401 for known API key (proceeds past auth)', async () => {
    mockGetAgentByApiKey.mockResolvedValueOnce(mockAgent);

    const request = makeRequest('valid-key-abc', { chatId: 'chat-1', message: 'Hello' });
    const response = await handleWidgetPost(request);

    expect(response.status).not.toBe(401);
  });
});
