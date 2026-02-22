import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/conversations')({
  server: {
    handlers: {
      GET: async () => {
        const { db } = await import('@/db');
        const { conversations } = await import('@/db/schema');
        const { desc } = await import('drizzle-orm');
        const rows = await db
          .select()
          .from(conversations)
          .orderBy(desc(conversations.updatedAt));

        return new Response(JSON.stringify(rows), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      POST: async ({ request }) => {
        const { db } = await import('@/db');
        const { conversations, messages } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        const { id, title, messages: msgs } = await request.json();

        await db.transaction(async (tx) => {
          await tx
            .insert(conversations)
            .values({ id, title, updatedAt: new Date() })
            .onConflictDoUpdate({
              target: conversations.id,
              set: { title, updatedAt: new Date() },
            });

          await tx.delete(messages).where(eq(messages.conversationId, id));

          if (msgs.length > 0) {
            await tx.insert(messages).values(
              msgs.map((m: { id: string; role: string; parts: unknown }) => ({
                id: m.id,
                conversationId: id,
                role: m.role,
                parts: m.parts,
              })),
            );
          }
        });

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
