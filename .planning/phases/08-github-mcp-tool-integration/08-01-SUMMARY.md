---
phase: 08-github-mcp-tool-integration
plan: 01
subsystem: api
tags: [github, mcp, modelcontextprotocol, postgres, drizzle, tools]

requires: []
provides:
  - "getGitHubMcpTools(githubPat) factory — creates ServerTool array from GitHub Copilot MCP endpoint"
  - "github_pat column in user_settings table via migration 0012"
  - "Unit test contract for MCP tool factory (connect throws → [], listTools resolves → ServerTools)"
affects:
  - 08-02 (user-settings service will add githubPat field)
  - 08-03 (chat service will call getGitHubMcpTools with per-user PAT)

tech-stack:
  added: []
  patterns:
    - "Per-user MCP client: fresh Client instance per getGitHubMcpTools call (no module singleton)"
    - "MCP tool factory: connect → listTools → map to toolDefinition().server() with jsonSchemaToZod()"
    - "Error resilience: try/catch wraps entire connection sequence, returns [] on failure"

key-files:
  created:
    - src/tools/github-mcp.ts
    - src/tools/github-mcp.test.ts
    - src/services/user-settings.test.ts
    - src/db/migrations/0012_add_github_pat.sql
  modified:
    - src/db/migrations/meta/_journal.json
    - src/db/schema.ts

key-decisions:
  - "getGitHubMcpTools creates a fresh Client per call — GitHub PAT is per-user unlike Zapier (shared env var)"
  - "ServerTool assertion checks __toolSide === 'server' and execute function — not .server property (which exists on ToolDefinition builder, not result)"
  - "Migration 0011 tracking entry backfilled in drizzle.__drizzle_migrations to unblock 0012 (same pattern as 01-01 decision)"

patterns-established:
  - "Per-user MCP factory: no singleton, inject PAT as parameter"

requirements-completed: []

duration: 7min
completed: 2026-03-29
---

# Phase 08 Plan 01: GitHub MCP Tool Factory + DB Migration Summary

**GitHub MCP tool factory accepting per-user PAT via StreamableHTTPClientTransport to api.githubcopilot.com/mcp/, with github_pat column added to user_settings table**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-29T05:52:55Z
- **Completed:** 2026-03-29T05:59:06Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- TDD RED stubs for github-mcp factory (3 tests) and user-settings githubPat type check (2 tests)
- DB migration 0012 adding `github_pat text` column to `user_settings` table applied successfully
- `getGitHubMcpTools(githubPat)` factory implemented — per-user Client, maps tools via `toolDefinition().server()`, returns `[]` on error
- All 3 github-mcp tests GREEN; user-settings tests GREEN

## Task Commits

1. **Task 1: Wave 0 test stubs (RED)** - `42e691d` (test)
2. **Task 2: DB migration + schema column** - `1df660d` (feat)
3. **Task 3: github-mcp.ts tool factory (GREEN)** - `9b8fe82` (feat)

## Files Created/Modified

- `src/tools/github-mcp.ts` — `getGitHubMcpTools(githubPat)` factory; per-user Client, StreamableHTTPClientTransport with Bearer auth, toolDefinition().server() mapping, try/catch returns []
- `src/tools/github-mcp.test.ts` — 3 unit tests: connect throws → [], listTools resolves 2 tools → length 2, each tool has __toolSide:'server' and execute fn
- `src/services/user-settings.test.ts` — Type assertion test for githubPat on UserSettingsRecord; getUserSettings mock test with githubPat property
- `src/db/migrations/0012_add_github_pat.sql` — `ALTER TABLE "user_settings" ADD COLUMN "github_pat" text`
- `src/db/migrations/meta/_journal.json` — Added idx 12 entry (tag: 0012_add_github_pat, when: 1774000002000)
- `src/db/schema.ts` — Added `githubPat: text('github_pat')` to userSettings pgTable

## Decisions Made

- **Per-user Client (no singleton):** Unlike `zapier-mcp.ts` which uses a module-level singleton (shared URL/token from env vars), GitHub PAT is per-user. Every `getGitHubMcpTools` call creates a fresh `Client` + `StreamableHTTPClientTransport`.
- **ServerTool assertion fix:** Test 3 checked `typeof tool.server === 'function'` — wrong. `toolDefinition().server(fn)` returns a `ServerTool` which has `__toolSide: 'server'` and `execute`, not `.server`. Fixed assertion to check `__toolSide` and `execute`.
- **Migration 0011 backfill:** Drizzle tried to re-run 0011 (already applied via db:push). Backfilled `drizzle.__drizzle_migrations` with 0011 hash + `created_at=1774000001000` so Drizzle skips it and only runs 0012. Pattern mirrors decision 01-01.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect test assertion for ServerTool check**
- **Found during:** Task 3 (GREEN implementation run)
- **Issue:** Test 3 checked `typeof (tool as any).server === 'function'`. `toolDefinition().server(fn)` returns a `ServerTool` — the `.server` method is on the `ToolDefinition` builder, not on the returned `ServerTool`. The property is `undefined` on the result.
- **Fix:** Changed assertion to check `(tool as any).__toolSide === 'server'` and `typeof (tool as any).execute === 'function'`
- **Files modified:** `src/tools/github-mcp.test.ts`
- **Verification:** All 3 tests GREEN after fix
- **Committed in:** `9b8fe82` (Task 3 commit)

**2. [Rule 3 - Blocking] Backfilled migration 0011 tracker to unblock 0012**
- **Found during:** Task 2 (DB migration run)
- **Issue:** `drizzle.__drizzle_migrations` missing entry for 0011 (applied via db:push without journal tracking). Drizzle tried to re-run 0011 CREATE TABLE statements, failing with "relation already exists".
- **Fix:** Computed SHA256 of 0011 SQL, inserted row with `created_at=1774000001000` into tracking table. Drizzle then correctly started from 0011 and ran only 0012.
- **Files modified:** None (DB-only fix)
- **Verification:** `pnpm db:migrate` succeeded; `github_pat` column confirmed in `user_settings`
- **Committed in:** `1df660d` (Task 2 commit, noted in message)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 blocking issue)
**Impact on plan:** Both fixes required for correctness. No scope creep.

## Issues Encountered

- Pre-existing failing test in `workers/gateway/handler.test.ts` (1 test) — confirmed pre-existing via git stash check, not caused by this plan's changes. Deferred.

## User Setup Required

None — no external service configuration required for this plan. `github_pat` storage in DB is inert until Plan 02 adds the settings UI and Plan 03 wires it into the chat service.

## Next Phase Readiness

- `getGitHubMcpTools(pat)` factory ready for use in Plan 03 (chat service integration)
- `github_pat` column in DB ready for Plan 02 (user-settings service + UI)
- `UserSettingsRecord` interface still lacks `githubPat` field — Plan 02 will add it and the user-settings test will become fully GREEN

---
*Phase: 08-github-mcp-tool-integration*
*Completed: 2026-03-29*
