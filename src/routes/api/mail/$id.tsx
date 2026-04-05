import { createFileRoute } from '@tanstack/react-router';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const Route = createFileRoute('/api/mail/$id')({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        const { db } = await import('@/db');
        const { jobEmails } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        await db.delete(jobEmails).where(eq(jobEmails.id, params.id));
        return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
      },
    },
  },
});
