import { describe, it, expect, vi } from 'vitest';

// Mock the ES client before importing our module
vi.mock('@elastic/elasticsearch', () => {
  const mockIndex = vi.fn().mockResolvedValue({});
  const mockSearch = vi.fn().mockResolvedValue({
    hits: {
      hits: [
        {
          _index: 'memory_jobs',
          _score: 1.0,
          _source: {
            source_type: 'job',
            title: 'Software Engineer',
            description: 'Build cool things',
            createdAt: '2026-03-07T00:00:00Z',
          },
        },
      ],
    },
  });
  const mockCreate = vi.fn().mockResolvedValue({});

  const MockClient = vi.fn().mockImplementation(() => ({
    index: mockIndex,
    search: mockSearch,
    indices: { create: mockCreate },
  }));

  return { Client: MockClient };
});

// Reset module registry between tests to allow fresh singleton
import { getEsClient, indexDocument, searchMemory } from '@/services/elasticsearch';

describe('getEsClient', () => {
  it('returns a singleton Client instance', () => {
    const a = getEsClient();
    const b = getEsClient();
    expect(a).toBe(b);
  });
});

describe('indexDocument', () => {
  it('swallows errors and never throws', async () => {
    const client = getEsClient();
    vi.spyOn(client, 'index').mockRejectedValueOnce(new Error('ES connection refused'));
    await expect(indexDocument('test_index', 'doc-1', { field: 'value' })).resolves.toBeUndefined();
  });

  it('calls console.error on failure', async () => {
    const client = getEsClient();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(client, 'index').mockRejectedValueOnce(new Error('network error'));
    await indexDocument('test_index', 'doc-2', { field: 'value' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[elasticsearch]'), expect.any(Error));
    consoleSpy.mockRestore();
  });
});

describe('searchMemory', () => {
  it('returns results with source_type, snippet, score, and timestamp', async () => {
    const results = await searchMemory('software engineer', 'all');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('source_type');
    expect(results[0]).toHaveProperty('snippet');
    expect(results[0]).toHaveProperty('score');
    expect(results[0]).toHaveProperty('timestamp');
  });

  it('returns empty array when ES search throws', async () => {
    const client = getEsClient();
    vi.spyOn(client, 'search').mockRejectedValueOnce(new Error('index not found'));
    const results = await searchMemory('test query', 'all');
    expect(results).toEqual([]);
  });
});
