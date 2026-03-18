---
phase: 04-user-authentication
plan: 03
subsystem: api
tags: [session, drizzle, user-scoping, tanstack-start, postgresql]

# Dependency graph
requires:
  - phase: 04-01
    provides: userId FK columns on jobs, cronjobs, cronjobLogs, conversations tables
  - phase: 04-02
    provides: useAppSession() from src/services/session.ts, login/logout endpoints

provides:
  - User-scoped jobs GET/POST (filter and insert by session userId)
  - User-scoped cronjobs GET/POST (filter and insert by session userId)
  - User-scoped conversations GET/POST (filter and insert by session userId)
  - Ownership guards (403) on PATCH/DELETE for jobs, cronjobs, conversations
  - /api/chat reads userId from server session rather than request body
  - buildChatOptions accepts optional userId parameter, forwards to options and system prompt

affects:
  - 04-04
  - workers (gateway, cron) — unchanged, still pass userId via chat-sync body

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Session read pattern: import useAppSession inside handler, extract userId ?? null"
    - "Drizzle user filter: .where(userId ? eq(table.userId, userId) : undefined)"
    - "Ownership guard: fetch record first, return 403 if userId mismatch"

key-files:
  created: []
  modified:
    - src/routes/api/jobs/index.tsx
    - src/routes/api/jobs/$id.tsx
    - src/routes/api/cronjobs/index.tsx
    - src/routes/api/cronjobs/$id.tsx
    - src/routes/api/conversations/index.tsx
    - src/routes/api/conversations/$id.tsx
    - src/routes/api/chat.tsx
    - src/services/chat.ts

key-decisions:
  - "Unauthenticated GET requests return empty arrays (graceful degradation) rather than 401 — routes are not auth-gated"
  - "Ownership guards (403) only fire when both session userId AND record userId are non-null — avoids locking out legacy unowned records"
  - "userId not included in onConflictDoUpdate set clause — preserves original owner on conflict upserts"
  - "buildChatOptions passes userId into options object and appends user id to system prompt snippet"

patterns-established:
  - "Session read pattern for API handlers: dynamic import useAppSession inside handler body"
  - "Drizzle conditional where: userId ? eq(table.userId, userId) : undefined"
  - "Mutation ownership guard: fetch -> compare userId -> 403 before executing mutation"

requirements-completed:
  - AUTH-06

# Metrics
duration: 3min
completed: 2026-03-18
---

# Phase 04 Plan 03: User Scoping Summary

**Session-based userId filtering on all data-query routes (jobs, cronjobs, conversations) and session-aware /api/chat endpoint using useAppSession() server-side reads**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-18T17:19:35Z
- **Completed:** 2026-03-18T17:22:35Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- All GET handlers for jobs, cronjobs, and conversations now filter rows by session userId
- All POST handlers insert session userId into new rows
- PATCH/DELETE handlers on $id routes return 403 when session userId mismatches record userId
- /api/chat reads userId from server session — browser no longer needs to send userId in request body
- buildChatOptions updated to accept and forward optional userId parameter
- /api/chat-sync left unchanged — gateway and cron workers continue passing userId in POST body

## Task Commits

Each task was committed atomically:

1. **Task 1: Scope jobs and cronjobs API routes by session user** - `03b321f` (feat)
2. **Task 2: Scope conversations API and update /api/chat to use session userId** - `2051169` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/routes/api/jobs/index.tsx` - GET filters by userId, POST inserts userId
- `src/routes/api/jobs/$id.tsx` - PATCH/DELETE guard ownership (403 on userId mismatch)
- `src/routes/api/cronjobs/index.tsx` - GET filters by userId, POST inserts userId
- `src/routes/api/cronjobs/$id.tsx` - PATCH/DELETE guard ownership (403 on userId mismatch)
- `src/routes/api/conversations/index.tsx` - GET filters by userId, POST inserts userId (not in conflict set)
- `src/routes/api/conversations/$id.tsx` - DELETE/PATCH guard ownership (403 on userId mismatch)
- `src/routes/api/chat.tsx` - reads userId from session, passes to buildChatOptions
- `src/services/chat.ts` - buildChatOptions accepts userId?, appends user context to system prompt

## Decisions Made
- Unauthenticated GET requests return empty arrays rather than 401 — routes are not hard-gated, graceful degradation
- Ownership guards fire only when both session userId and record userId are non-null — avoids locking legacy unowned records
- userId excluded from onConflictDoUpdate set clause in conversations/index.tsx to preserve original owner on upsert
- userId forwarded into buildChatOptions return object and appended as a snippet to the system prompt string

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Self-Check: PASSED

All files verified present. All commits verified in git log.

## Next Phase Readiness
- All data-query routes are user-scoped; foundation ready for Phase 04-04
- Workers (gateway, cron) unaffected — they pass userId through /api/chat-sync body as before

---
*Phase: 04-user-authentication*
*Completed: 2026-03-18*
