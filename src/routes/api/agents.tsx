import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/agents')({
  server: {
    handlers: {
      GET: async () => {
        const { db } = await import('@/db');
        const { agents } = await import('@/db/schema');
        const { asc } = await import('drizzle-orm');
        const rows = await db.select().from(agents).orderBy(asc(agents.createdAt));
        return new Response(JSON.stringify(rows), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },

      POST: async ({ request }) => {
        const { db } = await import('@/db');
        const { agents } = await import('@/db/schema');
        const body = (await request.json()) as {
          name?: string;
          model?: string;
          maxIterations?: number;
          systemPrompt?: string;
          isDefault?: boolean;
        };

        const { name, model, maxIterations = 10, systemPrompt = '', isDefault = false } = body;

        if (!name || !model) {
          return new Response(JSON.stringify({ error: 'name and model are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const apiKey = crypto.randomUUID();

        if (isDefault) {
          await db.update(agents).set({ isDefault: false });
        }

        const [created] = await db
          .insert(agents)
          .values({ name, model, maxIterations, systemPrompt, isDefault, apiKey })
          .returning();

        return new Response(JSON.stringify(created), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
