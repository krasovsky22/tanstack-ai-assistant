import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions so they are accessible before vi.mock hoisting
const { mockWhere, mockLimit } = vi.hoisted(() => ({
  mockWhere: vi.fn().mockReturnThis(),
  mockLimit: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: mockWhere,
    limit: mockLimit,
  },
}));

vi.mock('@/db/schema', () => ({
  agents: {},
}));

import { getDefaultAgent, getAgentById, getAgentByApiKey } from '@/services/agents';

const mockAgentDefault = {
  id: 'agent-default-id',
  name: 'Default Agent',
  model: 'gpt-4o',
  maxIterations: 10,
  systemPrompt: 'You are a helpful assistant.',
  isDefault: true,
  apiKey: 'key-default-123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAgentOther = {
  id: 'agent-other-id',
  name: 'Other Agent',
  model: 'gpt-4o-mini',
  maxIterations: 5,
  systemPrompt: '',
  isDefault: false,
  apiKey: 'key-other-456',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('getDefaultAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockReturnThis();
    mockLimit.mockResolvedValue([]);
  });

  it('returns the agent marked isDefault=true', async () => {
    mockLimit.mockResolvedValueOnce([mockAgentDefault]);
    const result = await getDefaultAgent();
    expect(result).toEqual(mockAgentDefault);
  });

  it('returns null when no agents in table', async () => {
    mockLimit.mockResolvedValueOnce([]);
    const result = await getDefaultAgent();
    expect(result).toBeNull();
  });
});

describe('getAgentById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockReturnThis();
    mockLimit.mockResolvedValue([]);
  });

  it('returns agent by id', async () => {
    mockLimit.mockResolvedValueOnce([mockAgentOther]);
    const result = await getAgentById('agent-other-id');
    expect(result).toEqual(mockAgentOther);
  });

  it('returns null for unknown id', async () => {
    mockLimit.mockResolvedValueOnce([]);
    const result = await getAgentById('unknown-id');
    expect(result).toBeNull();
  });
});

describe('getAgentByApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockReturnThis();
    mockLimit.mockResolvedValue([]);
  });

  it('returns agent by apiKey', async () => {
    mockLimit.mockResolvedValueOnce([mockAgentDefault]);
    const result = await getAgentByApiKey('key-default-123');
    expect(result).toEqual(mockAgentDefault);
  });

  it('returns null for unknown apiKey', async () => {
    mockLimit.mockResolvedValueOnce([]);
    const result = await getAgentByApiKey('unknown-key');
    expect(result).toBeNull();
  });
});
