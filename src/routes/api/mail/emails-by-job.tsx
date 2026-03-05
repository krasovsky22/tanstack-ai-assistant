import { createFileRoute } from '@tanstack/react-router';
import { db } from '@/db';
import { jobEmails } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const Route = createFileRoute('/api/mail/emails-by-job')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const jobId = new URL(request.url).searchParams.get('jobId');
          if (!jobId) {
            return new Response(JSON.stringify([]), { headers: JSON_HEADERS });
          }
          const emails = await db
            .select({
              id: jobEmails.id,
              subject: jobEmails.subject,
              sender: jobEmails.sender,
              receivedAt: jobEmails.receivedAt,
              emailLlmSummarized: jobEmails.emailLlmSummarized,
              emailContent: jobEmails.emailContent,
            })
            .from(jobEmails)
            .where(eq(jobEmails.jobId, jobId))
            .orderBy(desc(jobEmails.receivedAt));
          return new Response(JSON.stringify(emails), { headers: JSON_HEADERS });
        } catch (err) {
          console.error('[mail-emails-by-job] Error:', err);
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
