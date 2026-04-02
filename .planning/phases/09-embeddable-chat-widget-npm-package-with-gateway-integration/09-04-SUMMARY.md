---
phase: 09-embeddable-chat-widget-npm-package-with-gateway-integration
plan: "04"
subsystem: ui
tags: [react, vite, iife, widget, npm-package, css-injection, polling]

# Dependency graph
requires:
  - phase: 09-03
    provides: POST /api/gateway/widget and GET /api/gateway/widget/:jobId endpoints
provides:
  - packages/chat-widget/ workspace package (@internal/chat-widget)
  - window.ChatWidget.init({ endpoint, apiKey }) embed API
  - IIFE bundle at packages/chat-widget/dist/chat-widget.js (575KB, 177KB gzip)
  - .cw-* CSS namespace for host-page isolation
affects: [09-phase-docs, future-widget-distribution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - IIFE Vite build with explicit root + resolve(__dirname, entry) for monorepo builds
    - CSS-in-JS via style tag injection with ID guard (inject once)
    - Submit-then-poll pattern (POST returns jobId, GET polls until done)
    - chatId stored in module-level JS memory (resets on page refresh by design)

key-files:
  created:
    - packages/chat-widget/package.json
    - packages/chat-widget/tsconfig.json
    - packages/chat-widget/vite.config.widget.ts
    - packages/chat-widget/src/styles.ts
    - packages/chat-widget/src/useChat.ts
    - packages/chat-widget/src/ChatPanel.tsx
    - packages/chat-widget/src/Widget.tsx
    - packages/chat-widget/src/index.tsx
  modified:
    - package.json (added build:widget script)

key-decisions:
  - "vite.config.widget.ts sets root: __dirname and uses resolve(__dirname, 'src/index.tsx') for entry — required when build:widget is called from the monorepo root rather than the package directory"
  - "fileName: () => 'chat-widget.js' explicit extension — Vite IIFE format omits extension without it"
  - "React bundled into IIFE (not externalized) — widget must be self-contained for script tag embed with no host-page dependencies"

patterns-established:
  - "IIFE widget pattern: window.ChatWidget.init() mounts React into a dynamically created div"
  - "CSS injection guard: document.getElementById('chat-widget-styles') prevents duplicate style tags"
  - "Submit-then-poll: POST /api/gateway/widget returns jobId, poll GET every 1s up to 60s timeout"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-04-02
---

# Phase 09 Plan 04: Chat Widget Package Summary

**Self-contained React IIFE bundle exposing `window.ChatWidget.init({ endpoint, apiKey })` with floating button, chat panel, and submit-then-poll messaging against the gateway API**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-02T07:51:15Z
- **Completed:** 2026-04-02T07:59:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Created complete `packages/chat-widget/` workspace package with all React components
- Built IIFE bundle (575KB uncompressed, 177KB gzip) via `pnpm build:widget`
- Implemented `window.ChatWidget.init()` API with submit-then-poll chat via gateway endpoints

## Task Commits

Each task was committed atomically:

1. **Task 1: Package scaffold — package.json, tsconfig, vite config** - `b785b5d` (chore)
2. **Task 2: Widget React components and useChat hook** - `726f027` (feat)

## Files Created/Modified
- `packages/chat-widget/package.json` - Workspace package metadata (@internal/chat-widget)
- `packages/chat-widget/tsconfig.json` - Extends root tsconfig, empty paths override
- `packages/chat-widget/vite.config.widget.ts` - Vite IIFE build config with root and resolve fixes
- `packages/chat-widget/src/styles.ts` - CSS injection with .cw-* namespace, inject-once guard
- `packages/chat-widget/src/useChat.ts` - Submit-then-poll hook (1s interval, 60s timeout)
- `packages/chat-widget/src/ChatPanel.tsx` - Message list + input form component
- `packages/chat-widget/src/Widget.tsx` - Floating button + toggle panel component
- `packages/chat-widget/src/index.tsx` - window.ChatWidget.init() entry point
- `package.json` - Added build:widget script

## Decisions Made

- **Vite config path resolution:** The build runs from the monorepo root (`pnpm build:widget`) but the config sits in `packages/chat-widget/`. Without `root: __dirname` and `resolve(__dirname, 'src/index.tsx')`, Vite cannot find the entry module. Setting both fields explicitly solves the "Could not resolve entry module" error.
- **Explicit .js extension in fileName:** Vite's IIFE format omits the file extension when fileName returns a bare name. Changed to `() => 'chat-widget.js'` to produce the expected `dist/chat-widget.js`.
- **React bundled in IIFE:** React is not externalized. The widget must work as a standalone `<script>` tag with no host-page React requirement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Vite entry resolution for monorepo cross-package build**
- **Found during:** Task 2 (build verification)
- **Issue:** `pnpm build:widget` runs from repo root; Vite resolved `src/index.tsx` relative to CWD (repo root), not the config file's directory — "Could not resolve entry module"
- **Fix:** Added `root: __dirname` and changed entry to `resolve(__dirname, 'src/index.tsx')` in vite.config.widget.ts; changed `outDir` to `resolve(__dirname, 'dist')` for consistency
- **Files modified:** `packages/chat-widget/vite.config.widget.ts`
- **Verification:** `pnpm build:widget` exits 0, `dist/chat-widget.js` produced at 575KB
- **Committed in:** 726f027 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed missing .js extension in IIFE bundle filename**
- **Found during:** Task 2 (build verification)
- **Issue:** `fileName: () => 'chat-widget'` produced `dist/chat-widget` (no extension) — plan requires `dist/chat-widget.js`
- **Fix:** Changed fileName to `() => 'chat-widget.js'`
- **Files modified:** `packages/chat-widget/vite.config.widget.ts`
- **Verification:** `dist/chat-widget.js` exists at 575KB after rebuild
- **Committed in:** 726f027 (Task 2 commit)

**3. [Rule 1 - Bug] Added void to sendMessage call in ChatPanel.tsx**
- **Found during:** Task 2 (async promise not handled)
- **Issue:** `sendMessage(text)` returns a Promise; calling without void/await in event handler causes unhandled promise warning
- **Fix:** Changed to `void sendMessage(text)` in handleSubmit
- **Files modified:** `packages/chat-widget/src/ChatPanel.tsx`
- **Verification:** No TypeScript errors
- **Committed in:** 726f027 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 Rule 1 bugs)
**Impact on plan:** All auto-fixes necessary for correct build output and code quality. No scope creep.

## Issues Encountered
- Pre-existing test failures in `workers/gateway/handler.test.ts` and e2e specs — confirmed unrelated to this plan's changes (gateway handler test was already failing, e2e specs require running dev server)

## User Setup Required
None - no external service configuration required. The widget package is built locally via `pnpm build:widget`.

## Next Phase Readiness
- Widget IIFE bundle ready at `packages/chat-widget/dist/chat-widget.js` (run `pnpm build:widget` to produce)
- Embed on any page: `<script src="...chat-widget.js"></script>` then `ChatWidget.init({ endpoint: 'https://myapp.com', apiKey: 'secret' })`
- Gateway endpoints (Plans 02 + 03) already implemented — widget connects to `/api/gateway/widget` POST and GET

---
*Phase: 09-embeddable-chat-widget-npm-package-with-gateway-integration*
*Completed: 2026-04-02*
