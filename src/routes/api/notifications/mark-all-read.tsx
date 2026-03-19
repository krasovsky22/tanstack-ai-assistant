import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/notifications/mark-all-read')({
  server: {
    handlers: {
      POST: async () => {
        const { db } = await import('@/db');
        const { notifications } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;

        await db
          .update(notifications)
          .set({ isRead: true })
          .where(userId ? eq(notifications.userId, userId) : undefined);

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
