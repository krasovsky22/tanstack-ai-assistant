---
phase: 02-add-elasticsearch-to-docker-stack-for-llm-memory-store-generated-files-conversations-and-cronjob-results
plan: "03"
subsystem: tools
tags: [tanstack-ai, tools, elasticsearch, memory, search, vitest]

# Dependency graph
requires:
  - phase: 02-01
    provides: docker-compose Elasticsearch setup (ES must be running for live tool calls)

provides:
  - search_memory LLM tool in src/tools/memory.ts callable by the AI agent
  - getMemoryTools() factory exported from src/tools/index.ts
  - buildChatOptions() wired to include search_memory in tools array
  - memory.test.ts and chat.test.ts green without live ES server

affects:
  - 02-02 (elasticsearch service provides searchMemory() called by this tool)
  - future plans relying on LLM memory recall

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "toolDefinition().server() with dynamic import for deferred dependency loading"
    - "vi.mock() for ES service isolation in tool unit tests"
    - "Full mock of @/tools in chat.test.ts for fast buildChatOptions() unit testing"

key-files:
  created:
    - src/tools/memory.ts
    - src/tools/memory.test.ts
  modified:
    - src/tools/index.ts
    - src/services/chat.ts
    - src/services/chat.test.ts

key-decisions:
  - "Used dynamic import for elasticsearch service in tool handler — allows tool to be tested without live ES"
  - "chat.test.ts uses full vi.mock(@/tools) approach — avoids Docker MCP connection noise and runs in 2ms vs 400ms"

patterns-established:
  - "Pattern: memory tool follows getCronjobTools() pattern exactly — same import style, same .server() dynamic import"
  - "Pattern: test files for tools mock external services to avoid infrastructure dependencies"

requirements-completed: [MEM-04, MEM-06]

# Metrics
duration: 3min
completed: 2026-03-07
---

# Phase 02 Plan 03: search_memory LLM Tool Summary

**search_memory toolDefinition registered in buildChatOptions() via getMemoryTools() factory, using dynamic import of searchMemory() from elasticsearch service, with mocked unit tests for MEM-04 and MEM-06**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-07T09:46:13Z
- **Completed:** 2026-03-07T09:49:49Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- search_memory tool implemented in src/tools/memory.ts following getCronjobTools() pattern with dynamic ES import
- getMemoryTools() exported from src/tools/index.ts and spread into tools array in buildChatOptions()
- memory.test.ts: 2 tests green with vi.mock for elasticsearch (MEM-04)
- chat.test.ts: updated to full mock approach — 2ms vs 400ms, no Docker dependency (MEM-06)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/tools/memory.ts and register in tool system** - `2810ca4` (feat)
2. **Task 2: Update memory.test.ts and chat.test.ts to run green** - `6ce9b85` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `src/tools/memory.ts` - getMemoryTools() factory with search_memory toolDefinition
- `src/tools/index.ts` - added export { getMemoryTools } from './memory'
- `src/services/chat.ts` - added getMemoryTools to destructured import and tools array spread
- `src/tools/memory.test.ts` - 2 tests: array length and search_memory name presence, ES mocked
- `src/services/chat.test.ts` - rewritten with full vi.mock(@/tools) for fast isolated MEM-06 test

## Decisions Made
- Used dynamic import pattern (`await import('@/services/elasticsearch')`) inside the `.server()` handler — consistent with existing crontool.ts pattern, avoids ES connection at module load time
- Updated chat.test.ts from live buildChatOptions() call to fully mocked version — eliminates Docker MCP stderr noise and cuts test time from ~400ms to ~2ms

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error in memory.test.ts name extraction**
- **Found during:** Task 1 (TypeScript compile check)
- **Issue:** `tools.map((t: Record<string, unknown>) => t['name'])` — ServerTool type lacks index signature, TS2345
- **Fix:** Changed to `tools.map((t) => (t as unknown as Record<string, unknown>)['name'])`
- **Files modified:** src/tools/memory.test.ts
- **Verification:** `npx tsc --noEmit 2>&1 | grep memory` returns no errors
- **Committed in:** 2810ca4 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type assertion fix)
**Impact on plan:** Necessary for TypeScript correctness. No scope change.

## Issues Encountered
- Discovered that src/services/chat.test.ts and src/services/elasticsearch.ts were already created by plan 02-02 running in parallel. The existing chat.test.ts was a simpler version that worked. Updated to the fully mocked spec from the plan for better isolation.

## User Setup Required
None - no external service configuration required for the tool itself. Elasticsearch must be running (from plan 02-01) for live tool execution.

## Next Phase Readiness
- search_memory tool ready for LLM use when Elasticsearch is running
- Plans 02-02 (elasticsearch service) and 02-01 (Docker stack) must be complete for end-to-end chain
- Full chain: LLM calls search_memory → memory.ts handler → elasticsearch.ts searchMemory() → ES cluster

## Self-Check: PASSED

- FOUND: src/tools/memory.ts
- FOUND: src/tools/memory.test.ts
- FOUND: commit 2810ca4 (feat: implement search_memory tool)
- FOUND: commit 6ce9b85 (feat: update chat.test.ts with mocks)
- TypeScript: no errors in memory files

---
*Phase: 02-add-elasticsearch-to-docker-stack-for-llm-memory-store-generated-files-conversations-and-cronjob-results*
*Completed: 2026-03-07*
