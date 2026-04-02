import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { UserJiraSettings } from '@/services/jira';

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
  return rows[0] ?? null;
}

export async function upsertUserSettings(
  userId: string,
  settings: Partial<UserSettingsRecord>,
): Promise<UserSettingsRecord> {
  const existing = await getUserSettings(userId);
  if (existing) {
    const [updated] = await db
      .update(userSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();
    return {
      jiraBaseUrl: updated.jiraBaseUrl,
      jiraEmail: updated.jiraEmail,
      jiraPat: updated.jiraPat,
      jiraDefaultProject: updated.jiraDefaultProject,
      githubPat: updated.githubPat ?? null,
    };
  }
  const [inserted] = await db
    .insert(userSettings)
    .values({ userId, ...settings })
    .returning();
  return {
    jiraBaseUrl: inserted.jiraBaseUrl,
    jiraEmail: inserted.jiraEmail,
    jiraPat: inserted.jiraPat,
    jiraDefaultProject: inserted.jiraDefaultProject,
    githubPat: inserted.githubPat ?? null,
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
