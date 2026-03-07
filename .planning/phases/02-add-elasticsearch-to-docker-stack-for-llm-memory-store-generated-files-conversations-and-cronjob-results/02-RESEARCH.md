# Phase 2: Elasticsearch LLM Memory - Research

**Researched:** 2026-03-07
**Domain:** Elasticsearch 8.x + Node.js TypeScript integration, Docker Compose service addition, LLM tool definition
**Confidence:** HIGH (official docs + direct codebase inspection)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Elasticsearch is a secondary search/retrieval index on top of Postgres — Postgres stays as source of truth
- No data migration; ES supplements Postgres, does not replace it for any entity
- New data only — no backfill of existing Postgres records on first run
- All four data types indexed: conversations + messages, cronjob results, generated file content, job records
- `search_memory` tool added to the existing tool-calling system (alongside `list_cronjobs`, MCP tools in `src/tools/`)
- LLM decides when to invoke `search_memory` — NOT auto-injected into system prompt
- Search type: full-text keyword search (standard ES `multi_match` or `query_string`) — NO vector embeddings
- Returns top N results (5–10) with summaries, not full document content
- Each result includes: `source_type` (conversation | job | cronjob_result | generated_file), short text snippet, timestamp

### Claude's Discretion
- ES index names and field mapping design
- Document ID strategy (use Postgres UUID where available)
- Exact N for top-N results (5-10 range)
- Write path timing (synchronous dual-write vs. async after Postgres write)
- ES Dockerfile/image version choice
- Tool description and search field list

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

## Summary

This phase adds Elasticsearch as a Docker Compose service alongside the existing `postgres` service, then wires four write hooks (conversation save, job create/update, cronjob log insert, resume generation) to index data into ES. A `search_memory` LLM tool is registered in `buildChatOptions()` so the agent can do full-text retrieval of its own history.

The Node.js client to use is `@elastic/elasticsearch` 8.x (latest 8.19.x family), matched to the Elasticsearch 8.19.x Docker image. The 9.x client targets ES 9.x; since this project runs a self-hosted Docker container, pinning both server and client to 8.19 avoids any forward-compatibility surprises. ES requires no persistent auth in a single-node dev setup — `xpack.security.enabled=false` is the standard dev approach used in the official Elastic guides and community.

**Primary recommendation:** Add ES 8.19 Docker service + `@elastic/elasticsearch@8` client. Create `src/services/elasticsearch.ts` as the single client + indexing module. Hook it into the four existing write paths synchronously (fire-and-forget, log errors, never throw). Register the `search_memory` tool in `src/tools/memory.ts` following the existing `toolDefinition` pattern.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@elastic/elasticsearch` | `^8.19.0` | Official Node.js client for ES 8.x | Same major as server; ships TypeScript types; official client |
| `docker.elastic.co/elasticsearch/elasticsearch` | `8.19.12` | ES server image | Latest 8.x stable as of March 2026 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | already in project | Input validation for `search_memory` tool schema | Already used in crontool pattern |
| `node:fs/promises` | built-in | Read generated `.md` files for content extraction | Already used in `generate-resume.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@elastic/elasticsearch@8` | `@elastic/elasticsearch@9` | v9 targets ES 9.x server; would require upgrading the Docker image too — unnecessary complexity |
| ES `multi_match` | PG full-text (`tsvector`) | Postgres FTS is viable but not the locked decision; ES provides richer cross-index search |
| Synchronous dual-write | Background queue / CDC | Queue adds infra complexity; fire-and-forget synchronous write with error logging is simpler and sufficient |

**Installation:**
```bash
pnpm add @elastic/elasticsearch@8
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   └── elasticsearch.ts    # ES client singleton + indexDocument() + searchMemory()
├── tools/
│   ├── memory.ts           # getMemoryTools() — search_memory toolDefinition
│   └── index.ts            # export getMemoryTools (add alongside getCronjobTools)
```

### Pattern 1: ES Client Singleton (lazy init)
**What:** Export a cached ES `Client` instance, instantiated once on first use.
**When to use:** Same pattern as `@/db` — avoids re-creating connections per request.
**Example:**
```typescript
// src/services/elasticsearch.ts
// Source: @elastic/elasticsearch official docs + existing @/db pattern in project

import { Client } from '@elastic/elasticsearch';

let _client: Client | null = null;

export function getEsClient(): Client {
  if (!_client) {
    _client = new Client({
      node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
    });
  }
  return _client;
}
```

### Pattern 2: Index Naming and Document Shape
**What:** One index per entity type, using the Postgres UUID as the ES document `_id`.
**When to use:** Applying this consistently prevents duplicate documents on re-index.

Recommended index names (Claude's discretion):
- `memory_conversations` — conversation + embedded message snippets
- `memory_jobs` — job listings
- `memory_cronjob_results` — cronjob log entries
- `memory_generated_files` — file text content

Document shapes (minimal, for full-text search):
```typescript
// conversation document
{
  conversationId: string;       // Postgres UUID
  title: string;
  source: string | null;        // 'telegram' | 'browser' | 'cronjob'
  messageSnippet: string;       // concatenated text parts, truncated to ~2000 chars
  createdAt: string;            // ISO timestamp
}

// job document
{
  jobId: string;
  title: string;
  company: string;
  description: string;          // full text
  skills: string;               // join array to space-separated string for FTS
  status: string;
  createdAt: string;
}

// cronjob result document
{
  logId: string;
  cronjobId: string;
  cronjobName: string;          // denormalized from cronjobs table
  result: string | null;
  error: string | null;
  status: string;
  ranAt: string;
}

// generated file document
{
  fileId: string;               // random UUID or job ID + filename
  filename: string;
  content: string;              // raw markdown text of the file
  mimeType: string;
  createdAt: string;
}
```

### Pattern 3: Indexing Helper (fire-and-forget)
**What:** Wrap `client.index()` in a helper that catches and logs errors but never throws.
**When to use:** Write hooks in existing handlers — ES failure must NEVER break the primary Postgres write.
```typescript
// Source: @elastic/elasticsearch docs, adapted to project pattern

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
```

### Pattern 4: search_memory Tool
**What:** `toolDefinition` following the exact same pattern as `getCronjobTools` in `src/tools/crontool.ts`.
**When to use:** Registered alongside other tools in `buildChatOptions()`.
```typescript
// src/tools/memory.ts
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
```

### Pattern 5: multi_match Search Query
**What:** ES `multi_match` query across text fields — returns top 7 results with source metadata.
```typescript
// Source: Elasticsearch Query DSL docs
export async function searchMemory(query: string, sourceType: string) {
  const indices =
    sourceType === 'all'
      ? ['memory_conversations', 'memory_jobs', 'memory_cronjob_results', 'memory_generated_files']
      : [`memory_${sourceType === 'conversation' ? 'conversations' : sourceType === 'job' ? 'jobs' : sourceType === 'cronjob_result' ? 'cronjob_results' : 'generated_files'}`];

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

  return results.hits.hits.map((hit) => ({
    source_type: (hit._source as Record<string, unknown>).source_type ?? hit._index,
    snippet: buildSnippet(hit._source as Record<string, unknown>),
    score: hit._score,
    timestamp: (hit._source as Record<string, unknown>).createdAt ?? (hit._source as Record<string, unknown>).ranAt,
  }));
}
```

### Anti-Patterns to Avoid
- **Throwing on ES failure:** Always swallow ES errors in the write path — Postgres is the truth
- **Using ES as auth store or source of truth:** ES documents are never read back for business logic, only for LLM context
- **Blocking the HTTP response on ES indexing:** Fire-and-forget or `void indexDocument(...)` — do not `await` in the critical path if latency is a concern
- **Using ES 9.x client with ES 8.x server:** Client major must match server major

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-text search | Postgres `ILIKE` across multiple tables | ES `multi_match` | ILIKE is O(n) table scan; ES is inverted index; cross-entity search in one query |
| ES type safety | Manual `any` casts | `@elastic/elasticsearch@8` built-in TypeScript types | Client ships full type definitions |
| ES connection pooling | Custom retry/reconnect | ES client handles this internally | Built-in connection pool, retry, and health check |
| Text extraction from markdown | Custom parser | Read file as UTF-8 string directly | Resumes are plain markdown — `fs.readFile('utf-8')` is sufficient |

**Key insight:** Elasticsearch's built-in connection management and client-side retry logic eliminate the need for any custom resilience code around ES calls.

---

## Common Pitfalls

### Pitfall 1: vm.max_map_count Too Low
**What goes wrong:** Elasticsearch container exits immediately with `max virtual memory areas vm.max_map_count [65530] is too low`
**Why it happens:** ES requires at least 262144; Linux default is 65530
**How to avoid:** Add to docker-compose.yml service under `elasticsearch`:
```yaml
    sysctls:
      - vm.max_map_count=262144
```
Or as a host one-time: `sysctl -w vm.max_map_count=262144`
**Warning signs:** Container exits within seconds of starting; `docker logs elasticsearch` shows the map count error.

### Pitfall 2: ES 8.x Security Enabled by Default
**What goes wrong:** Connecting without auth returns `401 Unauthorized`; the client throws; every indexing call fails.
**Why it happens:** ES 8.x has `xpack.security.enabled=true` by default (changed from 7.x).
**How to avoid:** In docker-compose.yml, set `xpack.security.enabled=false` and `xpack.security.enrollment.enabled=false` for development. Do not expose port 9200 externally.
**Warning signs:** Client logs `security_exception` or HTTP 401.

### Pitfall 3: Index Created With Wrong Mapping on First Insert
**What goes wrong:** ES auto-creates the index on first document write using dynamic mapping. Text fields that should be analyzed as full-text get mapped as `keyword` if the first value is short. Searches then miss results.
**Why it happens:** ES dynamic mapping infers `keyword` for short strings unless you specify `text`.
**How to avoid:** Explicitly create indices with mappings in a startup routine before any document writes. Run `client.indices.create()` with `{ mappings: { properties: { ... } } }` at service boot with `ignore: [400]` (ignore if index already exists).
**Warning signs:** `multi_match` queries return 0 hits despite documents existing.

### Pitfall 4: Workers Need ELASTICSEARCH_URL
**What goes wrong:** The `jobs` and `cron` workers call `src/services/elasticsearch.ts` but that module reads `process.env.ELASTICSEARCH_URL`. Workers run as separate Docker containers and won't have the var unless explicitly passed.
**Why it happens:** The docker-compose.yml `environment:` section for each worker service is separate from the `ui` service.
**How to avoid:** Add `ELASTICSEARCH_URL: http://elasticsearch:9200` to ALL service environment sections in docker-compose.yml (`ui`, `jobs`, `cron`). Also add the `elasticsearch` Docker network hostname consistently.

### Pitfall 5: Message `parts` is JSONB — Not a Plain String
**What goes wrong:** The `messages` table stores `parts` as a JSONB array (TanStack AI message format). Indexing `parts` directly gives a non-searchable object.
**Why it happens:** TanStack AI message parts can be `[{ type: 'text', text: '...' }]` — need to extract `.text` from each part.
**How to avoid:** In the conversation indexing hook, flatten parts to a string:
```typescript
const snippet = msgs
  .flatMap((m) => (m.parts as Array<{type:string;text?:string}>))
  .filter((p) => p.type === 'text')
  .map((p) => p.text ?? '')
  .join(' ')
  .slice(0, 2000);
```

### Pitfall 6: Indexing at Wrong Point in Resume Flow
**What goes wrong:** Attempting to index generated file content before `writeFile()` completes.
**Why it happens:** `runResumeGeneration()` in `src/services/generate-resume.ts` writes `resume.md` and `cover-letter.md` but does not return their content, only paths. The calling function `generateResumeForNextProcessedJob()` only gets paths back.
**How to avoid:** Index inside `runResumeGeneration()`, after `writeFile()` but before returning, where `result.updatedResume` and `result.coverLetter` strings are still in scope. Or re-read the file from disk after the function returns. The first approach is cleaner.

---

## Code Examples

Verified patterns from official sources and codebase inspection:

### Docker Compose ES Service (development, no security)
```yaml
# Source: official Elastic docs + community guides for single-node dev

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.19.12
    restart: unless-stopped
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - xpack.security.enrollment.enabled=false
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    sysctls:
      - vm.max_map_count=262144

volumes:
  postgres_data:
  elasticsearch_data:    # add this
```

### ES Index Creation with Mappings (run once at startup)
```typescript
// Source: @elastic/elasticsearch API reference
async function ensureIndices(client: Client): Promise<void> {
  const indices = [
    {
      index: 'memory_conversations',
      mappings: {
        properties: {
          conversationId: { type: 'keyword' },
          title: { type: 'text' },
          source: { type: 'keyword' },
          messageSnippet: { type: 'text' },
          createdAt: { type: 'date' },
        },
      },
    },
    // ... repeat for other indices
  ];

  for (const { index, mappings } of indices) {
    await client.indices.create({ index, mappings }, { ignore: [400] });
    // 400 = index already exists; safe to ignore
  }
}
```

### Registering the Tool in buildChatOptions()
```typescript
// src/services/chat.ts — add alongside existing tool registrations
import { getMemoryTools } from '@/tools/memory';

// Inside buildChatOptions():
const tools = [
  ...mcpTools,
  ...cronjobTools,
  ...newsApiTools,
  ...getUiBackendApiTools(),
  ...getFileTools(),
  ...getCmdTools(),
  ...getMemoryTools(),   // add this
];
```

---

## Write Hook Integration Points (Concrete)

Based on direct codebase inspection, these are the exact locations and approaches for each write hook:

| Data Type | Write Location | Integration Approach |
|-----------|---------------|---------------------|
| Conversations + messages | `src/services/chat.ts` — `saveConversationToDb()` and `appendMessagesToConversation()` | Call `indexDocument('memory_conversations', conversationId, doc)` after Postgres insert. Extract message text from parts array. |
| Job records | `src/routes/api/jobs/index.tsx` — POST handler | Call `indexDocument('memory_jobs', job.id, doc)` after `db.insert(jobs).returning()`. |
| Cronjob results | `workers/cron/index.ts` — `runCronjob()` | Call `indexDocument('memory_cronjob_results', logId, doc)` after `db.insert(cronjobLogs)`. Note: `logId` is the returned row's UUID. |
| Generated files | `src/services/generate-resume.ts` — `runResumeGeneration()` | Index `result.updatedResume` and `result.coverLetter` strings directly after `writeFile()` calls. Use `${job.id}-resume` and `${job.id}-cover-letter` as ES document IDs. |

**Workers and tsconfig:** The `tsconfig.worker.json` includes `src/services/**/*` — so `src/services/elasticsearch.ts` is available to `workers/jobs/` and `workers/cron/` without any tsconfig changes.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ES 7.x security off by default | ES 8.x security ON by default | ES 8.0 (2022) | Must explicitly set `xpack.security.enabled=false` for dev |
| ES client v7 (`@elastic/elasticsearch@7`) | ES client v8 (`@elastic/elasticsearch@8`) | 2022 | Breaking API changes; v8 ships full TypeScript types |
| `body:` wrapper in search calls (v7) | `body:` still valid but top-level params supported in v8 | v8.0 | Either style works in v8; `body:` is more widely documented |

**Current stable:** ES 8.19.12 server + `@elastic/elasticsearch` 8.x client (latest `8.19.x`). The npm `latest` tag is 9.3.4 (targets ES 9.x) — do NOT use for this project without upgrading the server image.

---

## Open Questions

1. **`vm.max_map_count` on WSL2**
   - What we know: The dev environment is WSL2 (confirmed by OS version in env). `sysctls` in docker-compose may not take effect on WSL2.
   - What's unclear: Whether Docker Desktop for Windows handles vm.max_map_count automatically or requires a manual `.wslconfig` entry.
   - Recommendation: Add a Wave 0 task to verify `sysctl vm.max_map_count` in the Docker environment. Fallback: set `bootstrap.memory_lock=false` and add a wsl config note.

2. **Conversation indexing granularity**
   - What we know: `saveConversationToDb()` creates a new conversation; `appendMessagesToConversation()` adds messages to existing ones. Both need to update the ES document.
   - What's unclear: Whether to use `client.index()` (upsert by `_id`) or `client.update()` for append operations.
   - Recommendation: Use `client.index()` with the conversation UUID as `_id` for both create and append — it upserts cleanly and re-indexes the full snippet.

3. **Generated file index for non-resume files**
   - What we know: The `generatedFiles` table exists in schema but the `generate-resume` flow doesn't insert into it — it only updates the `jobs` table.
   - What's unclear: Whether there are other paths that use `generatedFiles`.
   - Recommendation: For this phase, index only resume/cover-letter content directly from `runResumeGeneration()`. Ignore `generatedFiles` table as a trigger point.

---

## Validation Architecture

> `workflow.nyquist_validation` is absent from config — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (already installed) |
| Config file | `vitest.config.*` — none detected; uses `vite.config.*` discovery |
| Quick run command | `pnpm vitest run src/services/elasticsearch.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEM-01 | `getEsClient()` returns a singleton Client | unit | `pnpm vitest run src/services/elasticsearch.test.ts` | ❌ Wave 0 |
| MEM-02 | `indexDocument()` swallows errors, never throws | unit (mock ES) | `pnpm vitest run src/services/elasticsearch.test.ts` | ❌ Wave 0 |
| MEM-03 | `searchMemory()` returns shaped results with source_type + snippet + timestamp | unit (mock ES) | `pnpm vitest run src/services/elasticsearch.test.ts` | ❌ Wave 0 |
| MEM-04 | `getMemoryTools()` returns an array with a `search_memory` entry | unit | `pnpm vitest run src/tools/memory.test.ts` | ❌ Wave 0 |
| MEM-05 | ES service starts and responds to health check | smoke (manual/docker) | `curl http://localhost:9200/_cluster/health` | manual only |
| MEM-06 | `buildChatOptions()` includes memory tools | unit | `pnpm vitest run src/services/chat.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run src/services/elasticsearch.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/services/elasticsearch.test.ts` — covers MEM-01, MEM-02, MEM-03 (mock `@elastic/elasticsearch` Client)
- [ ] `src/tools/memory.test.ts` — covers MEM-04
- [ ] `src/services/chat.test.ts` — covers MEM-06 (may already exist; verify)

*(Vitest is already installed and configured — no framework install needed)*

---

## Sources

### Primary (HIGH confidence)
- `@elastic/elasticsearch` GitHub README — compatibility table: client v8.x targets ES 8.x; client v9.x targets ES 9.x; npm `latest` is 9.3.4 (released 2026-03-05)
- [Elasticsearch JavaScript Client Getting Started](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/getting-started-js.html) — client instantiation, `client.index()`, `client.search()` API
- Direct codebase read — `src/tools/crontool.ts`, `src/services/chat.ts`, `src/services/generate-resume.ts`, `workers/cron/index.ts`, `workers/jobs/index.ts`, `src/db/schema.ts`, `docker-compose.yml`, `tsconfig.worker.json`

### Secondary (MEDIUM confidence)
- [Elasticsearch Docker single-node docs](https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-basic) — `xpack.security.enabled=false`, `discovery.type=single-node`, image version `8.19.12`, `ES_JAVA_OPTS` pattern
- [Elasticsearch JavaScript Client API Reference 8.17](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html) — `client.indices.create()` with `ignore: [400]`, `client.search()` with `multi_match`

### Tertiary (LOW confidence)
- Community guides on `vm.max_map_count` on WSL2 — not verified against official Microsoft/Docker WSL2 docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry confirmed 8.x client, Elastic docs confirmed 8.19.12 image
- Architecture patterns: HIGH — derived directly from existing codebase patterns (`crontool.ts`, `chat.ts`) and official Elastic docs
- Write hook locations: HIGH — direct file reads of all four hook locations
- Pitfalls: HIGH for ES-specific ones (documented officially); MEDIUM for WSL2 vm.max_map_count (community sources only)
- Docker Compose config: HIGH — official Elastic Docker guide + community confirmation of `xpack.security.enabled=false`

**Research date:** 2026-03-07
**Valid until:** 2026-06-07 (stable library; ES 8.x supported until EOL 2025-05... check ES EOL before major version decisions)
