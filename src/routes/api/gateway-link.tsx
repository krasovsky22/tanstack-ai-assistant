import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/gateway-link')({
  server: {
    handlers: {
      POST: async () => {
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { createLinkingCode } = await import('@/services/gateway-identity');
        const row = await createLinkingCode(userId);
        return new Response(JSON.stringify({ code: row.code, expiresAt: row.expiresAt }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      },

      PUT: async ({ request }) => {
        const { code, provider, chatId } = await request.json() as {
          code: string;
          provider: string;
          chatId: string;
        };

        if (!code || !provider || !chatId) {
          return new Response(JSON.stringify({ error: 'code, provider, chatId required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { redeemLinkingCode } = await import('@/services/gateway-identity');
        const result = await redeemLinkingCode(code, provider, String(chatId));
        return new Response(JSON.stringify({ message: result.message, success: result.success }), {
          status: result.success ? 200 : 400,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
