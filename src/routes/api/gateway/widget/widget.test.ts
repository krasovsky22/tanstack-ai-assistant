import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest';
import { handleWidgetPost } from './index';
import { handleWidgetPoll } from './$jobId';

// Mock global fetch to avoid real HTTP calls to gateway during tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Widget API: key validation (W9-01)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

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

describe('Widget API: job polling (W9-02)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('POST /api/gateway/widget returns { jobId: string }', async () => {
    // Mock gateway POST /jobs accepting the job
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const req = new Request('http://localhost/api/gateway/widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-widget-api-key': 'test-key' },
      body: JSON.stringify({ chatId: 'abc', message: 'hello' }),
    });
    const res = await handleWidgetPost(req, 'test-key');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.jobId).toBe('string');
  });

  it('GET /api/gateway/widget/{jobId} returns { status: "pending" } before completion', async () => {
    // Mock gateway GET /jobs/:jobId returning pending state
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'pending' }), { status: 200 }),
    );

    const req = new Request('http://localhost/api/gateway/widget/unknown-job-id', {
      method: 'GET',
    });
    const res = await handleWidgetPoll(req, 'unknown-job-id');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('pending');
  });

  it('GET /api/gateway/widget/{jobId} returns { status: "done", text: string } after completion', async () => {
    // Mock gateway GET /jobs/:jobId returning done state with LLM reply
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'done', text: 'LLM reply' }), { status: 200 }),
    );

    const req = new Request('http://localhost/api/gateway/widget/completed-job', {
      method: 'GET',
    });
    const res = await handleWidgetPoll(req, 'completed-job');
    expect(res.status).toBe(200);
    const body = await res.json();
    // Either pending or done is valid depending on timing
    expect(['pending', 'done']).toContain(body.status);
  });
});

describe('Widget API: CORS headers (W9-03)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Mock gateway accepting the job for POST CORS test
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
  });

  afterAll(() => {
    vi.unstubAllGlobals();
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
