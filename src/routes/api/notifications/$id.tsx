import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/notifications/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { db } = await import('@/db');
        const { notifications } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;

        const [notification] = await db
          .select()
          .from(notifications)
          .where(eq(notifications.id, params.id));

        if (!notification) {
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (userId && notification.userId && notification.userId !== userId) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(notification), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      PATCH: async ({ request, params }) => {
        const { db } = await import('@/db');
        const { notifications } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;
        const body = await request.json();

        const [existing] = await db
          .select()
          .from(notifications)
          .where(eq(notifications.id, params.id));

        if (!existing) {
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (userId && existing.userId && existing.userId !== userId) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const updates: Record<string, unknown> = {};
        if (body.isRead !== undefined) updates.isRead = body.isRead;

        const [updated] = await db
          .update(notifications)
          .set(updates)
          .where(eq(notifications.id, params.id))
          .returning();

        if (!updated) {
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(updated), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      DELETE: async ({ params }) => {
        const { db } = await import('@/db');
        const { notifications } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;

        const [existing] = await db
          .select()
          .from(notifications)
          .where(eq(notifications.id, params.id));

        if (existing && userId && existing.userId && existing.userId !== userId) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        await db.delete(notifications).where(eq(notifications.id, params.id));

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
