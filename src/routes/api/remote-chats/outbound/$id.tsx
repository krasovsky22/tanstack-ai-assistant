import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/remote-chats/outbound/$id')({
  server: {
    handlers: {
      // Gateway-internal: update outbound message status after delivery attempt
      PATCH: async ({ request, params }) => {
        const body = await request.json() as {
          status: 'sent' | 'failed';
          error?: string;
        };

        if (body.status !== 'sent' && body.status !== 'failed') {
          return new Response(JSON.stringify({ error: 'status must be sent or failed' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { db } = await import('@/db');
        const { outboundMessages } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');

        await db
          .update(outboundMessages)
          .set({
            status: body.status,
            ...(body.status === 'sent' ? { sentAt: new Date() } : {}),
            ...(body.error != null ? { error: body.error } : {}),
          })
          .where(eq(outboundMessages.id, params.id));

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
