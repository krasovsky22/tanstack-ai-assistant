import { Client, estypes } from '@elastic/elasticsearch';

let _client: Client | null = null;

export function getEsClient(): Client {
  if (!_client) {
    _client = new Client({
      node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
    });
  }
  return _client;
}

export async function ensureIndices(): Promise<void> {
  const client = getEsClient();
  const indices: Array<{ index: string; mappings: estypes.MappingTypeMapping }> = [
    {
      index: 'memory_conversations',
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
      index: 'memory_jobs',
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
      index: 'memory_cronjob_results',
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
      index: 'memory_generated_files',
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
  try {
    await getEsClient().index({ index, id, document });
  } catch (err) {
    console.error(`[elasticsearch] Failed to index ${index}/${id}:`, err);
    // Never re-throw — ES is supplementary, Postgres is source of truth
  }
}

function buildSnippet(source: Record<string, unknown>): string {
  const sourceType = source.source_type as string | undefined;
  if (sourceType === 'conversation') {
    return String(source.messageSnippet ?? source.title ?? '').slice(0, 300);
  }
  if (sourceType === 'job') {
    return String(source.description ?? source.title ?? '').slice(0, 300);
  }
  if (sourceType === 'cronjob_result') {
    return String(source.result ?? source.error ?? source.cronjobName ?? '').slice(0, 300);
  }
  if (sourceType === 'generated_file') {
    return String(source.content ?? source.filename ?? '').slice(0, 300);
  }
  return String(source.title ?? source.filename ?? source.cronjobName ?? '').slice(0, 300);
}

const INDEX_MAP: Record<string, string> = {
  conversation: 'memory_conversations',
  job: 'memory_jobs',
  cronjob_result: 'memory_cronjob_results',
  generated_file: 'memory_generated_files',
};

export async function searchMemory(
  query: string,
  sourceType: string,
): Promise<Array<{ source_type: string; snippet: string; score: number | null; timestamp: string | null }>> {
  const indices =
    sourceType === 'all'
      ? Object.values(INDEX_MAP)
      : [INDEX_MAP[sourceType] ?? 'memory_conversations'];

  try {
    const client = getEsClient();
    const results = await client.search({
      index: indices.join(','),
      body: {
        size: 7,
        query: {
          multi_match: {
            query,
            fields: ['title^2', 'content', 'description', 'result', 'messageSnippet', 'cronjobName'],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        },
        _source: true,
      },
    });

    return results.hits.hits.map((hit) => {
      const src = (hit._source ?? {}) as Record<string, unknown>;
      return {
        source_type: String(src.source_type ?? hit._index),
        snippet: buildSnippet(src),
        score: hit._score ?? null,
        timestamp: String(src.createdAt ?? src.ranAt ?? ''),
      };
    });
  } catch (err) {
    console.error('[elasticsearch] searchMemory failed:', err);
    return [];
  }
}
