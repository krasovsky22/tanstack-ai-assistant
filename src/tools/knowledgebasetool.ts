import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

export function getKnowledgeBaseTools() {
  return [
    toolDefinition({
      name: 'search_knowledge_base',
      description:
        'Search the knowledge base for relevant document content. ' +
        'Use this when the user asks a question that may be answered by uploaded documents, ' +
        'or when you need to reference specific knowledge that may be in a document. ' +
        'Returns snippets from matching documents with their categories and filename.',
      inputSchema: z.object({
        query: z
          .string()
          .describe('The search query to find relevant knowledge base content'),
      }),
    }).server(async ({ query }) => {
      const { searchKnowledgeBase } = await import('@/services/memory');
      const results = await searchKnowledgeBase(query);

      if (results.length === 0) {
        return {
          results: [],
          message: 'No relevant knowledge base documents found.',
        };
      }

      return {
        results: results.map((r) => ({
          filename: r.originalName,
          categories: r.categories,
          relevance_score: r.score,
          content_snippet: r.snippet,
        })),
      };
    }),
  ];
}
