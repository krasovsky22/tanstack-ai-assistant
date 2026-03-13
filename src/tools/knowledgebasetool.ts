import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

export function getKnowledgeBaseTools() {
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
  ];
}
