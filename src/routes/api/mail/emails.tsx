import { createFileRoute } from '@tanstack/react-router';
import { fetchRawEmails } from '@/services/mail-ingestion';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const Route = createFileRoute('/api/mail/emails')({
  server: {
    handlers: {
      GET: async ({ request: _request }) => {
        try {
          const emails = await fetchRawEmails();
          return new Response(JSON.stringify(emails), { headers: JSON_HEADERS });
        } catch (err) {
          console.error('[mail-emails] Error:', err);
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
