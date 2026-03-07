---
phase: 02-add-elasticsearch-to-docker-stack-for-llm-memory-store-generated-files-conversations-and-cronjob-results
plan: 04
subsystem: infra
tags: [elasticsearch, indexing, chat, jobs, cron, resume, fire-and-forget]

# Dependency graph
requires:
  - phase: 02-02
    provides: indexDocument() function in src/services/elasticsearch.ts
  - phase: 02-03
    provides: search_memory tool consuming ES indices
provides:
  - Four write hooks feeding all data into Elasticsearch indices
  - Conversations indexed in memory_conversations on save and append
  - Jobs indexed in memory_jobs on POST /api/jobs
  - Cronjob results indexed in memory_cronjob_results on success and error
  - Generated files (resume + cover letter) indexed in memory_generated_files
affects: [02-03, any phase using search_memory tool]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget ES indexing: void indexDocument() after Postgres writes — never throws, never delays primary path"
    - "Dynamic import for elasticsearch service: const { indexDocument } = await import('@/services/elasticsearch')"
    - "cronjobLogs.insert().returning() to capture row ID for ES indexing"

key-files:
  created: []
  modified:
    - src/services/chat.ts
    - src/routes/api/jobs/index.tsx
    - workers/cron/index.ts
    - src/services/generate-resume.ts

key-decisions:
  - "void used on all indexDocument calls — fire-and-forget ensures ES failure cannot crash Postgres write path"
  - "appendMessagesToConversation uses conversationId as title fallback — title not available in that context"
  - "workers/cron/index.ts changed cronjobLogs insert to use .returning() — needed to capture logRow.id for ES document ID"
  - "generate-resume indexes content before PDF generation — result.updatedResume and result.coverLetter still in scope"

patterns-established:
  - "ES write hooks always placed after Postgres write, always fire-and-forget with void"
  - "Dynamic import pattern for ES service in hooks: const { indexDocument } = await import('@/services/elasticsearch')"

requirements-completed: [MEM-01, MEM-02, MEM-03, MEM-04, MEM-05, MEM-06]

# Metrics
duration: 5min
completed: 2026-03-07
---

# Phase 02 Plan 04: Write Hooks Summary

**Four fire-and-forget ES indexing hooks wired to conversations, jobs, cronjob results, and generated files — search_memory tool now receives live data**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-07T17:52:43Z
- **Completed:** 2026-03-07T17:57:43Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `saveConversationToDb` and `appendMessagesToConversation` in chat.ts both call `void indexDocument('memory_conversations', ...)` after Postgres writes
- POST /api/jobs handler calls `void indexDocument('memory_jobs', ...)` after `db.insert(jobs).returning()`
- `runCronjob` in workers/cron/index.ts calls `void indexDocument('memory_cronjob_results', ...)` in both success and error paths using `.returning()` to capture log row IDs
- `runResumeGeneration` calls `void indexDocument('memory_generated_files', ...)` twice for resume.md and cover-letter.md after writeFile — content strings still in scope from LLM call
- All 16 tests pass green after both tasks

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire conversation and job write hooks** - `70a99aa` (feat)
2. **Task 2: Wire cronjob results and generated file write hooks** - `a01cdbd` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/services/chat.ts` - Added void indexDocument calls to saveConversationToDb and appendMessagesToConversation
- `src/routes/api/jobs/index.tsx` - Added void indexDocument call after db.insert(jobs).returning()
- `workers/cron/index.ts` - Changed inserts to use .returning(), added void indexDocument in try and catch
- `src/services/generate-resume.ts` - Added two void indexDocument calls after writeFile for resume and cover letter

## Decisions Made
- Used `void` on all indexDocument calls to ensure fire-and-forget behavior — ES failures never reach the Postgres write path
- In `appendMessagesToConversation`, title is not available so `conversationId` is used as a fallback — acceptable since ES data is supplementary
- `workers/cron/index.ts` required changing the insert to `.returning()` to get the log row ID for the ES document ID field
- Indexed generated file content before PDF generation so `result.updatedResume` and `result.coverLetter` remain in scope

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All four write hooks are live — the search_memory tool will have real data to search once Elasticsearch is running
- Phase 02 is complete: Docker stack, indices, search tool, and write hooks all in place
- No blockers

---
*Phase: 02-add-elasticsearch-to-docker-stack-for-llm-memory-store-generated-files-conversations-and-cronjob-results*
*Completed: 2026-03-07*
