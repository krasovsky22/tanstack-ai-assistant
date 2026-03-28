import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/remote-chats/outbound/')({
  server: {
    handlers: {
      // Gateway-internal: fetch pending outbound messages
      GET: async () => {
        const { db } = await import('@/db');
        const { outboundMessages, remoteChats } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');

        const rows = await db
          .select({
            id: outboundMessages.id,
            chatId: remoteChats.chatId,
            provider: remoteChats.provider,
            text: outboundMessages.text,
          })
          .from(outboundMessages)
          .innerJoin(remoteChats, eq(outboundMessages.remoteChatId, remoteChats.id))
          .where(eq(outboundMessages.status, 'pending'));

        return new Response(JSON.stringify(rows), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
