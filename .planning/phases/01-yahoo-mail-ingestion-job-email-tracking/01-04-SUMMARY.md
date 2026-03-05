---
phase: 01-yahoo-mail-ingestion-job-email-tracking
plan: 04
subsystem: ui
tags: [react, tanstack-query, lucide-react, email, jobs]

# Dependency graph
requires:
  - phase: 01-yahoo-mail-ingestion-job-email-tracking plan 01-02
    provides: job_emails DB table + /api/mail/ingest endpoint
  - phase: 01-yahoo-mail-ingestion-job-email-tracking plan 01-03
    provides: /api/mail/email-count and /api/mail/emails-by-job API routes
provides:
  - Mail count badge on JobCard (index.tsx) — useQuery with staleTime 60s + initialData { count: 0 }
  - Collapsible EmailThreadSection on job detail page ($id.tsx) — lazy fetch on expand
  - 'generated-from-email' status shown as 'From Email' with orange badge in both pages
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pitfall 5 mitigation: staleTime 60_000 + initialData { count: 0 } on per-card queries to prevent N+1 load spike"
    - "Lazy fetch pattern: enabled: expanded on useQuery so email thread loads only on first section expand"
    - "Re:/Fwd: subject normalisation loop for grouping email threads"

key-files:
  created: []
  modified:
    - src/routes/jobs/index.tsx
    - src/routes/jobs/$id.tsx

key-decisions:
  - "staleTime 60s + initialData { count: 0 } chosen to prevent N+1 HTTP spike when loading jobs list with many cards"
  - "enabled: expanded on email thread query — no network request until user explicitly opens the section"
  - "Email subjects normalised with iterative Re:/Fwd: strip loop to correctly group threaded replies"

patterns-established:
  - "Per-card useQuery with initialData pattern for badge counts"
  - "Collapsible section with enabled: expanded lazy-fetch for heavy sub-resources"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-03-05
---

# Phase 01 Plan 04: UI — Mail Badge and Email Thread Section Summary

**Mail count badge added to JobCard and collapsible EmailThreadSection added to job detail page, both using lazy-fetch patterns to avoid N+1 request storms**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T11:10:54Z
- **Completed:** 2026-03-05T11:13:15Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint)
- **Files modified:** 2

## Accomplishments
- JobCard now shows Mail icon + count inline with title when emailCount > 0; no badge when 0 (no whitespace gap)
- Email count useQuery uses staleTime: 60_000 + initialData: { count: 0 } to avoid N+1 request storm on page load
- Job detail page has collapsible EmailThreadSection at the bottom, lazy-fetching only on first expand
- Emails grouped by normalized subject (Re:/Fwd: stripped), each showing LLM summary by default with Show/Hide full email toggle
- 'generated-from-email' renders as 'From Email' with orange badge in dashboard and plain label in detail page

## Task Commits

Each task was committed atomically:

1. **Task 1: Add mail badge to JobCard + STATUS updates in index.tsx** - `d9de161` (feat)
2. **Task 2: Add collapsible EmailThreadSection to $id.tsx** - `1488aaf` (feat)
3. **Task 3: Visual verification checkpoint** - awaiting human approval

## Files Created/Modified
- `src/routes/jobs/index.tsx` - Mail icon import, STATUS_LABELS/COLORS for 'generated-from-email', email count useQuery in JobCard, Mail badge JSX
- `src/routes/jobs/$id.tsx` - useQuery + ChevronDown/ChevronUp/Mail imports, STATUS_LABELS for 'generated-from-email', JobEmail types, normalizeEmailSubject(), groupEmailsBySubject(), EmailItem, EmailThreadSection components, wired into EditJobPage after form

## Decisions Made
- staleTime 60s + initialData { count: 0 } prevents N+1 HTTP spike when jobs list loads with many cards
- enabled: expanded ensures no network request for email thread until user opens the section
- Iterative Re:/Fwd: strip loop handles nested prefixes (e.g., Re: Re: Fwd: subject)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
Yahoo IMAP credentials needed to verify end-to-end email ingestion and see real mail badge data. See plan frontmatter for setup details:
- YAHOO_IMAP_USER
- YAHOO_IMAP_PASSWORD
- YAHOO_MAIL_FOLDERS
- YAHOO_MAIL_MAX_EMAILS

Without credentials: dashboard and detail page render correctly with no badge (count = 0) and empty email section.

## Next Phase Readiness
- All Phase 01 UI surfaces complete and build-verified
- Awaiting human visual verification (Task 3 checkpoint)
- After approval: Phase 01 is fully complete

---
*Phase: 01-yahoo-mail-ingestion-job-email-tracking*
*Completed: 2026-03-05*
