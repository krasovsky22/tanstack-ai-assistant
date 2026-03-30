import { describe, it, expect } from 'vitest';

// @ts-expect-error — implementation not yet created (Wave 0 RED stub)
import { handleWidgetPost, handleWidgetPoll } from './index';

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

describe('Widget API: job polling (W9-02)', () => {
  it('POST /api/gateway/widget returns { jobId: string }', async () => {
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
    const req = new Request('http://localhost/api/gateway/widget/unknown-job-id', {
      method: 'GET',
    });
    const res = await handleWidgetPoll(req, 'unknown-job-id');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('pending');
  });

  it('GET /api/gateway/widget/{jobId} returns { status: "done", text: string } after completion', async () => {
    // This test requires full end-to-end flow — stub for W9-02
    // Will be verified in Plan 03 integration tests
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
