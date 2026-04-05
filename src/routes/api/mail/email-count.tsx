import { createFileRoute } from '@tanstack/react-router';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const Route = createFileRoute('/api/mail/email-count')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { db } = await import('@/db');
          const { jobEmails } = await import('@/db/schema');
          const { eq, count } = await import('drizzle-orm');
          const jobId = new URL(request.url).searchParams.get('jobId');
          if (!jobId) {
            return new Response(JSON.stringify({ count: 0 }), { headers: JSON_HEADERS });
          }
          const [result] = await db
            .select({ value: count() })
            .from(jobEmails)
            .where(eq(jobEmails.jobId, jobId));
          return new Response(
            JSON.stringify({ count: Number(result?.value ?? 0) }),
            { headers: JSON_HEADERS },
          );
        } catch (err) {
          console.error('[mail-email-count] Error:', err);
          const error = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ error }), {
            status: 500,
            headers: JSON_HEADERS,
          });
        }
      },
    },
  },
});
