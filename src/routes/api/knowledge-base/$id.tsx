import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/knowledge-base/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { db } = await import('@/db');
        const { knowledgebaseFiles } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');

        const [row] = await db
          .select()
          .from(knowledgebaseFiles)
          .where(eq(knowledgebaseFiles.id, params.id))
          .limit(1);

        if (!row) {
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Read extracted text from disk for preview
        let content = '';
        try {
          const { readKnowledgeBaseFileContent } = await import('@/services/knowledge-base');
          content = await readKnowledgeBaseFileContent(row.filePath, row.mimeType);
        } catch {
          content = '[Content not available]';
        }

        return new Response(
          JSON.stringify({ ...row, content }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      },

      PATCH: async ({ request, params }) => {
        const { db } = await import('@/db');
        const { knowledgebaseFiles } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');

        const body = await request.json();

        // Accept either categories (array) or a single category string for convenience
        let categories: string[] | undefined;
        if (Array.isArray(body.categories)) {
          categories = (body.categories as string[]).map((c: string) => c.trim()).filter(Boolean);
        } else if (typeof body.category === 'string') {
          categories = [body.category.trim()].filter(Boolean);
        }

        if (!categories || categories.length === 0) {
          return new Response(JSON.stringify({ error: 'categories is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const [row] = await db
          .update(knowledgebaseFiles)
          .set({ categories, updatedAt: new Date() })
          .where(eq(knowledgebaseFiles.id, params.id))
          .returning();

        if (!row) {
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Re-index with updated categories (non-fatal)
        try {
          const { readKnowledgeBaseFileContent } = await import('@/services/knowledge-base');
          const { indexKnowledgeBaseFile } = await import('@/services/memory');
          const content = await readKnowledgeBaseFileContent(row.filePath, row.mimeType);
          indexKnowledgeBaseFile(row.id, row.filename, row.originalName, categories, content, row.mimeType);
        } catch {
          // Non-fatal
        }

        return new Response(JSON.stringify(row), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      DELETE: async ({ params }) => {
        const { db } = await import('@/db');
        const { knowledgebaseFiles } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');

        const [row] = await db
          .delete(knowledgebaseFiles)
          .where(eq(knowledgebaseFiles.id, params.id))
          .returning();

        if (!row) {
          return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { deleteKnowledgeBaseFile } = await import('@/services/knowledge-base');
        const { deleteKnowledgeBaseMemory } = await import('@/services/memory');

        await deleteKnowledgeBaseFile(row.filePath);
        await deleteKnowledgeBaseMemory(row.id);

        return new Response(null, { status: 204 });
      },
    },
  },
});
