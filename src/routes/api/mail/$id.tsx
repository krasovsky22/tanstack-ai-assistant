import { createFileRoute } from '@tanstack/react-router';
import { db } from '@/db';
import { jobEmails } from '@/db/schema';
import { eq } from 'drizzle-orm';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const Route = createFileRoute('/api/mail/$id')({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        await db.delete(jobEmails).where(eq(jobEmails.id, params.id));
        return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
      },
    },
  },
});
