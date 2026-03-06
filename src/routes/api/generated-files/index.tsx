import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/generated-files/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { db } = await import('@/db');
        const { generatedFiles } = await import('@/db/schema');
        const { desc, ilike, or } = await import('drizzle-orm');

        const url = new URL(request.url);
        const search = url.searchParams.get('search') ?? '';

        const rows = await db
          .select()
          .from(generatedFiles)
          .where(search ? or(ilike(generatedFiles.filename, `%${search}%`)) : undefined)
          .orderBy(desc(generatedFiles.createdAt));

        return new Response(JSON.stringify(rows), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
