import { describe, it, expect, vi } from 'vitest';

// Mock heavy external dependencies
vi.mock('@/tools', () => ({
  getDockerMcpToolDefinitions: vi.fn().mockResolvedValue([]),
  getCronjobTools: vi.fn().mockReturnValue([]),
  getNewsApiTools: vi.fn().mockReturnValue([]),
  getUiBackendApiTools: vi.fn().mockReturnValue([]),
  getFileTools: vi.fn().mockReturnValue([]),
  getCmdTools: vi.fn().mockReturnValue([]),
  getMemoryTools: vi.fn().mockReturnValue([{ name: 'search_memory' }]),
}));

vi.mock('@tanstack/ai-openai', () => ({
  openaiText: vi.fn().mockReturnValue('mock-adapter'),
}));

vi.mock('@tanstack/ai', () => ({
  maxIterations: vi.fn().mockReturnValue('mock-strategy'),
}));

import { buildChatOptions } from '@/services/chat';

describe('buildChatOptions', () => {
  it('includes search_memory tool in tools array', async () => {
    const options = await buildChatOptions([]);
    const toolNames = (options.tools as Array<{ name?: string }>).map((t) => t.name);
    expect(toolNames).toContain('search_memory');
  });
});
