---
phase: 09-embeddable-chat-widget-npm-package-with-gateway-integration
plan: "01"
subsystem: testing
tags: [vitest, tdd, pnpm-workspaces, monorepo, conversation-sources]

requires: []

provides:
  - pnpm workspace packages/* glob enabling chat-widget package resolution
  - CONVERSATION_SOURCES.WIDGET = 'widget' constant and ConversationSource union type update
  - Wave 0 RED test contracts for W9-01 through W9-05

affects:
  - 09-02 (widget npm package — must satisfy W9-04 by implementing WebWidgetProvider)
  - 09-03 (widget API route — must satisfy W9-01, W9-02, W9-03)
  - All Phase 9 plans (test contracts define their interfaces)

tech-stack:
  added: []
  patterns:
    - "Wave 0 RED stubs: @ts-expect-error on non-existent imports signals contract not yet satisfied"
    - "ConversationSource union extended via keyof typeof — no manual type updates needed"

key-files:
  created:
    - src/lib/conversation-sources.test.ts
    - src/routes/api/gateway/widget/widget.test.ts
    - workers/gateway/providers/web-widget.test.ts
  modified:
    - pnpm-workspace.yaml
    - src/lib/conversation-sources.ts

key-decisions:
  - "Wave 0 test stubs import non-existent ./index and ./web-widget — runtime import failure is the intentional RED signal until Plans 02-04 create implementations"
  - "packages/* glob added to pnpm-workspace.yaml before packages/ directory exists — pnpm tolerates missing directories in workspace config"

patterns-established:
  - "Wave 0 TDD pattern: @ts-expect-error + import of non-existent file = RED; vitest fails with 'Does the file exist?' until implementation is created"

requirements-completed: []

duration: 2min
completed: 2026-03-30
---

# Phase 9 Plan 01: Foundation and Wave 0 Test Stubs Summary

**pnpm workspace extended with packages/* glob, CONVERSATION_SOURCES.WIDGET added, and Wave 0 RED test contracts established for the entire widget gateway feature (W9-01 through W9-05)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T09:10:09Z
- **Completed:** 2026-03-30T09:12:55Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Extended pnpm-workspace.yaml with `packages/*` glob so the future chat-widget npm package can resolve React from the monorepo root
- Added `WIDGET: 'widget'` to CONVERSATION_SOURCES; ConversationSource union type automatically includes 'widget' via keyof typeof derivation
- Created W9-05 test (GREEN immediately) confirming the constant value
- Created Wave 0 RED test stubs for W9-01, W9-02, W9-03 (widget API route handlers) and W9-04 (WebWidgetProvider.send()) that define the contracts Plans 02-04 must satisfy

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend pnpm workspace and add WIDGET source constant** - `a86feee` (feat)
2. **Task 2: Wave 0 test stubs (RED)** - `b31c312` (test)

## Files Created/Modified
- `pnpm-workspace.yaml` - Added packages/* glob for monorepo chat-widget support
- `src/lib/conversation-sources.ts` - Added WIDGET: 'widget' constant
- `src/lib/conversation-sources.test.ts` - W9-05 unit test (GREEN)
- `src/routes/api/gateway/widget/widget.test.ts` - W9-01/02/03 RED stubs for widget API route
- `workers/gateway/providers/web-widget.test.ts` - W9-04 RED stub for WebWidgetProvider

## Decisions Made
- Wave 0 test stubs import non-existent `./index` and `./web-widget` — runtime import failure (vitest "Does the file exist?") is the intentional RED signal, consistent with the @ts-expect-error pattern established in Phase 03-01
- `packages/*` glob added to workspace before the `packages/` directory exists — pnpm tolerates missing directories in workspace glob configs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Foundation in place: workspace ready, WIDGET source constant exists, W9-05 GREEN
- Wave 0 contracts committed as RED: Plans 02-04 need to make W9-01 through W9-04 go GREEN
- Plan 02 can now create the `packages/chat-widget` npm package (pnpm workspace resolves it)
- Plan 03 can implement `src/routes/api/gateway/widget/index.ts` to satisfy W9-01/02/03
- Plan 04 can implement `workers/gateway/providers/web-widget.ts` to satisfy W9-04

---
*Phase: 09-embeddable-chat-widget-npm-package-with-gateway-integration*
*Completed: 2026-03-30*

## Self-Check: PASSED

- FOUND: pnpm-workspace.yaml
- FOUND: src/lib/conversation-sources.ts
- FOUND: src/lib/conversation-sources.test.ts
- FOUND: src/routes/api/gateway/widget/widget.test.ts
- FOUND: workers/gateway/providers/web-widget.test.ts
- FOUND: .planning/phases/09-embeddable-chat-widget-npm-package-with-gateway-integration/09-01-SUMMARY.md
- COMMIT a86feee: feat(09-01): extend pnpm workspace and add WIDGET source constant
- COMMIT b31c312: test(09-01): add Wave 0 RED test stubs for widget gateway
