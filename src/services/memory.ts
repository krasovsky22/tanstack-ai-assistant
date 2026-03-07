import {
  indexDocument,
  getEsClient,
  ensureInitialized,
  ES_INDICES,
  ES_SOURCE_TYPES,
} from '@/services/elasticsearch';

export { ES_INDICES, ES_SOURCE_TYPES };

// ─── Conversation ─────────────────────────────────────────────────────────────

export function indexConversationMemory(
  conversationId: string,
  title: string,
  source: string | null,
  messages: Array<{ parts: unknown }>,
): void {
  const snippet = messages
    .flatMap((m) => (m.parts as Array<{ type: string; text?: string; content?: string }>))
    .filter((p) => p.type === 'text')
    .map((p) => p.text ?? p.content ?? '')
    .join(' ')
    .slice(0, 2000);
  void indexDocument(ES_INDICES.conversations, conversationId, {
    conversationId,
    title,
    source,
    messageSnippet: snippet,
    source_type: ES_SOURCE_TYPES.conversation,
    createdAt: new Date().toISOString(),
  });
}

// ─── Job ──────────────────────────────────────────────────────────────────────

interface JobRecord {
  id: string;
  title: string;
  company: string;
  description: string;
  skills: unknown;
  status: string;
  createdAt: Date;
}

export function indexJob(job: JobRecord): void {
  void indexDocument(ES_INDICES.jobs, job.id, {
    jobId: job.id,
    title: job.title,
    company: job.company,
    description: job.description,
    skills: Array.isArray(job.skills) ? job.skills.join(' ') : '',
    status: job.status,
    source_type: ES_SOURCE_TYPES.job,
    createdAt: job.createdAt.toISOString(),
  });
}

// ─── Generated File ───────────────────────────────────────────────────────────

export function indexGeneratedFile(
  fileId: string,
  filename: string,
  content: string,
  mimeType: string,
): void {
  void indexDocument(ES_INDICES.generatedFiles, fileId, {
    fileId,
    filename,
    content,
    mimeType,
    source_type: ES_SOURCE_TYPES.generatedFile,
    createdAt: new Date().toISOString(),
  });
}

// ─── Cronjob Result ───────────────────────────────────────────────────────────

export function indexCronjobResult(
  logId: string,
  cronjobId: string,
  cronjobName: string,
  result: string | null,
  error: string | null,
  status: string,
): void {
  void indexDocument(ES_INDICES.cronjobResults, logId, {
    logId,
    cronjobId,
    cronjobName,
    result,
    error,
    status,
    source_type: ES_SOURCE_TYPES.cronjobResult,
    ranAt: new Date().toISOString(),
  });
}

// ─── Search ───────────────────────────────────────────────────────────────────

const INDEX_MAP: Record<string, string> = {
  [ES_SOURCE_TYPES.conversation]: ES_INDICES.conversations,
  [ES_SOURCE_TYPES.job]: ES_INDICES.jobs,
  [ES_SOURCE_TYPES.cronjobResult]: ES_INDICES.cronjobResults,
  [ES_SOURCE_TYPES.generatedFile]: ES_INDICES.generatedFiles,
};

function buildSnippet(source: Record<string, unknown>): string {
  const sourceType = source.source_type as string | undefined;
  if (sourceType === ES_SOURCE_TYPES.conversation) {
    return String(source.messageSnippet ?? source.title ?? '').slice(0, 300);
  }
  if (sourceType === ES_SOURCE_TYPES.job) {
    return String(source.description ?? source.title ?? '').slice(0, 300);
  }
  if (sourceType === ES_SOURCE_TYPES.cronjobResult) {
    return String(source.result ?? source.error ?? source.cronjobName ?? '').slice(0, 300);
  }
  if (sourceType === ES_SOURCE_TYPES.generatedFile) {
    return String(source.content ?? source.filename ?? '').slice(0, 300);
  }
  return String(source.title ?? source.filename ?? source.cronjobName ?? '').slice(0, 300);
}

export async function searchMemory(
  query: string,
  sourceType: string,
): Promise<Array<{ source_type: string; snippet: string; score: number | null; timestamp: string | null }>> {
  const indices =
    sourceType === 'all'
      ? Object.values(INDEX_MAP)
      : [INDEX_MAP[sourceType] ?? ES_INDICES.conversations];

  await ensureInitialized();
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
    console.error('[memory] searchMemory failed:', err);
    return [];
  }
}
