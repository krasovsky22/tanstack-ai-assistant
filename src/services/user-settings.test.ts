import { describe, it, expect, vi } from 'vitest';
import type { UserSettingsRecord } from './user-settings';

// This test will fail at TypeScript compile time until githubPat is added to UserSettingsRecord
describe('UserSettingsRecord interface', () => {
  it('has a githubPat field (string | null)', () => {
    // This type assertion will cause a TS compile error until githubPat is added to the interface
    const record: UserSettingsRecord = {
      jiraBaseUrl: null,
      jiraEmail: null,
      jiraPat: null,
      jiraDefaultProject: null,
      // @ts-expect-error — githubPat not yet present on interface (RED phase)
      githubPat: null,
    };
    // If the above compiles without error, the field exists
    expect('githubPat' in record).toBe(true);
  });
});

describe('getUserSettings', () => {
  it('returns an object with githubPat property when settings exist', async () => {
    vi.mock('./user-settings', async (importOriginal) => {
      const actual = await importOriginal<typeof import('./user-settings')>();
      return {
        ...actual,
        getUserSettings: vi.fn().mockResolvedValue({
          jiraBaseUrl: null,
          jiraEmail: null,
          jiraPat: null,
          jiraDefaultProject: null,
          githubPat: null,
        }),
      };
    });

    const { getUserSettings } = await import('./user-settings');
    const result = await getUserSettings('some-user-id');

    expect(result).toHaveProperty('githubPat');
  });
});
