import { createFileRoute } from '@tanstack/react-router';
import { validate } from 'node-cron';

export const Route = createFileRoute('/api/cronjobs/')({
  server: {
    handlers: {
      GET: async () => {
        const { db } = await import('@/db');
        const { cronjobs } = await import('@/db/schema');
        const { desc } = await import('drizzle-orm');

        const rows = await db.select().from(cronjobs).orderBy(desc(cronjobs.createdAt));

        return new Response(JSON.stringify(rows), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      POST: async ({ request }) => {
        const { db } = await import('@/db');
        const { cronjobs } = await import('@/db/schema');
        const body = await request.json();

        if (!validate(body.cronExpression)) {
          return new Response(JSON.stringify({ error: 'Invalid cron expression' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const [job] = await db
          .insert(cronjobs)
          .values({
            name: body.name,
            cronExpression: body.cronExpression,
            prompt: body.prompt,
            isActive: body.isActive ?? true,
          })
          .returning();

        return new Response(JSON.stringify(job), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
