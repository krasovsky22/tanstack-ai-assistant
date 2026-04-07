import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/gateway/widget/')({
  component: () => null,
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { handleWidgetPost } = await import('@/services/widget');
        return handleWidgetPost(request);
      },
      POST: async ({ request }) => {
        const { handleWidgetPost } = await import('@/services/widget');
        return handleWidgetPost(request);
      },
    },
  },
});
