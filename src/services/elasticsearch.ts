import { Client } from '@elastic/elasticsearch';
import type { estypes } from '@elastic/elasticsearch';

export const ES_INDICES = {
  conversations: 'memory_conversations',
  jobs: 'memory_jobs',
  cronjobResults: 'memory_cronjob_results',
  generatedFiles: 'memory_generated_files',
  knowledgeBase: 'knowledge_base',
  jiraTickets: 'memory_jira_tickets',
} as const;

export const ES_SOURCE_TYPES = {
  conversation: 'conversation',
  job: 'job',
  cronjobResult: 'cronjob_result',
  generatedFile: 'generated_file',
  knowledgeBase: 'knowledge_base',
  jiraTicket: 'jira_ticket',
} as const;

let _client: Client | null = null;
let _initPromise: Promise<void> | null = null;

export function getEsClient(): Client {
  if (!_client) {
    _client = new Client({
      node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
    });
  }
  return _client;
}

export function ensureInitialized(): Promise<void> {
  if (!_initPromise) {
    _initPromise = ensureIndices();
  }
  return _initPromise;
}

export async function ensureIndices(): Promise<void> {
  const client = getEsClient();
  const indices: Array<{ index: string; mappings: estypes.MappingTypeMapping }> = [
    {
      index: ES_INDICES.conversations,
      mappings: {
        properties: {
          conversationId: { type: 'keyword' },
          title: { type: 'text' },
          source: { type: 'keyword' },
          messageSnippet: { type: 'text' },
          source_type: { type: 'keyword' },
          createdAt: { type: 'date' },
        },
      },
    },
    {
      index: ES_INDICES.jobs,
      mappings: {
        properties: {
          jobId: { type: 'keyword' },
          title: { type: 'text' },
          company: { type: 'text' },
          description: { type: 'text' },
          skills: { type: 'text' },
          status: { type: 'keyword' },
          source_type: { type: 'keyword' },
          createdAt: { type: 'date' },
        },
      },
    },
    {
      index: ES_INDICES.cronjobResults,
      mappings: {
        properties: {
          logId: { type: 'keyword' },
          cronjobId: { type: 'keyword' },
          cronjobName: { type: 'text' },
          result: { type: 'text' },
          error: { type: 'text' },
          status: { type: 'keyword' },
          source_type: { type: 'keyword' },
          ranAt: { type: 'date' },
        },
      },
    },
    {
      index: ES_INDICES.generatedFiles,
      mappings: {
        properties: {
          fileId: { type: 'keyword' },
          filename: { type: 'text' },
          content: { type: 'text' },
          mimeType: { type: 'keyword' },
          source_type: { type: 'keyword' },
          createdAt: { type: 'date' },
        },
      },
    },
    {
      index: ES_INDICES.knowledgeBase,
      mappings: {
        properties: {
          fileId: { type: 'keyword' },
          filename: { type: 'text' },
          originalName: { type: 'text' },
          categories: { type: 'keyword' },
          categoriesText: { type: 'text' },
          content: { type: 'text' },
          mimeType: { type: 'keyword' },
          source_type: { type: 'keyword' },
          createdAt: { type: 'date' },
        },
      },
    },
    {
      index: ES_INDICES.jiraTickets,
      mappings: {
        properties: {
          ticketKey: { type: 'keyword' },
          ticketId: { type: 'keyword' },
          summary: { type: 'text' },
          description: { type: 'text' },
          status: { type: 'keyword' },
          assignee: { type: 'text' },
          issueType: { type: 'keyword' },
          priority: { type: 'keyword' },
          projectKey: { type: 'keyword' },
          source_type: { type: 'keyword' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
        },
      },
    },
  ];

  for (const { index, mappings } of indices) {
    try {
      await client.indices.create({ index, mappings });
    } catch (err: unknown) {
      // 400 / resource_already_exists_exception is safe to ignore — index already exists
      const errObj = err as Record<string, unknown>;
      const meta = errObj['meta'] as Record<string, unknown> | undefined;
      const statusCode = meta?.['statusCode'] as number | undefined;
      if (statusCode === 400) continue;
      console.error(`[elasticsearch] Failed to create index ${index}:`, err);
    }
  }
}

export async function indexDocument(
  index: string,
  id: string,
  document: Record<string, unknown>,
): Promise<void> {
  await ensureInitialized();
  try {
    await getEsClient().index({ index, id, document });
  } catch (err) {
    console.error(`[elasticsearch] Failed to index ${index}/${id}:`, err);
    // Never re-throw — ES is supplementary, Postgres is source of truth
  }
}

export async function deleteDocument(index: string, id: string): Promise<void> {
  await ensureInitialized();
  try {
    await getEsClient().delete({ index, id });
  } catch (err: unknown) {
    const errObj = err as Record<string, unknown>;
    const meta = errObj['meta'] as Record<string, unknown> | undefined;
    const statusCode = meta?.['statusCode'] as number | undefined;
    if (statusCode === 404) return; // already gone, not an error
    console.error(`[elasticsearch] Failed to delete ${index}/${id}:`, err);
  }
}

