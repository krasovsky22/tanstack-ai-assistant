import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/tools')({
  server: {
    handlers: {
      GET: async () => {
        const { buildChatOptions } = await import('@/services/chat');
        const options = await buildChatOptions([]);
        const tools = options.tools.map((t: { name: string; description?: string }) => ({
          name: t.name,
          description: t.description ?? '',
        }));
        return Response.json({ tools });
      },
    },
  },
});
