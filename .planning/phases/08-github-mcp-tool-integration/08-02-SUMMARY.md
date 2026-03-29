---
phase: 08-github-mcp-tool-integration
plan: 02
subsystem: api
tags: [github, mcp, user-settings, pat, masking, tools]

# Dependency graph
requires:
  - phase: 08-github-mcp-tool-integration
    plan: 01
    provides: github_pat DB column in user_settings, getGitHubMcpTools() factory

provides:
  - UserSettingsRecord.githubPat field (string | null)
  - GET /api/user-settings: githubPat masked as '••••••••', hasGithubPat flag
  - PUT /api/user-settings: PAT validation via GET https://api.github.com/user, connectedAs in response
  - buildChatOptions() 5th param githubPat loads GitHub MCP tools when non-null
  - Both chat routes pass githubPat to buildChatOptions

affects: [chat, user-settings-ui, github-mcp-tools]

# Tech tracking
tech-stack:
  added: []
  patterns: [masked-PAT-placeholder pattern extended to githubPat, per-user PAT validation on save]

key-files:
  created:
    - src/routes/api/user-settings.test.ts
  modified:
    - src/services/user-settings.ts
    - src/routes/api/user-settings.tsx
    - src/services/chat.ts
    - src/tools/index.ts
    - src/routes/api/chat.tsx
    - src/routes/api/chat-sync.tsx
    - src/services/user-settings.test.ts

key-decisions:
  - "PUT /api/user-settings validates PAT via GitHub REST API but never returns 4xx on network failure — save PAT regardless, connectedAs is null if unreachable"
  - "Masked placeholder '••••••••' resolved to existing DB value before upsert — never writes placeholder to DB"
  - "buildChatOptions() loads GitHub tools only when githubPat is non-null AND 'github' not in DISABLE_TOOLS"
  - "@ts-expect-error on githubPat removed from user-settings.test.ts after interface was extended"

patterns-established:
  - "PAT masking pattern: return '••••••••' in GET, resolve to real value on PUT before save — applies to any sensitive credential"
  - "Tool loading guard: enabled(key) && credential — gating tool groups on both env flag and user credential"

requirements-completed: []

# Metrics
duration: 6min
completed: 2026-03-29
---

# Phase 8 Plan 02: GitHub MCP Tool Integration - Service Layer Wiring Summary

**githubPat wired end-to-end: UserSettingsRecord -> API masking/validation -> buildChatOptions() -> GitHub MCP tool loading in both chat routes**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-29T06:01:29Z
- **Completed:** 2026-03-29T06:07:06Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Extended `UserSettingsRecord` with `githubPat: string | null` and updated both `upsertUserSettings` returning() branches
- Added GitHub PAT masking to GET handler and PAT validation (via `GET https://api.github.com/user`) to PUT handler with `connectedAs` in response
- Added `githubPat` as 5th parameter to `buildChatOptions()` with GitHub tools loading via `Promise.all` guarded by `enabled('github') && githubPat`
- Updated both `chat.tsx` (streaming) and `chat-sync.tsx` (gateway + non-gateway flows) to extract and pass `githubPat`
- 5 unit tests for masking behavior, placeholder resolution, and PAT save logic

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend UserSettingsRecord + user-settings API route** - `15a6ab9` (feat)
2. **Task 2: Wire buildChatOptions() + tools/index.ts + chat routes** - `1cc4859` (feat)

**Plan metadata:** (docs commit follows)

_Note: Task 1 used TDD — tests written first, verified RED conceptually (logic tested inline), then GREEN after implementation_

## Files Created/Modified
- `src/services/user-settings.ts` - Added `githubPat` to interface and both returning() paths
- `src/routes/api/user-settings.tsx` - GET masking + PUT validation + connectedAs
- `src/routes/api/user-settings.test.ts` - 5 new tests (masking, placeholder, PAT save)
- `src/services/chat.ts` - Added githubPat param + GitHub tools to Promise.all
- `src/tools/index.ts` - Added export for getGitHubMcpTools
- `src/routes/api/chat.tsx` - Extract githubPat from settings, pass to buildChatOptions
- `src/routes/api/chat-sync.tsx` - Both non-gateway and gateway flows pass githubPat
- `src/services/user-settings.test.ts` - Removed obsolete @ts-expect-error

## Decisions Made
- PUT /api/user-settings validates PAT via GitHub REST API but never returns 4xx on network failure — PAT is saved regardless, `connectedAs` is `null` if GitHub API is unreachable
- Masked placeholder `'••••••••'` is resolved to existing DB value before upsert — never written to DB
- `buildChatOptions()` loads GitHub tools only when `githubPat` is non-null AND `'github'` not in `DISABLE_TOOLS`
- Removed `@ts-expect-error` from `user-settings.test.ts` after interface extension made it an unused directive

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `src/services/user-settings.test.ts` had `@ts-expect-error` that became an unused directive warning after `githubPat` was added to the interface — removed as expected GREEN cleanup (not a bug).
- 3 pre-existing test failures (2 Playwright e2e specs + 1 gateway handler TypeError) unchanged before and after this plan.

## User Setup Required
None - no external service configuration required beyond what Plan 01 set up.

## Next Phase Readiness
- Full end-to-end path is connected: DB -> settings API -> chat service -> GitHub MCP tools
- Settings UI (Plan 03) can now display `hasGithubPat` and send PAT via PUT to connect
- GitHub tools will load automatically in chat sessions when user has a valid PAT configured

---
*Phase: 08-github-mcp-tool-integration*
*Completed: 2026-03-29*
