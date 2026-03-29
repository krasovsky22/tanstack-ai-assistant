import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the MCP SDK before importing the module under test
const mockConnect = vi.fn();
const mockListTools = vi.fn();
const mockCallTool = vi.fn();

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    listTools: mockListTools,
    callTool: mockCallTool,
  })),
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: vi.fn().mockImplementation(() => ({})),
}));

// @ts-expect-error — file does not exist yet (RED phase)
import { getGitHubMcpTools } from './github-mcp';

describe('getGitHubMcpTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns [] when MCP Client.connect() throws', async () => {
    mockConnect.mockRejectedValueOnce(new Error('Connection refused'));

    const result = await getGitHubMcpTools('fake-pat');

    expect(result).toEqual([]);
  });

  it('returns array of tool definitions when listTools resolves with 2 mock tools', async () => {
    mockConnect.mockResolvedValueOnce(undefined);
    mockListTools.mockResolvedValueOnce({
      tools: [
        {
          name: 'search_code',
          description: 'Search code',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'list_prs',
          description: 'List PRs',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    });

    const result = await getGitHubMcpTools('fake-pat');

    expect(result).toHaveLength(2);
  });

  it('each returned tool has a .server property that is a function', async () => {
    mockConnect.mockResolvedValueOnce(undefined);
    mockListTools.mockResolvedValueOnce({
      tools: [
        {
          name: 'search_code',
          description: 'Search code',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'list_prs',
          description: 'List PRs',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    });

    const result = await getGitHubMcpTools('fake-pat');

    for (const tool of result) {
      expect(typeof (tool as any).server).toBe('function');
    }
  });
});
