import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/knowledge-base/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { db } = await import('@/db');
        const { knowledgebaseFiles } = await import('@/db/schema');
        const { desc, ilike, eq, and } = await import('drizzle-orm');

        const url = new URL(request.url);
        const search = url.searchParams.get('search');
        const agentId = url.searchParams.get('agentId');

        const conditions: ReturnType<typeof eq>[] = [];

        if (search) {
          conditions.push(ilike(knowledgebaseFiles.originalName, `%${search}%`) as ReturnType<typeof eq>);
        }
        if (agentId) {
          conditions.push(eq(knowledgebaseFiles.agentId, agentId));
        }

        let query = db.select().from(knowledgebaseFiles).$dynamic();

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        const rows = await query.orderBy(desc(knowledgebaseFiles.createdAt));
        return new Response(JSON.stringify(rows), {
          headers: { 'Content-Type': 'application/json' },
        });
      },

      POST: async ({ request }) => {
        const contentType = request.headers.get('content-type') ?? '';
        if (!contentType.includes('multipart/form-data')) {
          return new Response(JSON.stringify({ error: 'Expected multipart/form-data' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file || file.size === 0) {
          return new Response(JSON.stringify({ error: 'No file provided' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const agentId = formData.get('agentId') as string | null;

        const { detectMimeType, saveKnowledgeBaseFile, analyzeDocumentWithLLM } =
          await import('@/services/knowledge-base');
        const { db } = await import('@/db');
        const { knowledgebaseFiles } = await import('@/db/schema');
        const { indexKnowledgeBaseFile } = await import('@/services/memory');

        const buffer = Buffer.from(await file.arrayBuffer());
        const mimeType = detectMimeType(file.name, file.type);

        const { filename, filePath, content } = await saveKnowledgeBaseFile(
          buffer,
          file.name,
          mimeType,
        );

        // LLM analysis — runs in parallel with nothing else, so await before insert
        const { categories, summary } = await analyzeDocumentWithLLM(content, file.name);

        const [row] = await db
          .insert(knowledgebaseFiles)
          .values({
            filename,
            originalName: file.name,
            categories,
            summary,
            mimeType,
            sizeBytes: file.size,
            filePath,
            agentId: agentId ?? null,
          })
          .returning();

        indexKnowledgeBaseFile(row.id, filename, file.name, categories, content, mimeType);

        return new Response(JSON.stringify(row), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
