// src/routes/api/mail/email-count.test.ts
// Wave 0: This file will fail until Plan 03 creates src/routes/api/mail/email-count.tsx
import { describe, it, expect, vi } from 'vitest';

// Mock @/db — prevent real DB connections in tests
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ value: 0 }]),
  },
}));

// Mock drizzle-orm to avoid module resolution issues in test environment
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  count: vi.fn(() => 'count()'),
}));

// @ts-expect-error — email-count.tsx does not exist until Plan 03
import { Route } from './email-count';

describe('GET /api/mail/email-count', () => {
  it('returns { count: 0 } when no jobId query param is provided', async () => {
    const request = new Request('http://localhost/api/mail/email-count');
    const handler = Route.options.server?.handlers?.GET;
    expect(handler).toBeDefined();
    const response = await handler?.({ request } as any);
    const body = await response?.json();
    expect(body).toEqual({ count: 0 });
  });

  it('returns { count: 0 } for a job with no emails', async () => {
    const request = new Request('http://localhost/api/mail/email-count?jobId=test-uuid-1234');
    const handler = Route.options.server?.handlers?.GET;
    expect(handler).toBeDefined();
    const response = await handler?.({ request } as any);
    const body = await response?.json();
    expect(body).toEqual({ count: 0 });
  });
});
