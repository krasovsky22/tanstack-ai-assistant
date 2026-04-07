import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock tools to avoid Docker MCP connection noise in test runs
vi.mock('@/tools', () => ({
  getZapierMcpToolDefinitions: vi.fn().mockResolvedValue([]),
  getCronjobTools: vi.fn().mockReturnValue([]),
  getNewsApiTools: vi.fn().mockReturnValue([]),
  getUiBackendApiTools: vi.fn().mockReturnValue([]),
  getFileTools: vi.fn().mockReturnValue([]),
  getCmdTools: vi.fn().mockReturnValue([]),
  getMemoryTools: vi.fn().mockReturnValue([]),
  getKnowledgeBaseTools: vi.fn().mockReturnValue([]),
  getJiraTools: vi.fn().mockReturnValue([]),
  getContactMeTools: vi.fn().mockReturnValue([]),
  getGitHubMcpTools: vi.fn().mockResolvedValue([]),
}));

vi.mock('@tanstack/ai', () => ({
  maxIterations: vi.fn((n) => ({ _maxIterations: n })),
  chat: vi.fn(),
  StreamProcessor: vi.fn(),
}));

vi.mock('@tanstack/ai-openai', () => ({
  openaiText: vi.fn((model) => ({ _type: 'openai', _model: model })),
}));

vi.mock('@/lib/bedrock', () => ({
  bedrockText: vi.fn((model) => ({ _type: 'bedrock', _model: model })),
}));

describe('resolveAdapterForModel', () => {
  beforeEach(async () => {
    // Reset env before each test
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_REGION;
    vi.resetModules();
  });

  it('dispatches amazon.* models to bedrockText', async () => {
    const { resolveAdapterForModel } = await import('@/services/chat');
    const { bedrockText } = await import('@/lib/bedrock');
    const adapter = resolveAdapterForModel('amazon.nova-pro-v1:0');
    expect(bedrockText).toHaveBeenCalledWith('amazon.nova-pro-v1:0');
    expect(adapter).toMatchObject({ _type: 'bedrock' });
  });

  it('dispatches anthropic.* models to bedrockText', async () => {
    const { resolveAdapterForModel } = await import('@/services/chat');
    const { bedrockText } = await import('@/lib/bedrock');
    const adapter = resolveAdapterForModel('anthropic.claude-opus-4');
    expect(bedrockText).toHaveBeenCalledWith('anthropic.claude-opus-4');
    expect(adapter).toMatchObject({ _type: 'bedrock' });
  });

  it('dispatches meta.* models to bedrockText', async () => {
    const { resolveAdapterForModel } = await import('@/services/chat');
    const { bedrockText } = await import('@/lib/bedrock');
    const adapter = resolveAdapterForModel('meta.llama3-8b-instruct-v1:0');
    expect(bedrockText).toHaveBeenCalledWith('meta.llama3-8b-instruct-v1:0');
    expect(adapter).toMatchObject({ _type: 'bedrock' });
  });

  it('dispatches models with colon to bedrockText', async () => {
    const { resolveAdapterForModel } = await import('@/services/chat');
    const { bedrockText } = await import('@/lib/bedrock');
    const adapter = resolveAdapterForModel('some-model:v1');
    expect(bedrockText).toHaveBeenCalledWith('some-model:v1');
    expect(adapter).toMatchObject({ _type: 'bedrock' });
  });

  it('dispatches gpt-5.2 to openaiText', async () => {
    const { resolveAdapterForModel } = await import('@/services/chat');
    const { openaiText } = await import('@tanstack/ai-openai');
    const adapter = resolveAdapterForModel('gpt-5.2');
    expect(openaiText).toHaveBeenCalledWith('gpt-5.2');
    expect(adapter).toMatchObject({ _type: 'openai' });
  });

  it('dispatches generic openai model names to openaiText', async () => {
    const { resolveAdapterForModel } = await import('@/services/chat');
    const { openaiText } = await import('@tanstack/ai-openai');
    const adapter = resolveAdapterForModel('gpt-4o');
    expect(openaiText).toHaveBeenCalledWith('gpt-4o');
    expect(adapter).toMatchObject({ _type: 'openai' });
  });
});

describe('buildChatOptions with agentConfig', () => {
  beforeEach(async () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_REGION;
    vi.resetModules();
  });

  it('uses agentConfig.model via resolveAdapterForModel when agentConfig is provided', async () => {
    const { buildChatOptions } = await import('@/services/chat');
    const { openaiText } = await import('@tanstack/ai-openai');
    const agentConfig = { model: 'gpt-4o', maxIterations: 5, systemPrompt: 'Be concise.' };
    await buildChatOptions([], undefined, null, null, null, agentConfig);
    expect(openaiText).toHaveBeenCalledWith('gpt-4o');
  });

  it('falls back to resolveAdapter (openaiText default) when agentConfig is null', async () => {
    // No AWS creds — should fall back to openaiText('gpt-5.2')
    const { buildChatOptions } = await import('@/services/chat');
    const { openaiText } = await import('@tanstack/ai-openai');
    await buildChatOptions([], undefined, null, null, null, null);
    expect(openaiText).toHaveBeenCalledWith('gpt-5.2');
  });

  it('falls back to resolveAdapter when agentConfig is undefined', async () => {
    const { buildChatOptions } = await import('@/services/chat');
    const { openaiText } = await import('@tanstack/ai-openai');
    await buildChatOptions([], undefined, null, null, null);
    expect(openaiText).toHaveBeenCalledWith('gpt-5.2');
  });

  it('uses agentConfig.maxIterations when provided', async () => {
    const { buildChatOptions } = await import('@/services/chat');
    const { maxIterations } = await import('@tanstack/ai');
    const agentConfig = { model: 'gpt-4o', maxIterations: 7, systemPrompt: '' };
    await buildChatOptions([], undefined, null, null, null, agentConfig);
    expect(maxIterations).toHaveBeenCalledWith(7);
  });

  it('uses default maxIterations (15) when agentConfig is null', async () => {
    const { buildChatOptions } = await import('@/services/chat');
    const { maxIterations } = await import('@tanstack/ai');
    await buildChatOptions([], undefined, null, null, null, null);
    expect(maxIterations).toHaveBeenCalledWith(15);
  });

  it('replaces base system prompt with agentConfig.systemPrompt when provided', async () => {
    const { buildChatOptions } = await import('@/services/chat');
    const agentConfig = { model: 'gpt-4o', maxIterations: 5, systemPrompt: 'Custom agent instructions.' };
    const result = await buildChatOptions([], undefined, null, null, null, agentConfig);
    expect(result.systemPrompts[0]).toMatch(/^Custom agent instructions\./);
    expect(result.systemPrompts[0]).not.toContain('You are a helpful assistant');
  });

  it('does not prepend anything when agentConfig.systemPrompt is empty', async () => {
    const { buildChatOptions } = await import('@/services/chat');
    const agentConfig = { model: 'gpt-4o', maxIterations: 5, systemPrompt: '' };
    const result = await buildChatOptions([], undefined, null, null, null, agentConfig);
    expect(result.systemPrompts[0]).toMatch(/^You are a helpful assistant/);
  });

  it('uses bedrock adapter when agentConfig.model is a bedrock model', async () => {
    const { buildChatOptions } = await import('@/services/chat');
    const { bedrockText } = await import('@/lib/bedrock');
    const agentConfig = { model: 'amazon.nova-pro-v1:0', maxIterations: 10, systemPrompt: '' };
    await buildChatOptions([], undefined, null, null, null, agentConfig);
    expect(bedrockText).toHaveBeenCalledWith('amazon.nova-pro-v1:0');
  });
});

describe('saveConversationToDb with agentId', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('accepts optional agentId parameter without error', async () => {
    // Mock DB to avoid real DB calls
    vi.doMock('@/db', () => ({
      db: {
        insert: vi.fn(() => ({
          values: vi.fn().mockResolvedValue(undefined),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(undefined),
          })),
        })),
      },
    }));
    vi.doMock('@/db/schema', () => ({
      conversations: { id: 'conversations' },
      messages: { id: 'messages' },
    }));
    vi.doMock('drizzle-orm', () => ({
      eq: vi.fn(),
    }));
    vi.doMock('@/services/memory', () => ({
      indexConversationMemory: vi.fn().mockResolvedValue(undefined),
    }));

    const { saveConversationToDb } = await import('@/services/chat');
    // Should not throw when agentId is passed as last argument
    await expect(
      saveConversationToDb('conv-1', 'Test', [], null, null, null, 'agent-uuid-123'),
    ).resolves.not.toThrow();
  });
});
