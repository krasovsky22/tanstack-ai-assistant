import { createFileRoute } from '@tanstack/react-router';
import { db } from '@/db';
import { jobEmails, jobs } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const Route = createFileRoute('/api/mail/all')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const emails = await db
            .select({
              id: jobEmails.id,
              jobId: jobEmails.jobId,
              jobTitle: jobs.title,
              jobCompany: jobs.company,
              subject: jobEmails.subject,
              sender: jobEmails.sender,
              receivedAt: jobEmails.receivedAt,
              emailLlmSummarized: jobEmails.emailLlmSummarized,
              emailContent: jobEmails.emailContent,
              source: jobEmails.source,
              createdAt: jobEmails.createdAt,
            })
            .from(jobEmails)
            .leftJoin(jobs, eq(jobEmails.jobId, jobs.id))
            .orderBy(desc(jobEmails.receivedAt));
          return new Response(JSON.stringify(emails), { headers: JSON_HEADERS });
        } catch (err) {
          console.error('[mail-all] Error:', err);
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
