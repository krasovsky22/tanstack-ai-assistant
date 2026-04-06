import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { UserJiraSettings } from '@/services/jira';
import { encrypt, decrypt } from '@/lib/crypto';

export interface GitHubSettings {
  githubPat: string;
}

export interface UserSettingsRecord {
  jiraBaseUrl: string | null;
  jiraEmail: string | null;
  jiraPat: string | null;
  jiraDefaultProject: string | null;
  githubPat: string | null;
}

export async function getUserSettings(
  userId: string,
): Promise<UserSettingsRecord | null> {
  const rows = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    jiraBaseUrl: row.jiraBaseUrl,
    jiraEmail: row.jiraEmail,
    jiraPat: row.jiraPat ? decrypt(row.jiraPat) : null,
    jiraDefaultProject: row.jiraDefaultProject,
    githubPat: row.githubPat ? decrypt(row.githubPat) : null,
  };
}

export async function upsertUserSettings(
  userId: string,
  settings: Partial<UserSettingsRecord>,
): Promise<UserSettingsRecord> {
  const settingsToWrite: Partial<UserSettingsRecord> = {
    ...settings,
    ...(settings.jiraPat != null ? { jiraPat: encrypt(settings.jiraPat) } : {}),
    ...(settings.githubPat != null ? { githubPat: encrypt(settings.githubPat) } : {}),
  };

  const existing = await getUserSettings(userId);
  if (existing) {
    const [updated] = await db
      .update(userSettings)
      .set({ ...settingsToWrite, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();
    return {
      jiraBaseUrl: updated.jiraBaseUrl,
      jiraEmail: updated.jiraEmail,
      jiraPat: updated.jiraPat ? decrypt(updated.jiraPat) : null,
      jiraDefaultProject: updated.jiraDefaultProject,
      githubPat: updated.githubPat ? decrypt(updated.githubPat) : null,
    };
  }
  const [inserted] = await db
    .insert(userSettings)
    .values({ userId, ...settingsToWrite })
    .returning();
  return {
    jiraBaseUrl: inserted.jiraBaseUrl,
    jiraEmail: inserted.jiraEmail,
    jiraPat: inserted.jiraPat ? decrypt(inserted.jiraPat) : null,
    jiraDefaultProject: inserted.jiraDefaultProject,
    githubPat: inserted.githubPat ? decrypt(inserted.githubPat) : null,
  };
}

export function toGitHubSettings(
  record: UserSettingsRecord | null,
): GitHubSettings | null {
  console.log('user settings record in toGitHubSettings:', record);
  if (record?.githubPat) {
    return { githubPat: record.githubPat };
  }
  return null;
}

export function toJiraSettings(
  record: UserSettingsRecord | null,
): UserJiraSettings | null {
  // Use user settings if they have Jira credentials configured
  if (record?.jiraBaseUrl && record?.jiraEmail && record?.jiraPat) {
    return {
      jiraBaseUrl: record.jiraBaseUrl,
      jiraEmail: record.jiraEmail,
      jiraPat: record.jiraPat,
      jiraDefaultProject: record.jiraDefaultProject,
    };
  }
  // Fall back to environment variables (used for system-level flows like bug reports)
  const envBaseUrl = process.env.JIRA_BASE_URL ?? null;
  const envEmail = process.env.JIRA_EMAIL ?? null;
  const envPat = process.env.JIRA_PAT ?? null;
  if (envBaseUrl && envEmail && envPat) {
    return {
      jiraBaseUrl: envBaseUrl,
      jiraEmail: envEmail,
      jiraPat: envPat,
      jiraDefaultProject: process.env.JIRA_DEFAULT_PROJECT ?? null,
    };
  }
  return null;
}
