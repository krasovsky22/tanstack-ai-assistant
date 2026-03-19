import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/notifications/unread-count')({
  server: {
    handlers: {
      GET: async () => {
        const { db } = await import('@/db');
        const { notifications } = await import('@/db/schema');
        const { eq, and, count } = await import('drizzle-orm');
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;

        const conditions = [
          eq(notifications.isRead, false),
          ...(userId ? [eq(notifications.userId, userId)] : []),
        ];

        const [result] = await db
          .select({ count: count() })
          .from(notifications)
          .where(and(...conditions));

        return new Response(JSON.stringify({ count: result?.count ?? 0 }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
