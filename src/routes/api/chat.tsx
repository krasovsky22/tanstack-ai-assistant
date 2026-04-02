import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const hasAwsCreds =
          process.env.AWS_ACCESS_KEY_ID &&
          process.env.AWS_SECRET_ACCESS_KEY &&
          process.env.AWS_REGION;
        if (!hasAwsCreds && !process.env.OPENAI_API_KEY) {
          return new Response(
            JSON.stringify({
              error: 'No AI provider configured. Set OPENAI_API_KEY or AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION).',
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

        const { messages: rawMessages, conversationId } = await request.json();
        // Sanitize tool-call parts: ensure args is always an object, never a string.
        // A string args value causes Anthropic API to reject the request with
        // "toolUse.input is invalid — expected object".
        const messages = Array.isArray(rawMessages)
          ? rawMessages.map((msg: any) => ({
              ...msg,
              parts: Array.isArray(msg.parts)
                ? msg.parts.map((part: any) => {
                    if (
                      part?.type === 'tool-call' &&
                      (typeof part.args !== 'object' ||
                        part.args === null ||
                        Array.isArray(part.args))
                    ) {
                      return { ...part, args: {} };
                    }
                    return part;
                  })
                : msg.parts,
            }))
          : rawMessages;

        let jiraSettings = null;
        let githubSettings = null;
        if (userId) {
          const { getUserSettings, toJiraSettings, toGitHubSettings } =
            await import('@/services/user-settings');
          const settings = await getUserSettings(userId);
          jiraSettings = toJiraSettings(settings);
          githubSettings = toGitHubSettings(settings);
        }

        try {
          const { chat, toHttpResponse } = await import('@tanstack/ai');
          const { buildChatOptions } = await import('@/services/chat');
          const options = await buildChatOptions(
            messages,
            conversationId,
            userId,
            jiraSettings,
            githubSettings,
          );
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
