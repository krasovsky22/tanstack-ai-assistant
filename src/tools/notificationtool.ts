import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

export function getNotificationTools(userId: string | null, agentId?: string | null) {
  return [
    toolDefinition({
      name: 'create_notification',
      description:
        'Create a new notification for the current user. ' +
        'Use this to surface important information, reminders, or alerts to the user.',
      inputSchema: z.object({
        title: z.string().describe('Short title for the notification'),
        content: z.string().describe('Full notification content or message body'),
      }),
    }).server(async ({ title, content }) => {
      const { db } = await import('@/db');
      const { notifications } = await import('@/db/schema');

      const [row] = await db
        .insert(notifications)
        .values({
          title,
          content,
          source: 'llm',
          userId: userId ?? null,
          agentId: agentId ?? null,
        })
        .returning();

      return { success: true, id: row.id, title: row.title };
    }),

    toolDefinition({
      name: 'list_notifications',
      description:
        'List recent notifications for the current user. ' +
        'Optionally filter to show only unread notifications.',
      inputSchema: z.object({
        unreadOnly: z
          .boolean()
          .optional()
          .describe('If true, return only unread notifications'),
      }),
    }).server(async ({ unreadOnly }) => {
      const { db } = await import('@/db');
      const { notifications } = await import('@/db/schema');
      const { desc, eq, and } = await import('drizzle-orm');

      const conditions = [
        ...(userId ? [eq(notifications.userId, userId)] : []),
        ...(unreadOnly ? [eq(notifications.isRead, false)] : []),
        ...(agentId ? [eq(notifications.agentId, agentId)] : []),
      ];

      const rows = await db
        .select()
        .from(notifications)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(notifications.createdAt))
        .limit(20);

      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        source: r.source ?? null,
        isRead: r.isRead,
        createdAt: r.createdAt.toISOString(),
      }));
    }),
  ];
}
