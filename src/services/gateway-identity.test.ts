import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
      }),
    }),
  },
}));

// @ts-expect-error — implementation not yet created (Wave 0 RED)
import { generateLinkingCode, redeemLinkingCode } from '@/services/gateway-identity';

describe('generateLinkingCode (GID-03)', () => {
  it('returns a 6-char uppercase hex string', () => {
    const code = generateLinkingCode();
    expect(code).toMatch(/^[A-F0-9]{6}$/);
  });
});

describe('redeemLinkingCode (GID-04, GID-05)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns { success: false } when db update returns empty (expired or used)', async () => {
    const result = await redeemLinkingCode('EXPIRED', 'telegram', '12345');
    expect(result.success).toBe(false);
    expect(result.message).toContain('expired');
  });
});
