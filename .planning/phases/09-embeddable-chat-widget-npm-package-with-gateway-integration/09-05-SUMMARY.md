---
phase: 09-embeddable-chat-widget-npm-package-with-gateway-integration
plan: "05"
subsystem: testing
tags: [vitest, playwright, widget, documentation, smoke-test]

# Dependency graph
requires:
  - phase: 09-04
    provides: packages/chat-widget IIFE bundle, pnpm build:widget script
  - phase: 09-03
    provides: POST /api/gateway/widget and GET /api/gateway/widget/:jobId proxy endpoints
  - phase: 09-02
    provides: WebWidgetProvider gateway HTTP server
provides:
  - All 40 unit tests passing GREEN (9 test files)
  - pnpm build:widget produces dist/chat-widget.js (589KB / 178KB gzip)
  - CLAUDE.md documents WIDGET_API_KEY, WIDGET_GATEWAY_URL, WIDGET_INTERNAL_PORT
  - packages/chat-widget/test.html smoke test page for developer manual verification
affects: [future-widget-distribution, 09-phase-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Vitest exclude pattern for Playwright e2e specs (e2e/**) to prevent cross-contamination
    - Smoke test HTML pattern for IIFE widget manual verification

key-files:
  created:
    - packages/chat-widget/test.html
  modified:
    - CLAUDE.md (widget env vars + Workers section note)
    - vite.config.ts (test.exclude for e2e/)
    - workers/gateway/handler.test.ts (GID-07 mock fix)

key-decisions:
  - "vitest exclude e2e/** in vite.config.ts — Playwright specs import @playwright/test which conflicts with Vitest runner"
  - "GID-07 test expects 2 fetch calls (resolve + remote-chat upsert) not 1 — fire-and-forget upsert runs before userId guard"

patterns-established:
  - "Handler test pattern: mock all fire-and-forget fetches even if they are not the SUT — mockResolvedValueOnce returns undefined when exhausted, causing .catch() to throw"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-04-02
---

# Phase 09 Plan 05: Verification Gate Summary

**All 40 unit tests GREEN, widget IIFE build succeeds at 589KB, CLAUDE.md updated with widget env vars, smoke test HTML page created for end-to-end browser verification**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-02T07:56:46Z
- **Completed:** 2026-04-02T08:00:00Z
- **Tasks:** 1 of 2 (paused at checkpoint:human-verify for browser verification)
- **Files modified:** 4

## Accomplishments
- Fixed pre-existing test failures preventing GREEN suite (GID-07 handler test, Playwright e2e spec contamination)
- Verified pnpm build:widget produces dist/chat-widget.js at 589KB uncompressed / 178KB gzip
- Updated CLAUDE.md with three widget environment variables and gateway worker note
- Created test.html smoke test page for developer browser verification of the full widget flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Automated suite green + documentation update** - `9087de8` (feat)

## Files Created/Modified
- `CLAUDE.md` - Added WIDGET_API_KEY, WIDGET_GATEWAY_URL, WIDGET_INTERNAL_PORT to env vars; added WebWidgetProvider note to Workers section
- `vite.config.ts` - Added `test.exclude: ['e2e/**']` to prevent Playwright specs from running under Vitest
- `workers/gateway/handler.test.ts` - Fixed GID-07: added second mockFetch for fire-and-forget remote-chat upsert; updated assertion to expect 2 fetch calls and verify chat-sync not called
- `packages/chat-widget/test.html` - Minimal developer smoke test page for browser verification of widget

## Decisions Made
- **vitest exclude for e2e/**: Playwright test files import `@playwright/test` which conflicts with Vitest's `test()` global — excluding `e2e/**` in vite.config.ts test config solves this without touching the e2e files
- **GID-07 test expectation update**: The handler calls `fetch` for remote-chat upsert (fire-and-forget) BEFORE the userId guard, so unlinked user path has 2 fetches total. Test updated to mock both and assert chat-sync was never called (not just fetch count)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed GID-07 gateway handler test crashing on .catch() of undefined**
- **Found during:** Task 1 (running pnpm test)
- **Issue:** `mockFetch.mockResolvedValueOnce` queue exhausted after identity resolve call; second fetch (remote-chat upsert) returned `undefined`; `.catch()` on `undefined` threw `TypeError: Cannot read properties of undefined (reading 'catch')`
- **Fix:** Added second `mockFetch.mockResolvedValueOnce({ ok: true })` for the fire-and-forget upsert; updated assertion from `toHaveBeenCalledTimes(1)` to `toHaveBeenCalledTimes(2)` with explicit check that `/api/chat-sync` was not called
- **Files modified:** `workers/gateway/handler.test.ts`
- **Verification:** All 40 tests pass GREEN
- **Committed in:** 9087de8

**2. [Rule 3 - Blocking] Added Vitest exclude for Playwright e2e specs**
- **Found during:** Task 1 (running pnpm test)
- **Issue:** `e2e/debug-login.spec.ts` and `e2e/report-issue.spec.ts` were picked up by Vitest glob; they import `@playwright/test`'s `test()` which throws "Playwright Test did not expect test() to be called here"
- **Fix:** Added `test: { exclude: ['e2e/**', 'node_modules/**'] }` to `vite.config.ts`
- **Files modified:** `vite.config.ts`
- **Verification:** Vitest runs 9 test files (not 11), all pass GREEN
- **Committed in:** 9087de8

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 3 blocking)
**Impact on plan:** Both fixes unblocked the GREEN suite requirement. No scope creep.

## Issues Encountered
- Two pre-existing test failures noted in Plan 04 summary as known issues — both fixed as part of this plan's automated suite requirement

## User Setup Required
**Browser verification required.** The checkpoint requires manual browser testing:
1. Start `pnpm dev` (port 3000) and `WIDGET_API_KEY=test123 pnpm gateway:dev`
2. Ensure `.env` has `WIDGET_API_KEY=test123` and `WIDGET_GATEWAY_URL=http://localhost:3001`
3. Run `pnpm build:widget`
4. Open `packages/chat-widget/test.html` in a browser (update apiKey to `test123`)
5. Verify floating button, panel open, message send, LLM reply, message persistence

## Next Phase Readiness
- Phase 9 is at the final gate: human browser verification of end-to-end widget flow
- All automated checks pass; widget IIFE bundle is built and ready
- Gateway endpoints (Plans 02+03) and WebWidgetProvider (Plan 02) already implemented
- Upon approval: Phase 9 is complete

---
*Phase: 09-embeddable-chat-widget-npm-package-with-gateway-integration*
*Completed: 2026-04-02*
