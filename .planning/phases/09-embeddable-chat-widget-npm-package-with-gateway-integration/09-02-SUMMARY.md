---
phase: 09-embeddable-chat-widget-npm-package-with-gateway-integration
plan: "02"
subsystem: api
tags: [gateway, http-server, widget, node-http, tdd, provider-pattern]

# Dependency graph
requires:
  - phase: 09-01
    provides: CONVERSATION_SOURCES.WIDGET constant and W9-04 Wave 0 RED test contract

provides:
  - WebWidgetProvider class implementing Provider interface with internal HTTP server
  - POST /jobs endpoint accepting { jobId, chatId, message } — calls /api/chat-sync async
  - GET /jobs/:jobId endpoint returning JobState from in-memory Map
  - Conditional WebWidgetProvider registration in gateway/index.ts via WIDGET_API_KEY

affects:
  - 09-03 (widget API route — will proxy jobs to WebWidgetProvider's internal HTTP server)
  - 09-04 (npm package — widget client polls GET /jobs/:jobId via the TanStack proxy)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Provider isolation: WebWidgetProvider calls /api/chat-sync directly, bypasses handleMessage() to avoid identity-check blocking"
    - "Async job state machine: pending → done/error via in-memory Maps with chatIdToJobId cross-reference"
    - "Conditional gateway registration: dynamic import gated on env var"

key-files:
  created:
    - workers/gateway/providers/web-widget.ts
  modified:
    - workers/gateway/index.ts
    - .env.example

key-decisions:
  - "WebWidgetProvider.start() accepts but ignores onMessage callback — provider calls /api/chat-sync directly, not through handleMessage()"
  - "POST /jobs responds 200 immediately then fires fetch async — ensures widget client is not blocked on LLM response time"
  - "chatIdToJobId deleted after job resolves — prevents stale state accumulation"

patterns-established:
  - "Gateway provider without handleMessage: pass () => Promise.resolve() as no-op onMessage when provider manages its own async flow"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 9 Plan 02: WebWidgetProvider Summary

**Self-contained HTTP server in gateway process that accepts async widget jobs, calls /api/chat-sync with messages array format, and exposes job polling via GET — W9-04 GREEN**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T09:17:10Z
- **Completed:** 2026-03-30T09:20:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Implemented WebWidgetProvider with internal http.Server on configurable WIDGET_INTERNAL_PORT (default 3001)
- POST /jobs stores pending job state, immediately responds `{ ok: true }`, then asynchronously calls /api/chat-sync with messages array format `{ messages: [{ role: 'user', content: message }], title, source: 'widget', chatId, userId: null }`
- GET /jobs/:jobId exposes JobState polling (pending/done/error)
- send() method satisfies Provider interface — maps chatId to jobId and transitions to done status
- Conditionally registers WebWidgetProvider in gateway index.ts when WIDGET_API_KEY is set
- W9-04 test transitions from RED to GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement WebWidgetProvider** - `9b5868d` (feat)
2. **Task 2: Register WebWidgetProvider in gateway index** - `af75450` (feat)

## Files Created/Modified
- `workers/gateway/providers/web-widget.ts` - WebWidgetProvider class: HTTP server, job Maps, /api/chat-sync calls
- `workers/gateway/index.ts` - Conditional WebWidgetProvider registration when WIDGET_API_KEY is set
- `.env.example` - WIDGET_API_KEY and WIDGET_INTERNAL_PORT documented

## Decisions Made
- WebWidgetProvider.start() accepts but ignores onMessage callback — provider calls /api/chat-sync directly, not through handleMessage(). No-op `() => Promise.resolve()` passed on registration.
- POST /jobs responds immediately then fires fetch async — widget clients are not blocked on LLM response time; they poll via GET /jobs/:jobId
- chatIdToJobId map entries are deleted after job resolves — prevents stale state accumulation in long-running gateway process

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The `@ts-expect-error` directive in `web-widget.test.ts` becomes a TS2578 "unused directive" error once the implementation exists — this is the expected behavior confirming W9-04 has transitioned from RED to GREEN. Pre-existing unrelated TS errors in `src/lib/sections.ts` and `handler.test.ts` are out of scope.

## User Setup Required

None - no external service configuration required for this plan. WIDGET_API_KEY and WIDGET_INTERNAL_PORT documented in .env.example for operator configuration.

## Next Phase Readiness
- WebWidgetProvider fully implemented and conditionally registered
- W9-04 GREEN — gateway side of widget is complete
- Plan 03 can now implement `src/routes/api/gateway/widget/index.ts` which proxies widget requests to the WebWidgetProvider's internal HTTP server (satisfying W9-01/02/03)

---
*Phase: 09-embeddable-chat-widget-npm-package-with-gateway-integration*
*Completed: 2026-03-30*
