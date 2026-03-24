---
phase: 06-report-bug-button
plan: 01
subsystem: testing
tags: [vitest, tdd, helpers, prompt-building, json-parsing]

# Dependency graph
requires: []
provides:
  - buildReportPrompt pure function: constructs LLM prompt for issue classification and Jira ticket creation
  - parseTicketResponse pure function: parses LLM JSON response into typed ParseResult with error handling
  - TicketInfo interface and ParseResult type for use by ReportIssueModal (Plan 03)
affects:
  - 06-report-bug-button Plan 02 (API route)
  - 06-report-bug-button Plan 03 (ReportIssueModal UI component)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD RED-GREEN pattern for pure helper functions (write failing tests, then implement)
    - Markdown code fence stripping before JSON.parse (same pattern as parseGatewayDecision in chat-sync.tsx)
    - ParseResult discriminated union type for typed error handling

key-files:
  created:
    - src/lib/report-issue.ts
    - src/lib/report-issue.test.ts
  modified: []

key-decisions:
  - "ticketUrl validated as string but allowed to be empty string — empty string is valid (ticket creation may not return a URL)"
  - "Code fence stripping uses same regex as parseGatewayDecision in chat-sync.tsx for consistency"

patterns-established:
  - "ParseResult discriminated union: { success: true } & TicketInfo | { success: false; error: string } — use for all LLM response parsing"

requirements-completed: [RPT-01, RPT-02, RPT-03, RPT-04]

# Metrics
duration: 2min
completed: 2026-03-24
---

# Phase 06 Plan 01: report-issue helpers Summary

**Tested pure helper library with buildReportPrompt (LLM prompt builder) and parseTicketResponse (JSON parser with code-fence stripping) as the foundation for the Report Bug flow**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-24T08:42:19Z
- **Completed:** 2026-03-24T08:44:23Z
- **Tasks:** 2 (RED + GREEN)
- **Files modified:** 2

## Accomplishments
- Written 13 vitest tests covering all RPT-01 through RPT-04 behavior cases
- Implemented buildReportPrompt with title/desc/pageUrl interpolation, category-to-Jira-type mapping, and JSON-only instruction
- Implemented parseTicketResponse with markdown code fence stripping, required field validation, and typed discriminated union ParseResult
- Full test suite (29/29) passing with no regressions

## Task Commits

Each task was committed atomically:

1. **Task RED: failing tests for buildReportPrompt and parseTicketResponse** - `474e16c` (test)
2. **Task GREEN: implement buildReportPrompt and parseTicketResponse** - `83c62e4` (feat)

**Plan metadata:** _(committed after summary creation)_

_Note: TDD tasks have two commits — test (RED) then feat (GREEN)_

## Files Created/Modified
- `src/lib/report-issue.ts` — exports TicketInfo, ParseResult, buildReportPrompt, parseTicketResponse
- `src/lib/report-issue.test.ts` — 13 unit tests covering all behavior cases from the plan

## Decisions Made
- ticketUrl allowed to be empty string (not falsy-rejected): empty URL is a valid outcome when Jira doesn't return a browse URL
- Code fence stripping regex mirrors parseGatewayDecision in chat-sync.tsx for consistent LLM output handling across the codebase

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- src/lib/report-issue.ts ready for import by Plan 02 (API route /api/report-issue) and Plan 03 (ReportIssueModal)
- Export interface `import { buildReportPrompt, parseTicketResponse, TicketInfo, ParseResult } from '@/lib/report-issue'`

---
*Phase: 06-report-bug-button*
*Completed: 2026-03-24*
