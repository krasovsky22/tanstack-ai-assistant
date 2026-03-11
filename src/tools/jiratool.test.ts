// src/tools/jiratool.test.ts
// Wave 0: RED stubs for JIRA-01 through JIRA-07
// These tests will fail until Plan 02 creates src/tools/jiratool.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// @ts-expect-error — jiratool.ts does not exist until Plan 02
import { getJiraTools } from './jiratool';

// Helper to find a tool by name in the array
function findTool(tools: ReturnType<typeof getJiraTools>, name: string) {
  return tools.find((t: any) => t.name === name);
}

describe('getJiraTools()', () => {
  beforeEach(() => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_PAT = 'test-token';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_PAT;
  });

  // JIRA-01: Returns exactly 6 tool definitions
  it('JIRA-01: returns an array of exactly 6 tool definitions', () => {
    const tools = getJiraTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools).toHaveLength(6);
  });
});

// JIRA-02: Missing env vars return { success: false, error: '...' }
describe('jira tools - missing env vars (JIRA-02)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_PAT;
  });

  it('JIRA-02: returns { success: false, error } when JIRA_BASE_URL is missing', async () => {
    delete process.env.JIRA_BASE_URL;
    process.env.JIRA_PAT = 'test-token';

    const tools = getJiraTools();
    const searchTool = findTool(tools, 'jira_search');
    expect(searchTool).toBeDefined();

    const result = await searchTool.execute({ jql: 'project = TEST' });
    expect(result).toMatchObject({ success: false, error: expect.any(String) });
  });

  it('JIRA-02: returns { success: false, error } when JIRA_PAT is missing', async () => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    delete process.env.JIRA_PAT;

    const tools = getJiraTools();
    const searchTool = findTool(tools, 'jira_search');
    expect(searchTool).toBeDefined();

    const result = await searchTool.execute({ jql: 'project = TEST' });
    expect(result).toMatchObject({ success: false, error: expect.any(String) });
  });
});

// JIRA-03: jira_search
describe('jira_search (JIRA-03)', () => {
  beforeEach(() => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_PAT = 'test-token';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_PAT;
  });

  it('JIRA-03: calls GET /rest/api/2/search with Bearer auth and jql param', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        issues: [
          { id: '10001', key: 'TEST-1', fields: { summary: 'Test issue' } },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const tools = getJiraTools();
    const searchTool = findTool(tools, 'jira_search');
    expect(searchTool).toBeDefined();

    const result = await searchTool.execute({ jql: 'project = TEST' });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/rest/api/2/search');
    expect(url).toContain('jql=');
    expect(options?.headers?.Authorization ?? options?.headers?.authorization).toContain('Bearer test-token');
    expect(result).toHaveProperty('issues');
    expect(Array.isArray(result.issues)).toBe(true);
  });
});

// JIRA-04: jira_update_description
describe('jira_update_description (JIRA-04)', () => {
  beforeEach(() => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_PAT = 'test-token';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_PAT;
  });

  it('JIRA-04: calls PUT /rest/api/2/issue/{key} with description body; returns { success: true } on 204', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });
    vi.stubGlobal('fetch', mockFetch);

    const tools = getJiraTools();
    const updateTool = findTool(tools, 'jira_update_description');
    expect(updateTool).toBeDefined();

    const result = await updateTool.execute({
      issueKey: 'TEST-1',
      description: 'Updated description text',
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/rest/api/2/issue/TEST-1');
    expect(options?.method?.toUpperCase()).toBe('PUT');
    const body = JSON.parse(options?.body ?? '{}');
    expect(body).toMatchObject({ fields: { description: 'Updated description text' } });
    expect(result).toEqual({ success: true });
  });
});

// JIRA-05: jira_add_comment
describe('jira_add_comment (JIRA-05)', () => {
  beforeEach(() => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_PAT = 'test-token';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_PAT;
  });

  it('JIRA-05: calls POST /rest/api/2/issue/{key}/comment with body; returns created comment object', async () => {
    const mockComment = {
      id: '10001',
      body: 'This is a comment',
      author: { name: 'testuser' },
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => mockComment,
    });
    vi.stubGlobal('fetch', mockFetch);

    const tools = getJiraTools();
    const addCommentTool = findTool(tools, 'jira_add_comment');
    expect(addCommentTool).toBeDefined();

    const result = await addCommentTool.execute({
      issueKey: 'TEST-1',
      comment: 'This is a comment',
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/rest/api/2/issue/TEST-1/comment');
    expect(options?.method?.toUpperCase()).toBe('POST');
    const body = JSON.parse(options?.body ?? '{}');
    expect(body).toMatchObject({ body: 'This is a comment' });
    expect(result).toMatchObject({ id: '10001' });
  });
});

// JIRA-06: jira_get_comments
describe('jira_get_comments (JIRA-06)', () => {
  beforeEach(() => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_PAT = 'test-token';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_PAT;
  });

  it('JIRA-06: calls GET /rest/api/2/issue/{key}/comment; returns comments array', async () => {
    const mockComments = {
      comments: [
        { id: '10001', body: 'First comment', author: { name: 'user1' } },
        { id: '10002', body: 'Second comment', author: { name: 'user2' } },
      ],
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockComments,
    });
    vi.stubGlobal('fetch', mockFetch);

    const tools = getJiraTools();
    const getCommentsTool = findTool(tools, 'jira_get_comments');
    expect(getCommentsTool).toBeDefined();

    const result = await getCommentsTool.execute({ issueKey: 'TEST-1' });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/rest/api/2/issue/TEST-1/comment');
    expect(options?.method ?? 'GET').toMatch(/get/i);
    expect(result).toHaveProperty('comments');
    expect(Array.isArray(result.comments)).toBe(true);
    expect(result.comments).toHaveLength(2);
  });
});

// JIRA-07: jira_assign_issue
describe('jira_assign_issue (JIRA-07)', () => {
  beforeEach(() => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_PAT = 'test-token';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_PAT;
  });

  it('JIRA-07: calls PUT /rest/api/2/issue/{key}/assignee with { name: username }; returns { success: true } on 204', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });
    vi.stubGlobal('fetch', mockFetch);

    const tools = getJiraTools();
    const assignTool = findTool(tools, 'jira_assign_issue');
    expect(assignTool).toBeDefined();

    const result = await assignTool.execute({
      issueKey: 'TEST-1',
      username: 'jdoe',
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/rest/api/2/issue/TEST-1/assignee');
    expect(options?.method?.toUpperCase()).toBe('PUT');
    const body = JSON.parse(options?.body ?? '{}');
    // Must use { name: username } NOT accountId
    expect(body).toMatchObject({ name: 'jdoe' });
    expect(body).not.toHaveProperty('accountId');
    expect(result).toEqual({ success: true });
  });
});

// jira_get_issue (convenience tool — 6th tool)
describe('jira_get_issue (convenience tool)', () => {
  beforeEach(() => {
    process.env.JIRA_BASE_URL = 'https://jira.example.com';
    process.env.JIRA_PAT = 'test-token';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_PAT;
  });

  it('calls GET /rest/api/2/issue/{key} and returns the issue object', async () => {
    const mockIssue = {
      id: '10001',
      key: 'TEST-1',
      fields: { summary: 'Test issue', status: { name: 'Open' } },
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockIssue,
    });
    vi.stubGlobal('fetch', mockFetch);

    const tools = getJiraTools();
    const getIssueTool = findTool(tools, 'jira_get_issue');
    expect(getIssueTool).toBeDefined();

    const result = await getIssueTool.execute({ issueKey: 'TEST-1' });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/rest/api/2/issue/TEST-1');
    expect(result).toMatchObject({ key: 'TEST-1' });
  });
});
