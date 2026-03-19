import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/notifications/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { db } = await import('@/db');
        const { notifications } = await import('@/db/schema');
        const { desc, eq, and } = await import('drizzle-orm');
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;

        const url = new URL(request.url);
        const unreadOnly = url.searchParams.get('unread') === 'true';

        const conditions = [
          ...(userId ? [eq(notifications.userId, userId)] : []),
          ...(unreadOnly ? [eq(notifications.isRead, false)] : []),
        ];

        const rows = await db
          .select()
          .from(notifications)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(notifications.createdAt));

        return new Response(JSON.stringify(rows), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      POST: async ({ request }) => {
        const { db } = await import('@/db');
        const { notifications } = await import('@/db/schema');
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;
        const body = await request.json();

        const [notification] = await db
          .insert(notifications)
          .values({
            title: body.title,
            content: body.content,
            source: body.source ?? null,
            sourceConversationId: body.sourceConversationId ?? null,
            userId: userId ?? null,
          })
          .returning();

        return new Response(JSON.stringify(notification), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
