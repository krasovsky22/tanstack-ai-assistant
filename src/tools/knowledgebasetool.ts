import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

export function getKnowledgeBaseTools() {
  return [
    toolDefinition({
      name: 'search_knowledge_base',
      description:
        'Search the knowledge base and Jira ticket memory for relevant content. ' +
        'Use this before answering any user question — it searches both uploaded documents ' +
        'and previously seen Jira issues stored in memory. ' +
        'Returns snippets from matching documents (source: knowledge_base) and Jira tickets (source: jira_memory).',
      inputSchema: z.object({
        query: z
          .string()
          .describe('The search query to find relevant knowledge base content'),
      }),
    }).server(async ({ query }) => {
      const { searchKnowledgeBase, searchJiraMemory } = await import('@/services/memory');
      const [kbResults, jiraResults] = await Promise.all([
        searchKnowledgeBase(query),
        searchJiraMemory(query),
      ]);

      const results: Array<Record<string, unknown>> = [
        ...kbResults.map((r) => ({
          source: 'knowledge_base',
          filename: r.originalName,
          categories: r.categories,
          relevance_score: r.score,
          content_snippet: r.snippet,
        })),
        ...jiraResults.map((r) => ({
          source: 'jira_memory',
          ticket_key: r.ticketKey,
          summary: r.summary,
          status: r.status,
          relevance_score: r.score,
          content_snippet: r.snippet,
        })),
      ];

      if (results.length === 0) {
        return { results: [], message: 'No relevant knowledge base or Jira memory found.' };
      }

      return { results };
    }),
  ];
}
