import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/remote-chats/')({
  server: {
    handlers: {
      GET: async () => {
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { db } = await import('@/db');
        const { remoteChats } = await import('@/db/schema');
        const { eq, desc } = await import('drizzle-orm');

        const rows = await db
          .select()
          .from(remoteChats)
          .where(eq(remoteChats.userId, userId))
          .orderBy(desc(remoteChats.updatedAt));

        return new Response(JSON.stringify(rows.map((r) => ({
          id: r.id,
          chatId: r.chatId,
          provider: r.provider,
          name: r.name,
          metadata: r.metadata,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }))), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      // Public upsert endpoint called by the gateway worker
      POST: async ({ request }) => {
        const body = await request.json() as {
          chatId: string;
          provider: string;
          name: string;
          metadata: Record<string, unknown>;
          userId?: string | null;
        };

        if (!body.chatId || !body.provider || !body.name) {
          return new Response(JSON.stringify({ error: 'chatId, provider, and name are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { db } = await import('@/db');
        const { remoteChats } = await import('@/db/schema');

        await db
          .insert(remoteChats)
          .values({
            chatId: body.chatId,
            provider: body.provider,
            name: body.name,
            metadata: body.metadata ?? {},
            userId: body.userId ?? null,
          })
          .onConflictDoUpdate({
            target: [remoteChats.chatId, remoteChats.provider],
            set: {
              name: body.name,
              metadata: body.metadata ?? {},
              ...(body.userId != null ? { userId: body.userId } : {}),
              updatedAt: new Date(),
            },
          });

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
