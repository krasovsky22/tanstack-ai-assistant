import { chat, toHttpResponse } from '@tanstack/ai';
import { createFileRoute } from '@tanstack/react-router';
import { buildChatOptions } from '@/services/chat';

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!process.env.OPENAI_API_KEY) {
          return new Response(
            JSON.stringify({
              error: 'OPENAI_API_KEY not configured',
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }

        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;

        const { messages, conversationId } = await request.json();

        let jiraSettings = null;
        let githubPat: string | null = null;
        if (userId) {
          const { getUserSettings, toJiraSettings } = await import('@/services/user-settings');
          const settings = await getUserSettings(userId);
          jiraSettings = toJiraSettings(settings);
          githubPat = settings?.githubPat ?? null;
        }

        try {
          const options = await buildChatOptions(messages, conversationId, userId, jiraSettings, githubPat);
          const stream = chat(options);
          return toHttpResponse(stream);
        } catch (error) {
          return new Response(
            JSON.stringify({
              error:
                error instanceof Error ? error.message : 'An error occurred',
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }
      },
    },
  },
});
