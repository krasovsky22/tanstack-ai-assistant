import { createFileRoute } from '@tanstack/react-router';
import type { ClassifiedEmail } from '@/services/mail-ingestion';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const Route = createFileRoute('/api/mail/store-emails')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { storeClassifiedEmails } = await import('@/services/mail-ingestion');
          const emails: ClassifiedEmail[] = await request.json();
          const summary = await storeClassifiedEmails(emails);
          return new Response(JSON.stringify(summary), { headers: JSON_HEADERS });
        } catch (err) {
          console.error('[mail-store-emails] Error:', err);
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
