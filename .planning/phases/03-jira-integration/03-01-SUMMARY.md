---
phase: 03-jira-integration
plan: "01"
subsystem: testing
tags: [vitest, tdd, jira, fetch-mock, wave-0]

# Dependency graph
requires: []
provides:
  - "Wave 0 RED test scaffold for JIRA-01 through JIRA-07 (jiratool.test.ts)"
  - "Wave 0 RED test for JIRA-08 chat tool registration (chat.test.ts)"
affects: [03-02, 03-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.stubGlobal('fetch', vi.fn()) for mocking native fetch in tool handler tests"
    - "vi.mock('@/tools') full module mock pattern to avoid Docker MCP noise in chat.test.ts"
    - "@ts-expect-error on imports of non-existent files for Wave 0 test scaffolds"

key-files:
  created:
    - src/tools/jiratool.test.ts
    - src/services/chat.test.ts
  modified: []

key-decisions:
  - "Wave 0 tests import jiratool.ts with @ts-expect-error — runtime import failure is the expected RED signal"
  - "chat.test.ts uses vi.mock('@/tools') full-mock pattern (established in Phase 02-03) — avoids Docker MCP connection noise, tests run in <1s"
  - "jira_assign_issue test explicitly asserts { name: username } and NOT { accountId } — documents the Jira Server vs Cloud API distinction"

patterns-established:
  - "Tool test pattern: vi.stubGlobal('fetch', vi.fn()) in beforeEach + vi.unstubAllGlobals() in afterEach"
  - "Tool test helper: findTool(tools, name) to locate tool by name from getJiraTools() array"
  - "204 responses: mock as { ok: true, status: 204 } with no json() — do NOT call json() on empty body responses"

requirements-completed: [JIRA-01, JIRA-02, JIRA-03, JIRA-04, JIRA-05, JIRA-06, JIRA-07, JIRA-08]

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 03 Plan 01: Jira Integration Wave 0 Test Scaffold Summary

**Wave 0 RED test stubs for all 8 Jira requirements — jiratool.test.ts (6 describe blocks) and chat.test.ts (2 cases) both fail on import/missing-export as expected**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-11T08:41:40Z
- **Completed:** 2026-03-11T08:44:11Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `src/tools/jiratool.test.ts` with 6 describe blocks covering all 7 Jira tool behaviours (JIRA-01 through JIRA-07) plus the convenience jira_get_issue tool
- Created `src/services/chat.test.ts` with 2 test cases verifying `buildChatOptions()` calls `getJiraTools()` respecting DISABLE_TOOLS env var (JIRA-08)
- Both files fail RED with expected signals: jiratool.test.ts → "Cannot find module './jiratool'"; chat.test.ts → "expected spy to be called once, but got 0 times"

## Task Commits

Each task was committed atomically:

1. **Task 1: Create jiratool.test.ts with RED stubs for JIRA-01 through JIRA-07** - `ce7d7fc` (test)
2. **Task 2: Create chat.test.ts with RED stub for JIRA-08** - `f459de2` (test)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `/Users/RandomPotato/Workspace/tanstack-ai-assistant/src/tools/jiratool.test.ts` — Wave 0 RED tests for all Jira tool behaviours, 6 describe blocks, fetch mocking via vi.stubGlobal
- `/Users/RandomPotato/Workspace/tanstack-ai-assistant/src/services/chat.test.ts` — Wave 0 RED test for getJiraTools registration in buildChatOptions(), full @/tools mock

## Decisions Made

- Wave 0 tests use `@ts-expect-error` on the jiratool import — TypeScript suppresses the type error but the runtime import still throws "Cannot find module", producing the expected RED signal
- `chat.test.ts` adopts the established `vi.mock('@/tools')` full-module-mock pattern from Phase 02-03 — avoids Docker MCP stdio connection during test runs
- `jira_assign_issue` test explicitly asserts `{ name: username }` and checks `NOT { accountId }` — this encodes the Jira Server API requirement (vs Jira Cloud which uses accountId)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Wave 0 test scaffold complete; Plan 02 can now implement `src/tools/jiratool.ts` to turn these tests GREEN
- Plan 03 implements `getJiraTools` export in `src/tools/index.ts` and `chat.ts` registration to satisfy JIRA-08
- All test contracts established: 6 tool behaviours, fetch mock patterns, env var guard pattern, and chat registration pattern are all specified

## Self-Check: PASSED

- src/tools/jiratool.test.ts: FOUND
- src/services/chat.test.ts: FOUND
- .planning/phases/03-jira-integration/03-01-SUMMARY.md: FOUND
- Commit ce7d7fc: FOUND
- Commit f459de2: FOUND

---
*Phase: 03-jira-integration*
*Completed: 2026-03-11*
