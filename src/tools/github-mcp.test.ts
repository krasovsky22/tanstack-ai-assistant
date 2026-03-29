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

  it('each returned tool is a server-side tool with an execute handler', async () => {
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
      // ServerTool produced by toolDefinition().server() has __toolSide: 'server'
      // and an execute function for the agent loop to invoke
      expect((tool as any).__toolSide).toBe('server');
      expect(typeof (tool as any).execute).toBe('function');
    }
  });
});
