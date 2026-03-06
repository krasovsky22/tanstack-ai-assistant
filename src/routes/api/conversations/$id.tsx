import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/conversations/$id')({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        const { db } = await import('@/db');
        const { conversations, messages } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');

        await db.transaction(async (tx) => {
          await tx.delete(messages).where(eq(messages.conversationId, params.id));
          await tx.delete(conversations).where(eq(conversations.id, params.id));
        });

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      PATCH: async ({ params, request }) => {
        const { db } = await import('@/db');
        const { conversations } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        const { title } = await request.json();

        await db
          .update(conversations)
          .set({ title, updatedAt: new Date() })
          .where(eq(conversations.id, params.id));

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      GET: async ({ params }) => {
        const { db } = await import('@/db');
        const { conversations, messages } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        const [conversation] = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, params.id));

        if (!conversation) {
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const msgs = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, params.id));

        return new Response(
          JSON.stringify({ conversation, messages: msgs }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      },
    },
  },
});
