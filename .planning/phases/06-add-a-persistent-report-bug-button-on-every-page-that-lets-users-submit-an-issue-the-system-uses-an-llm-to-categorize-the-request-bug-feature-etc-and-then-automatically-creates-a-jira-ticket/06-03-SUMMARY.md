---
phase: 06-report-bug-button
plan: 03
subsystem: ui
tags: [react, tanstack-form, chakra-ui, modal, report-issue]

# Dependency graph
requires:
  - phase: 06-01
    provides: buildReportPrompt and parseTicketResponse helpers in src/lib/report-issue.ts
  - phase: 06-02
    provides: AppHeader component with onOpen prop wired to Flag button

provides:
  - ReportIssueModal component with TanStack Form, three render states, and /api/chat-sync integration
  - __root.tsx AppLayout wired with AppHeader and ReportIssueModal mounted once at layout level
  - Fixed header layout with pt=56px content offset for all non-login pages

affects:
  - 06-04 (visual/functional QA checkpoint — this plan is the last code plan before QA)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "State machine (SubmitState type) for multi-state form modal: form | submitting | success | error"
    - "pageUrl captured at submit time (window.location.href inside onSubmit) not at render time"
    - "userId forwarded from useRouteContext to chat-sync payload for Jira user config resolution"

key-files:
  created:
    - src/components/ReportIssueModal.tsx
  modified:
    - src/routes/__root.tsx

key-decisions:
  - "ReportIssueModal accesses user via useRouteContext({ from: '__root__' }) internally — no prop drilling from AppLayout"
  - "Error state preserves form values (no form.reset()) — only Try Again resets state, not form data"
  - "ReportIssueModal conditionally rendered with !isLoginPage guard — prevents useRouteContext usage on login page before context is stable"

patterns-established:
  - "Three-state modal pattern: form state shows TanStack Form, submitting shows spinner, success/error show result UI"
  - "AppModal shell used for all modal dialogs — consistent header, close trigger, and footer slot"

requirements-completed: [RPT-06]

# Metrics
duration: 2min
completed: 2026-03-24
---

# Phase 06 Plan 03: ReportIssueModal and AppLayout Wiring Summary

**Three-state report modal (TanStack Form + /api/chat-sync) mounted once in __root.tsx AppLayout with 56px header offset**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-24T08:46:11Z
- **Completed:** 2026-03-24T08:48:23Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Built ReportIssueModal with TanStack Form: Title (min 3 chars) + Description fields, field-level validation, spinner on submit button
- Implemented four render states: form / submitting (center spinner) / success (CheckCircle2 + ticket link) / error (AlertCircle + Try Again)
- Wired AppHeader and ReportIssueModal into __root.tsx AppLayout with isReportOpen state — both mounted once, not per-page
- Added pt='56px' to main content Box on non-login pages to compensate for fixed header height
- All 29 unit tests pass with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Build ReportIssueModal with TanStack Form** - `fb8e2af` (feat)
2. **Task 2: Wire AppHeader + ReportIssueModal into __root.tsx AppLayout** - `f8d0ce0` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/components/ReportIssueModal.tsx` - Three-state report modal using TanStack Form, AppModal shell, lucide-react icons; submits to /api/chat-sync with userId
- `src/routes/__root.tsx` - Added AppHeader + ReportIssueModal imports, isReportOpen state, both components rendered when !isLoginPage, pt='56px' on content Box

## Decisions Made
- ReportIssueModal accesses user via `useRouteContext({ from: '__root__' })` internally — consistent with AppHeader approach from Plan 02, avoids prop drilling from AppLayout
- Error state preserves form field values by setting submitState back to 'form' without calling form.reset() — users can fix and resubmit without retyping
- Components conditionally rendered with `!isLoginPage` guard to match IconRail pattern in the file

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - TypeScript compilation clean for both new files, pre-existing errors in Chat.tsx / IconRail.tsx / other files are out of scope.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full end-to-end report issue flow is now complete: helpers (Plan 01) + header (Plan 02) + modal (Plan 03)
- Plan 04 human checkpoint is next: visual verification that Report Issue button appears in header, modal opens with form, loading spinner shows on submit
- No blockers

---
*Phase: 06-report-bug-button*
*Completed: 2026-03-24*
