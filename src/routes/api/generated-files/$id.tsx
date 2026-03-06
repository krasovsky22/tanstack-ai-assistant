import { createFileRoute } from '@tanstack/react-router';
import { unlink } from 'fs/promises';

export const Route = createFileRoute('/api/generated-files/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { db } = await import('@/db');
        const { generatedFiles } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');

        const [row] = await db
          .select()
          .from(generatedFiles)
          .where(eq(generatedFiles.id, params.id));

        if (!row) {
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(row), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      DELETE: async ({ params }) => {
        const { db } = await import('@/db');
        const { generatedFiles } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');

        const [row] = await db
          .select()
          .from(generatedFiles)
          .where(eq(generatedFiles.id, params.id));

        if (!row) {
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Delete from filesystem (ignore if already gone)
        await unlink(row.filePath).catch(() => {});

        await db
          .delete(generatedFiles)
          .where(eq(generatedFiles.id, params.id));

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
