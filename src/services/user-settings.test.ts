import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock crypto so service tests don't depend on ENCRYPTION_KEY being set
vi.mock('@/lib/crypto', () => ({
  encrypt: vi.fn((v: string) => `enc:ENCRYPTED(${v})`),
  decrypt: vi.fn((v: string) => {
    if (!v.startsWith('enc:')) return null;
    const inner = v.slice(4);
    if (inner.startsWith('ENCRYPTED(')) return inner.slice('ENCRYPTED('.length, -1);
    return 'decrypted-pat'; // for stored enc:FAKECIPHERTEXT== values
  }),
}));

// Hoist mock functions so they are accessible before vi.mock hoisting
const { mockLimit, mockReturning } = vi.hoisted(() => ({
  mockLimit: vi.fn().mockResolvedValue([]),
  mockReturning: vi.fn().mockResolvedValue([{
    jiraBaseUrl: null,
    jiraEmail: null,
    jiraPat: 'enc:FAKECIPHERTEXT==',
    jiraDefaultProject: null,
    githubPat: 'enc:FAKECIPHERTEXT2==',
  }]),
}));

// Mock DB to capture written values
// The Drizzle query chain used in user-settings.ts:
//   select().from().where().limit()       — getUserSettings
//   update().set().where().returning()    — upsertUserSettings (update path)
//   insert().values().returning()         — upsertUserSettings (insert path)
vi.mock('@/db', () => ({
  db: {
    // select chain: select().from().where().limit()
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: mockLimit,
    // update chain: update().set().where().returning()
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: mockReturning,
    // insert chain: insert().values().returning()
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  },
}));

import { upsertUserSettings, getUserSettings } from '@/services/user-settings';
import { encrypt, decrypt } from '@/lib/crypto';

describe('user-settings — ENC-05, ENC-06', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default: getUserSettings returns no rows (triggers insert path)
    mockLimit.mockResolvedValue([]);
    mockReturning.mockResolvedValue([{
      jiraBaseUrl: null,
      jiraEmail: null,
      jiraPat: 'enc:FAKECIPHERTEXT==',
      jiraDefaultProject: null,
      githubPat: 'enc:FAKECIPHERTEXT2==',
    }]);
  });

  it('ENC-05: upsertUserSettings encrypts jiraPat before writing to DB', async () => {
    await upsertUserSettings('user-1', {
      jiraPat: 'plaintext-jira-token',
      githubPat: 'plaintext-github-token',
    });
    expect(encrypt).toHaveBeenCalledWith('plaintext-jira-token');
    expect(encrypt).toHaveBeenCalledWith('plaintext-github-token');
  });

  it('ENC-06: getUserSettings decrypts jiraPat and githubPat before returning', async () => {
    mockLimit.mockResolvedValueOnce([{
      jiraBaseUrl: null,
      jiraEmail: null,
      jiraPat: 'enc:ENCRYPTED(my-secret-pat)',
      jiraDefaultProject: null,
      githubPat: 'enc:ENCRYPTED(my-github-pat)',
    }]);
    const result = await getUserSettings('user-1');
    expect(decrypt).toHaveBeenCalledWith('enc:ENCRYPTED(my-secret-pat)');
    expect(result?.jiraPat).toBe('my-secret-pat');
    expect(result?.githubPat).toBe('my-github-pat');
  });

  it('ENC-06: getUserSettings returns null for legacy plaintext PATs (decrypt returns null)', async () => {
    mockLimit.mockResolvedValueOnce([{
      jiraBaseUrl: null,
      jiraEmail: null,
      jiraPat: 'old-legacy-pat-no-prefix',
      jiraDefaultProject: null,
      githubPat: null,
    }]);
    vi.mocked(decrypt).mockReturnValueOnce(null); // legacy plaintext
    const result = await getUserSettings('user-1');
    expect(result?.jiraPat).toBeNull();
  });
});
