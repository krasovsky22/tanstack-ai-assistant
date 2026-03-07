import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/jobs/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { db } = await import('@/db');
        const { jobs } = await import('@/db/schema');
        const { desc, ilike, eq, and } = await import('drizzle-orm');

        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        const search = url.searchParams.get('search');

        const conditions = [];
        if (status && status !== 'all') {
          conditions.push(eq(jobs.status, status));
        }
        if (search) {
          const term = `%${search}%`;
          const { or } = await import('drizzle-orm');
          conditions.push(
            or(
              ilike(jobs.title, term),
              ilike(jobs.company, term),
              ilike(jobs.source, term),
            ),
          );
        }

        const rows = await db
          .select()
          .from(jobs)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(jobs.createdAt));

        return new Response(JSON.stringify(rows), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      POST: async ({ request }) => {
        const { db } = await import('@/db');
        const { jobs } = await import('@/db/schema');
        const body = await request.json();

        const [job] = await db
          .insert(jobs)
          .values({
            title: body.title,
            company: body.company,
            description: body.description,
            source: body.source,
            status: body.status ?? 'new',
            link: body.link ?? null,
            notes: body.notes ?? null,
          })
          .returning();

        // Index into Elasticsearch (fire-and-forget)
        const { indexDocument } = await import('@/services/elasticsearch');
        void indexDocument('memory_jobs', job.id, {
          jobId: job.id,
          title: job.title,
          company: job.company,
          description: job.description,
          skills: (job.skills ?? []).join(' '),
          status: job.status,
          source_type: 'job',
          createdAt: job.createdAt.toISOString(),
        });

        return new Response(JSON.stringify(job), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
