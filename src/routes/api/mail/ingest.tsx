import { createFileRoute } from '@tanstack/react-router';
import { runIngestion } from '@/services/mail-ingestion';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const Route = createFileRoute('/api/mail/ingest')({
  server: {
    handlers: {
      POST: async ({ request: _request }) => {
        try {
          const emails = await runIngestion();
          return new Response(JSON.stringify(emails), { headers: JSON_HEADERS });
        } catch (err) {
          console.error('[mail-ingest] Error:', err);
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
