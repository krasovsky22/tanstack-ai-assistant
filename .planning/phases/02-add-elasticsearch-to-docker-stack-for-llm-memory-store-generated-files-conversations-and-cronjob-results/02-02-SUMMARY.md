---
phase: 02-add-elasticsearch-to-docker-stack-for-llm-memory-store-generated-files-conversations-and-cronjob-results
plan: "02"
subsystem: elasticsearch-service
tags: [elasticsearch, memory, search, singleton, tdd]
dependency_graph:
  requires: ["02-01"]
  provides: ["02-03", "02-04", "02-05", "02-06"]
  affects: ["src/services/elasticsearch.ts", "src/tools/memory.ts"]
tech_stack:
  added: ["@elastic/elasticsearch@8.19.1"]
  patterns: ["lazy singleton", "fire-and-forget error swallowing", "multi-index search"]
key_files:
  created:
    - src/services/elasticsearch.ts
    - src/services/elasticsearch.test.ts
  modified:
    - package.json
    - pnpm-lock.yaml
decisions:
  - "estypes.MappingTypeMapping used for index definition type safety (avoids union inference issue with Record<string, MappingProperty>)"
  - "400 status handled via meta.statusCode check in catch block (ES 8.x ignore option not available in TypeScript types)"
  - "fire-and-forget pattern: indexDocument() never re-throws — ES is supplementary, Postgres is source of truth"
metrics:
  duration: "4 min"
  completed_date: "2026-03-07"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 02 Plan 02: Elasticsearch Service Module Summary

**One-liner:** Elasticsearch client singleton with lazy init, explicit-mapping index setup, fire-and-forget indexDocument, and multi_match searchMemory — all tested without a live ES server via Vitest mocks.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Write failing tests for elasticsearch service | f28267c | src/services/elasticsearch.test.ts |
| 1 (GREEN) | Implement src/services/elasticsearch.ts | f985cde | src/services/elasticsearch.ts, package.json, pnpm-lock.yaml |

## What Was Built

### src/services/elasticsearch.ts

Four exports implementing the ES memory layer:

1. **`getEsClient()`** — Lazy singleton `Client` instance using `ELASTICSEARCH_URL` env var (defaults to `http://localhost:9200`). Matches project's lazy-init pattern from `src/services/chat.ts`.

2. **`ensureIndices()`** — Creates all four `memory_*` indices with explicit `text`/`keyword`/`date` mappings on startup. Handles 400 (resource_already_exists) via `meta.statusCode` check in catch block. Prevents dynamic mapping pitfall where short strings map as `keyword`.

3. **`indexDocument(index, id, document)`** — Fire-and-forget write helper. Never re-throws. Logs failures with `[elasticsearch]` prefix. PostgreSQL remains source of truth.

4. **`searchMemory(query, sourceType)`** — Full-text `multi_match` across all or filtered `memory_*` indices. Returns top-7 results shaped as `{ source_type, snippet, score, timestamp }`. Returns empty array on any ES error.

### Index Definitions

| Index | Source Type | Key text fields |
|-------|-------------|-----------------|
| memory_conversations | conversation | messageSnippet, title |
| memory_jobs | job | description, title, company |
| memory_cronjob_results | cronjob_result | result, error, cronjobName |
| memory_generated_files | generated_file | content, filename |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error: unused `beforeEach` import in test file**
- **Found during:** TypeScript check after GREEN implementation
- **Issue:** `beforeEach` was imported from vitest but never used, causing TS6133 error
- **Fix:** Removed `beforeEach` from import statement
- **Files modified:** src/services/elasticsearch.test.ts
- **Commit:** f985cde (bundled into GREEN commit)

**2. [Rule 1 - Bug] TypeScript error: `ignore: [400]` option incompatible with ES 8.x types**
- **Found during:** TypeScript check after GREEN implementation
- **Issue:** `client.indices.create({ index, mappings }, { ignore: [400] })` does not match any overload in `@elastic/elasticsearch@8.19.1` TypeScript types
- **Fix:** Removed `ignore` option, instead handle 400 via `catch (err)` block by checking `err.meta.statusCode === 400`. Added `estypes.MappingTypeMapping` type annotation to indices array to fix union inference issue.
- **Files modified:** src/services/elasticsearch.ts
- **Commit:** f985cde

## Verification Results

- `pnpm vitest run src/services/elasticsearch.test.ts` — 5/5 tests pass (MEM-01, MEM-02, MEM-03 satisfied)
- `grep -n "export" src/services/elasticsearch.ts` — 4 exports: getEsClient, ensureIndices, indexDocument, searchMemory
- `grep "Never re-throw" src/services/elasticsearch.ts` — fire-and-forget comment confirmed
- `npx tsc --noEmit | grep elasticsearch` — 0 errors

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/services/elasticsearch.ts exists | FOUND |
| src/services/elasticsearch.test.ts exists | FOUND |
| Commit f28267c exists | FOUND |
| Commit f985cde exists | FOUND |
