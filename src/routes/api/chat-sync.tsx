import { chat } from '@tanstack/ai';
import { createFileRoute } from '@tanstack/react-router';
import { buildChatOptions, saveConversationToDb } from '@/services/chat';

export const Route = createFileRoute('/api/chat-sync')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, title, source } = await request.json();

        try {
          const conversationId = crypto.randomUUID();
          const options = await buildChatOptions(messages, conversationId);
          const text = await chat({ ...options, stream: false });

          await saveConversationToDb(conversationId, title ?? 'Chat', [
            {
              id: crypto.randomUUID(),
              role: 'user',
              parts: [{ type: 'text', content: messages[0].content }],
            },
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              parts: [{ type: 'text', content: text }],
            },
          ], source ?? null);

          return new Response(JSON.stringify({ text }), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err) {
          console.error('[chat-sync] Error:', err);
          return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          );
        }
      },
    },
  },
});
