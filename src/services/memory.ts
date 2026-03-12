import {
  indexDocument,
  deleteDocument,
  getEsClient,
  ensureInitialized,
  ES_INDICES,
  ES_SOURCE_TYPES,
} from '@/services/elasticsearch';

export { ES_INDICES, ES_SOURCE_TYPES };

// ─── Conversation ─────────────────────────────────────────────────────────────

export async function deleteConversationMemory(conversationId: string): Promise<void> {
  await deleteDocument(ES_INDICES.conversations, conversationId);
}

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

// ─── Knowledge Base ───────────────────────────────────────────────────────────

export function indexKnowledgeBaseFile(
  fileId: string,
  filename: string,
  originalName: string,
  categories: string[],
  content: string,
  mimeType: string,
): void {
  void indexDocument(ES_INDICES.knowledgeBase, fileId, {
    fileId,
    filename,
    originalName,
    categories,
    categoriesText: categories.join(' '),
    content,
    mimeType,
    source_type: ES_SOURCE_TYPES.knowledgeBase,
    createdAt: new Date().toISOString(),
  });
}

export async function deleteKnowledgeBaseMemory(fileId: string): Promise<void> {
  await deleteDocument(ES_INDICES.knowledgeBase, fileId);
}

export async function searchKnowledgeBase(
  query: string,
  category?: string,
): Promise<Array<{ fileId: string; filename: string; originalName: string; categories: string[]; snippet: string; score: number | null }>> {
  await ensureInitialized();
  try {
    const client = getEsClient();
    const filter = category ? [{ term: { 'categories.keyword': category } }] : [];
    const results = await client.search({
      index: ES_INDICES.knowledgeBase,
      body: {
        size: 5,
        query: {
          bool: {
            must: {
              multi_match: {
                query,
                fields: ['originalName^2', 'categoriesText^2', 'content', 'filename'],
                type: 'best_fields',
                fuzziness: 'AUTO',
              },
            },
            ...(filter.length ? { filter } : {}),
          },
        },
        _source: true,
        highlight: {
          fields: { content: { fragment_size: 300, number_of_fragments: 1 } },
        },
      },
    });

    return results.hits.hits.map((hit) => {
      const src = (hit._source ?? {}) as Record<string, unknown>;
      const highlight = (hit.highlight?.content?.[0]) ?? String(src.content ?? '').slice(0, 300);
      const cats = Array.isArray(src.categories) ? (src.categories as string[]) : [];
      return {
        fileId: String(src.fileId ?? hit._id),
        filename: String(src.filename ?? ''),
        originalName: String(src.originalName ?? ''),
        categories: cats,
        snippet: highlight,
        score: hit._score ?? null,
      };
    });
  } catch (err) {
    console.error('[memory] searchKnowledgeBase failed:', err);
    return [];
  }
}

// ─── Jira Ticket ──────────────────────────────────────────────────────────────

export interface JiraTicketRecord {
  ticketKey: string;
  ticketId: string;
  summary: string;
  description?: string;
  status?: string;
  assignee?: string;
  issueType?: string;
  priority?: string;
  projectKey?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function indexJiraTicket(ticket: JiraTicketRecord): void {
  void indexDocument(ES_INDICES.jiraTickets, ticket.ticketKey, {
    ticketKey: ticket.ticketKey,
    ticketId: ticket.ticketId,
    summary: ticket.summary,
    description: ticket.description ?? '',
    status: ticket.status ?? '',
    assignee: ticket.assignee ?? '',
    issueType: ticket.issueType ?? '',
    priority: ticket.priority ?? '',
    projectKey: ticket.projectKey ?? ticket.ticketKey.split('-')[0] ?? '',
    source_type: ES_SOURCE_TYPES.jiraTicket,
    createdAt: ticket.createdAt ?? new Date().toISOString(),
    updatedAt: ticket.updatedAt ?? new Date().toISOString(),
  });
}

export async function searchJiraMemory(
  query: string,
): Promise<Array<{ ticketKey: string; summary: string; description: string; status: string; snippet: string; score: number | null }>> {
  await ensureInitialized();
  try {
    const client = getEsClient();
    const results = await client.search({
      index: ES_INDICES.jiraTickets,
      body: {
        size: 5,
        query: {
          multi_match: {
            query,
            fields: ['ticketKey^3', 'summary^2', 'description', 'status', 'assignee', 'issueType'],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        },
        _source: true,
        highlight: {
          fields: { description: { fragment_size: 300, number_of_fragments: 1 } },
        },
      },
    });

    return results.hits.hits.map((hit) => {
      const src = (hit._source ?? {}) as Record<string, unknown>;
      const highlight = hit.highlight?.description?.[0] ?? String(src.description ?? '').slice(0, 300);
      return {
        ticketKey: String(src.ticketKey ?? hit._id),
        summary: String(src.summary ?? ''),
        description: String(src.description ?? ''),
        status: String(src.status ?? ''),
        snippet: highlight,
        score: hit._score ?? null,
      };
    });
  } catch (err) {
    console.error('[memory] searchJiraMemory failed:', err);
    return [];
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────

const INDEX_MAP: Record<string, string> = {
  [ES_SOURCE_TYPES.conversation]: ES_INDICES.conversations,
  [ES_SOURCE_TYPES.job]: ES_INDICES.jobs,
  [ES_SOURCE_TYPES.cronjobResult]: ES_INDICES.cronjobResults,
  [ES_SOURCE_TYPES.generatedFile]: ES_INDICES.generatedFiles,
  [ES_SOURCE_TYPES.jiraTicket]: ES_INDICES.jiraTickets,
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
  if (sourceType === ES_SOURCE_TYPES.jiraTicket) {
    const key = source.ticketKey ? `[${source.ticketKey}] ` : '';
    return `${key}${String(source.summary ?? '')} — ${String(source.description ?? '').slice(0, 200)}`.slice(0, 300);
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
            fields: ['title^2', 'content', 'description', 'result', 'messageSnippet', 'cronjobName', 'summary^2', 'ticketKey^3'],
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
