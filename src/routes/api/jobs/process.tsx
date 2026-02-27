import { createFileRoute } from '@tanstack/react-router';
import {
  processJobById,
  processNextNewJob,
} from '@/services/process-job';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

async function handleProcess(id: string | null) {
  try {
    const job = id ? await processJobById(id) : await processNextNewJob();
    if (!job) {
      const message = id ? `Job ${id} not found` : 'No new jobs to process';
      return new Response(JSON.stringify({ message }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }
    return new Response(JSON.stringify(job), { headers: JSON_HEADERS });
  } catch (err) {
    console.error('[process-job] Error:', err);
    const error = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}

export const Route = createFileRoute('/api/jobs/process')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get('id');
        return handleProcess(id);
      },

      POST: async ({ request }) => {
        const url = new URL(request.url);
        const idFromQuery = url.searchParams.get('id');
        const body = await request.json().catch(() => ({}));
        const id = idFromQuery ?? (body as Record<string, string>).id ?? null;
        return handleProcess(id);
      },
    },
  },
});
