import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

export function getMemoryTools() {
  return [
    toolDefinition({
      name: 'search_memory',
      description:
        'Search past conversations, job records, cronjob results, and generated files ' +
        'for context relevant to the current task. Use this when you need to recall ' +
        'something that may have been discussed or generated previously.',
      inputSchema: z.object({
        query: z.string().describe('Full-text search query'),
        source_type: z
          .enum(['conversation', 'job', 'cronjob_result', 'generated_file', 'all'])
          .optional()
          .default('all')
          .describe('Narrow results to a specific data type, or "all" for cross-type search'),
      }),
    }).server(async ({ query, source_type }) => {
      const { searchMemory } = await import('@/services/elasticsearch');
      return searchMemory(query, source_type ?? 'all');
    }),
  ];
}
