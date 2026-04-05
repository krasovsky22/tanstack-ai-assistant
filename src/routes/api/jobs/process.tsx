import { createFileRoute } from '@tanstack/react-router';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const Route = createFileRoute('/api/jobs/process')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get('id');
        try {
          const { processJobById, processNextNewJob } = await import('@/services/process-job');
          const job = id ? await processJobById(id) : await processNextNewJob();
          if (!job) {
            const message = id ? `Job ${id} not found` : 'No new jobs to process';
            return new Response(JSON.stringify({ message }), { status: 404, headers: JSON_HEADERS });
          }
          return new Response(JSON.stringify(job), { headers: JSON_HEADERS });
        } catch (err) {
          console.error('[process-job] Error:', err);
          const error = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ error }), { status: 500, headers: JSON_HEADERS });
        }
      },

      POST: async ({ request }) => {
        const url = new URL(request.url);
        const idFromQuery = url.searchParams.get('id');
        const body = await request.json().catch(() => ({}));
        const id = idFromQuery ?? (body as Record<string, string>).id ?? null;
        try {
          const { processJobById, processNextNewJob } = await import('@/services/process-job');
          const job = id ? await processJobById(id) : await processNextNewJob();
          if (!job) {
            const message = id ? `Job ${id} not found` : 'No new jobs to process';
            return new Response(JSON.stringify({ message }), { status: 404, headers: JSON_HEADERS });
          }
          return new Response(JSON.stringify(job), { headers: JSON_HEADERS });
        } catch (err) {
          console.error('[process-job] Error:', err);
          const error = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ error }), { status: 500, headers: JSON_HEADERS });
        }
      },
    },
  },
});
