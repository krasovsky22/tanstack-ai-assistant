// src/services/chat.test.ts
// Wave 0: RED stub for JIRA-08
// Tests will fail until getJiraTools is exported from @/tools (Plan 03)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetJiraTools = vi.fn().mockReturnValue([]);
const mockGetCronjobTools = vi.fn().mockReturnValue([]);

vi.mock('@/tools', () => ({
  getDockerMcpToolDefinitions: vi.fn().mockResolvedValue([]),
  getCronjobTools: mockGetCronjobTools,
  getNewsApiTools: vi.fn().mockReturnValue([]),
  getUiBackendApiTools: vi.fn().mockReturnValue([]),
  getFileTools: vi.fn().mockReturnValue([]),
  getCmdTools: vi.fn().mockReturnValue([]),
  getMemoryTools: vi.fn().mockReturnValue([]),
  getKnowledgeBaseTools: vi.fn().mockReturnValue([]),
  getJiraTools: mockGetJiraTools, // This export does not exist until Plan 03
}));

import { buildChatOptions } from './chat';

describe('buildChatOptions() — Jira tool registration (JIRA-08)', () => {
  const originalDisableTools = process.env.DISABLE_TOOLS;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DISABLE_TOOLS;
  });

  afterEach(() => {
    if (originalDisableTools !== undefined) {
      process.env.DISABLE_TOOLS = originalDisableTools;
    } else {
      delete process.env.DISABLE_TOOLS;
    }
  });

  it('JIRA-08: calls getJiraTools() when "jira" is not in DISABLE_TOOLS', async () => {
    delete process.env.DISABLE_TOOLS;

    await buildChatOptions([]);

    expect(mockGetJiraTools).toHaveBeenCalledOnce();
  });

  it('JIRA-08 inverse: does NOT call getJiraTools() when DISABLE_TOOLS includes "jira"', async () => {
    process.env.DISABLE_TOOLS = 'jira';

    await buildChatOptions([]);

    expect(mockGetJiraTools).not.toHaveBeenCalled();
  });
});
