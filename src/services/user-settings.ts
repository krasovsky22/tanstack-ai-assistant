import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { UserJiraSettings } from '@/services/jira';

export interface UserSettingsRecord {
  jiraBaseUrl: string | null;
  jiraEmail: string | null;
  jiraPat: string | null;
  jiraDefaultProject: string | null;
}

export async function getUserSettings(userId: string): Promise<UserSettingsRecord | null> {
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
  };
}

export function toJiraSettings(record: UserSettingsRecord | null): UserJiraSettings | null {
  if (!record) return null;
  return {
    jiraBaseUrl: record.jiraBaseUrl,
    jiraEmail: record.jiraEmail,
    jiraPat: record.jiraPat,
    jiraDefaultProject: record.jiraDefaultProject,
  };
}
