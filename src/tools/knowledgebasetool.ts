import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

export function getKnowledgeBaseTools(agentId?: string | null) {
  return [
    toolDefinition({
      name: 'search_knowledge_base',
      description:
        'Search the knowledge base for relevant content. ' +
        'Use this before answering any user question — it searches uploaded documents. ' +
        'Returns snippets from matching documents (source: knowledge_base).',
      inputSchema: z.object({
        query: z
          .string()
          .describe('The search query to find relevant knowledge base content'),
      }),
    }).server(async ({ query }) => {
      const { searchKnowledgeBase } = await import('@/services/memory');
      const kbResults = await searchKnowledgeBase(query);

      const results: Array<Record<string, unknown>> = kbResults.map((r) => ({
        source: 'knowledge_base',
        filename: r.originalName,
        categories: r.categories,
        relevance_score: r.score,
        content_snippet: r.snippet,
      }));

      if (results.length === 0) {
        return { results: [], message: 'No relevant knowledge base content found.' };
      }

      return { results };
    }),

    toolDefinition({
      name: 'list_knowledge_base_files',
      description:
        'List files in the knowledge base available to this agent. ' +
        'Returns filenames, categories, and summaries.',
      inputSchema: z.object({}),
    }).server(async () => {
      const { db } = await import('@/db');
      const { knowledgebaseFiles } = await import('@/db/schema');
      const { desc, eq, isNull, or } = await import('drizzle-orm');
      const rows = await db
        .select({
          id: knowledgebaseFiles.id,
          originalName: knowledgebaseFiles.originalName,
          categories: knowledgebaseFiles.categories,
          summary: knowledgebaseFiles.summary,
          createdAt: knowledgebaseFiles.createdAt,
        })
        .from(knowledgebaseFiles)
        .where(
          agentId
            ? or(eq(knowledgebaseFiles.agentId, agentId), isNull(knowledgebaseFiles.agentId))
            : isNull(knowledgebaseFiles.agentId),
        )
        .orderBy(desc(knowledgebaseFiles.createdAt))
        .limit(50);
      return rows;
    }),
  ];
}
