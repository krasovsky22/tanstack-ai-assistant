import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/remote-chats/send')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const body = await request.json() as { remoteChatId: string; text: string };
        if (!body.remoteChatId || !body.text) {
          return new Response(JSON.stringify({ error: 'remoteChatId and text are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { db } = await import('@/db');
        const { remoteChats, outboundMessages } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');

        // Verify the remote chat belongs to this user
        const [chat] = await db
          .select()
          .from(remoteChats)
          .where(eq(remoteChats.id, body.remoteChatId));

        if (!chat) {
          return new Response(JSON.stringify({ error: 'Remote chat not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (chat.userId !== userId) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const [inserted] = await db
          .insert(outboundMessages)
          .values({
            remoteChatId: body.remoteChatId,
            text: body.text,
          })
          .returning({ id: outboundMessages.id });

        return new Response(JSON.stringify({ ok: true, messageId: inserted.id }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
