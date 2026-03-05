// src/services/mail-ingestion.test.ts
// Wave 0: This file will fail until Plan 02 creates src/services/mail-ingestion.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock imapflow — prevent real IMAP connections in tests
vi.mock('imapflow', () => {
  const mockLock = { release: vi.fn() };
  const mockInstance = {
    connect: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    getMailboxLock: vi.fn().mockResolvedValue(mockLock),
    search: vi.fn().mockResolvedValue([]),
    download: vi.fn(),
    messageFlagsAdd: vi.fn().mockResolvedValue(undefined),
  };
  return {
    ImapFlow: vi.fn(() => mockInstance),
    __mockInstance: mockInstance,
    __mockLock: mockLock,
  };
});

// Mock @tanstack/ai — prevent real LLM calls in tests
vi.mock('@tanstack/ai', () => ({
  chat: vi.fn(),
}));

// Mock @/db — prevent real DB connections in tests
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ id: 'test-job-id' }]),
    returning: vi.fn().mockResolvedValue([{ id: 'test-job-id' }]),
  },
}));

// Import after mocks are set up
// @ts-expect-error — mail-ingestion.ts does not exist until Plan 02
import { normalizeSubject, getSearchSince, runIngestion } from './mail-ingestion';

describe('normalizeSubject', () => {
  it('strips Re: prefix and lowercases', () => {
    expect(normalizeSubject('Re: Software Engineer at Acme')).toBe('software engineer at acme');
  });

  it('strips chained Fwd: Re: prefixes', () => {
    expect(normalizeSubject('Fwd: Re: Job Opportunity')).toBe('job opportunity');
  });

  it('strips fw: prefix (short form)', () => {
    expect(normalizeSubject('fw: Interview at Google')).toBe('interview at google');
  });

  it('handles plain subject with no prefix', () => {
    expect(normalizeSubject('Plain Subject')).toBe('plain subject');
  });
});

describe('getSearchSince', () => {
  it('returns a date approximately 10 days before now', () => {
    const result = getSearchSince();
    const expected = new Date();
    expected.setDate(expected.getDate() - 10);
    // Within 1 second tolerance
    expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(1000);
  });
});

describe('runIngestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zero summary when no unread emails found', async () => {
    const summary = await runIngestion();
    expect(summary).toEqual({
      fetched: 0,
      jobRelated: 0,
      matched: 0,
      created: 0,
    });
  });
});
