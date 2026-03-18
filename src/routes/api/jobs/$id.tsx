import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/jobs/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { db } = await import('@/db');
        const { jobs } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');

        const [job] = await db
          .select()
          .from(jobs)
          .where(eq(jobs.id, params.id));

        if (!job) {
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(job), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      PATCH: async ({ request, params }) => {
        const { db } = await import('@/db');
        const { jobs } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;
        const body = await request.json();

        // Fetch existing job to verify ownership
        const [existing] = await db
          .select()
          .from(jobs)
          .where(eq(jobs.id, params.id));

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

        const [job] = await db
          .update(jobs)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(jobs.id, params.id))
          .returning();

        if (!job) {
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(job), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      DELETE: async ({ params }) => {
        const { db } = await import('@/db');
        const { jobs } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;

        // Fetch existing job to verify ownership
        const [existing] = await db
          .select()
          .from(jobs)
          .where(eq(jobs.id, params.id));

        if (existing && userId && existing.userId && existing.userId !== userId) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        await db.delete(jobs).where(eq(jobs.id, params.id));

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
