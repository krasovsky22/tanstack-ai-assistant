import { describe, it, expect } from 'vitest';

describe('buildChatOptions', () => {
  it('includes search_memory tool in tools array', async () => {
    const { buildChatOptions } = await import('@/services/chat');
    const options = await buildChatOptions([]);
    const toolNames = options.tools.map((t: { name?: string }) => t.name);
    expect(toolNames).toContain('search_memory');
  });
});
