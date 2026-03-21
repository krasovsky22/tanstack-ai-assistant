import { createFileRoute } from '@tanstack/react-router';
import { chat } from '@tanstack/ai';

export const Route = createFileRoute('/api/cronjobs/$id/test')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const { db } = await import('@/db');
        const { cronjobs } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        const { buildChatOptions } = await import('@/services/chat');

        const [job] = await db
          .select()
          .from(cronjobs)
          .where(eq(cronjobs.id, params.id));

        if (!job) {
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        try {
          const options = await buildChatOptions(
            [{ role: 'user', content: job.prompt }],
            undefined,
            job.userId ?? null,
          );
          const result = await chat({ ...options, stream: false });

          return new Response(JSON.stringify({ result }), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          );
        }
      },
    },
  },
});
