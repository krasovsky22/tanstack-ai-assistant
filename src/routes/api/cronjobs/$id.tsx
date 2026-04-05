import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/cronjobs/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const { db } = await import('@/db');
        const { cronjobs } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;
        const body = await request.json();

        const { validate } = await import('node-cron');
        if (body.cronExpression !== undefined && !validate(body.cronExpression)) {
          return new Response(JSON.stringify({ error: 'Invalid cron expression' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Fetch existing record to verify ownership
        const [existing] = await db
          .select()
          .from(cronjobs)
          .where(eq(cronjobs.id, params.id));

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

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (body.name !== undefined) updates.name = body.name;
        if (body.cronExpression !== undefined) updates.cronExpression = body.cronExpression;
        if (body.prompt !== undefined) updates.prompt = body.prompt;
        if (body.isActive !== undefined) updates.isActive = body.isActive;

        const [updated] = await db
          .update(cronjobs)
          .set(updates)
          .where(eq(cronjobs.id, params.id))
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
        const { cronjobs } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;

        // Fetch existing record to verify ownership
        const [existing] = await db
          .select()
          .from(cronjobs)
          .where(eq(cronjobs.id, params.id));

        if (existing && userId && existing.userId && existing.userId !== userId) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        await db.delete(cronjobs).where(eq(cronjobs.id, params.id));

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
