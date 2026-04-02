import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/tools')({
  server: {
    handlers: {
      GET: async () => {
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;

        let jiraSettings = null;
        let githubSettings = null;
        if (userId) {
          const { getUserSettings, toJiraSettings, toGitHubSettings } = await import('@/services/user-settings');
          const settings = await getUserSettings(userId);
          jiraSettings = toJiraSettings(settings);
          githubSettings = toGitHubSettings(settings);
        }

        const { buildChatOptions } = await import('@/services/chat');
        const options = await buildChatOptions([], undefined, userId, jiraSettings, githubSettings);
        const tools = options.tools.map((t: { name: string; description?: string }) => ({
          name: t.name,
          description: t.description ?? '',
        }));
        return Response.json({ tools });
      },
    },
  },
});
