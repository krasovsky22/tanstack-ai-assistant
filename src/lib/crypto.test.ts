import { describe, it, expect, beforeAll } from 'vitest';

describe('crypto — ENC-01 through ENC-04, ENC-07', () => {
  describe('with valid ENCRYPTION_KEY', () => {
    let encrypt: (p: string) => string;
    let decrypt: (s: string) => string | null;

    beforeAll(async () => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);
      const mod = await import('@/lib/crypto');
      encrypt = mod.encrypt;
      decrypt = mod.decrypt;
    });

    it('ENC-01: round-trips a PAT value', () => {
      const pat = 'ghp_TestTokenAbc123';
      expect(decrypt(encrypt(pat))).toBe(pat);
    });

    it('ENC-01: encrypted value starts with enc: prefix', () => {
      expect(encrypt('secret')).toMatch(/^enc:/);
    });

    it('ENC-02: two encryptions of same value produce different ciphertext (random IV)', () => {
      const a = encrypt('same');
      const b = encrypt('same');
      expect(a).not.toBe(b);
    });

    it('ENC-03: decrypt returns null for legacy plaintext (no enc: prefix)', () => {
      expect(decrypt('old-plaintext-pat')).toBeNull();
    });

    it('ENC-04: decrypt returns null for tampered ciphertext', () => {
      const enc = encrypt('secret');
      const tampered = enc.slice(0, -4) + 'XXXX';
      expect(decrypt(tampered)).toBeNull();
    });
  });

  describe('ENC-07: startup validation', () => {
    // Note: The bust-cache pattern (query string on import path) works in Vitest
    // because query strings produce distinct module URLs. If the test runner caches
    // aggressively, these ENC-07 tests can be verified manually by checking that
    // importing src/lib/crypto.ts with a missing/invalid ENCRYPTION_KEY throws at
    // module load time.
    it('throws when ENCRYPTION_KEY is missing', async () => {
      const savedKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      // Use a fresh module resolution — vitest module cache reset trick
      await expect(import('@/lib/crypto?bust=' + Date.now())).rejects.toThrow(
        /ENCRYPTION_KEY/,
      );
      process.env.ENCRYPTION_KEY = savedKey;
    });

    it('throws when ENCRYPTION_KEY is wrong length (not 64 hex chars)', async () => {
      const savedKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'tooshort';
      await expect(import('@/lib/crypto?bust=' + Date.now())).rejects.toThrow(
        /ENCRYPTION_KEY/,
      );
      process.env.ENCRYPTION_KEY = savedKey;
    });
  });
});
