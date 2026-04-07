import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/agents/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { db } = await import('@/db');
        const { agents } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        const rows = await db.select().from(agents).where(eq(agents.id, params.id)).limit(1);
        if (!rows[0]) {
          return new Response(JSON.stringify({ error: 'Agent not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify(rows[0]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },

      PUT: async ({ request, params }) => {
        const { db } = await import('@/db');
        const { agents } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');

        const body = (await request.json()) as {
          name?: string;
          model?: string;
          maxIterations?: number;
          systemPrompt?: string;
          isDefault?: boolean;
        };

        const { name, model, maxIterations, systemPrompt, isDefault } = body;

        // Only clear other defaults when explicitly setting isDefault=true
        if (isDefault === true) {
          await db.update(agents).set({ isDefault: false });
        }

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (name !== undefined) updates.name = name;
        if (model !== undefined) updates.model = model;
        if (maxIterations !== undefined) updates.maxIterations = maxIterations;
        if (systemPrompt !== undefined) updates.systemPrompt = systemPrompt;
        if (isDefault !== undefined) updates.isDefault = isDefault;

        const [updated] = await db
          .update(agents)
          .set(updates)
          .where(eq(agents.id, params.id))
          .returning();

        if (!updated) {
          return new Response(JSON.stringify({ error: 'Agent not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(updated), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },

      DELETE: async ({ params }) => {
        const { db } = await import('@/db');
        const { agents } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        await db.delete(agents).where(eq(agents.id, params.id));
        return new Response(null, { status: 204 });
      },
    },
  },
});
