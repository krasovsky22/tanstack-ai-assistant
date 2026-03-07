import { describe, it, expect, vi } from 'vitest';

// Mock elasticsearch service so getMemoryTools() can be imported without ES
vi.mock('@/services/elasticsearch', () => ({
  searchMemory: vi.fn().mockResolvedValue([]),
}));

import { getMemoryTools } from '@/tools/memory';

describe('getMemoryTools', () => {
  it('returns an array with one entry', () => {
    const tools = getMemoryTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBe(1);
  });

  it('contains a search_memory tool', () => {
    const tools = getMemoryTools();
    // toolDefinition returns objects; check name property
    const names = tools.map((t: Record<string, unknown>) => t['name']);
    expect(names).toContain('search_memory');
  });
});
