import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/gateway-identities')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const provider = url.searchParams.get('provider');
        const chatId = url.searchParams.get('chatId');

        // Public resolve endpoint for gateway worker
        if (provider && chatId) {
          const { resolveGatewayIdentity } = await import('@/services/gateway-identity');
          const result = await resolveGatewayIdentity(provider, chatId);
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Authenticated list endpoint
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { getGatewayIdentitiesForUser } = await import('@/services/gateway-identity');
        const identities = await getGatewayIdentitiesForUser(userId);
        return new Response(JSON.stringify(identities), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      DELETE: async ({ request }) => {
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { id } = await request.json() as { id: string };
        if (!id) {
          return new Response(JSON.stringify({ error: 'id required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { deleteGatewayIdentity } = await import('@/services/gateway-identity');
        await deleteGatewayIdentity(id, userId);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
