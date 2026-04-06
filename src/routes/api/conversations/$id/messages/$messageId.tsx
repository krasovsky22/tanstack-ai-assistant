import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/conversations/$id/messages/$messageId')({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        const { db } = await import('@/db');
        const { messages, conversations } = await import('@/db/schema');
        const { eq, and } = await import('drizzle-orm');
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;

        // Ownership check: load parent conversation
        const [existing] = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, params.id));

        // Only block when both userId values are non-null and mismatched
        // (allows legacy unowned records per Phase 04 decision)
        if (existing && userId && existing.userId && existing.userId !== userId) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        await db
          .delete(messages)
          .where(
            and(
              eq(messages.id, params.messageId),
              eq(messages.conversationId, params.id),
            ),
          );

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
