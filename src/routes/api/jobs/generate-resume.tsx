import { createFileRoute } from '@tanstack/react-router';
import {
  generateResumeForJobById,
  generateResumeForNextProcessedJob,
} from '@/services/generate-resume';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

async function handleGenerateResume(id: string | null) {
  try {
    const job = id
      ? await generateResumeForJobById(id)
      : await generateResumeForNextProcessedJob();
    if (!job) {
      const message = id
        ? `Job ${id} not found`
        : 'No processed jobs to generate resume for';
      return new Response(JSON.stringify({ message }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }
    return new Response(JSON.stringify(job), { headers: JSON_HEADERS });
  } catch (err) {
    console.error('[generate-resume] Error:', err);
    const error = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}

export const Route = createFileRoute('/api/jobs/generate-resume')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get('id');
        return handleGenerateResume(id);
      },

      POST: async ({ request }) => {
        const url = new URL(request.url);
        const idFromQuery = url.searchParams.get('id');
        const body = await request.json().catch(() => ({}));
        const id = idFromQuery ?? (body as Record<string, string>).id ?? null;
        return handleGenerateResume(id);
      },
    },
  },
});
