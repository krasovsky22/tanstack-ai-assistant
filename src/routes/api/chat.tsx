import { createFileRoute } from '@tanstack/react-router';

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
        let githubSettings = null;
        if (userId) {
          const { getUserSettings, toJiraSettings, toGitHubSettings } = await import('@/services/user-settings');
          const settings = await getUserSettings(userId);
          jiraSettings = toJiraSettings(settings);
          githubSettings = toGitHubSettings(settings);
        }

        try {
          const { chat, toHttpResponse } = await import('@tanstack/ai');
          const { buildChatOptions } = await import('@/services/chat');
          const options = await buildChatOptions(messages, conversationId, userId, jiraSettings, githubSettings);
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
