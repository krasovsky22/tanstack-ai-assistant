---
phase: 01-yahoo-mail-ingestion-job-email-tracking
plan: "02"
subsystem: api
tags: [imapflow, mailparser, imap, yahoo, email-ingestion, llm-classification, drizzle]

# Dependency graph
requires:
  - phase: 01-01
    provides: jobEmails table, jobs table schema, mail-ingestion.test.ts scaffold
provides:
  - runIngestion() — full IMAP+LLM pipeline writing job_emails rows
  - fetchRawEmails() — read-only IMAP fetch for debugging
  - normalizeSubject(), getSearchSince() utility exports
  - POST /api/mail/ingest — triggers ingestion, returns summary JSON
  - GET /api/mail/emails — returns raw Yahoo emails without DB writes
affects:
  - 01-03
  - 01-04

# Tech tracking
tech-stack:
  added: [imapflow@1.2.11, mailparser@3.9.3, "@types/mailparser@3.4.6"]
  patterns:
    - Per-request IMAP open/operate/close (no persistent connection)
    - DB write before messageFlagsAdd to avoid data loss on failure
    - Per-folder try/catch so invalid folders skip without aborting ingestion
    - null part in download() for full RFC822 parsing via simpleParser

key-files:
  created:
    - src/services/mail-ingestion.ts
    - src/routes/api/mail/ingest.tsx
    - src/routes/api/mail/emails.tsx
  modified:
    - package.json
    - pnpm-lock.yaml
    - src/routeTree.gen.ts

key-decisions:
  - "download() called with null part (not 'RFC822') for full message body — simpleParser requires raw stream, not a named part"
  - "DB insert(jobEmails) before messageFlagsAdd — ensures email is re-processable if DB write fails (pitfall 3)"
  - "Per-folder getMailboxLock wrapped in try/catch — invalid folder logs warning and continues rather than aborting all ingestion (pitfall 7)"
  - "ilike match requires both company and title to be non-null and non-Unknown to prevent hallucination matches (pitfall 6)"

patterns-established:
  - "IMAP session pattern: connect once, iterate folders, release lock per folder in finally, logout in outer finally"
  - "TanStack Start route pattern: createFileRoute with server.handlers for API-only routes"

requirements-completed: []

# Metrics
duration: 2min
completed: "2026-03-05"
---

# Phase 1 Plan 02: Mail Ingestion Service Summary

**Yahoo IMAP ingestion pipeline with LLM classification, job matching/auto-creation, and read-only raw-fetch endpoint using imapflow and mailparser**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T11:06:25Z
- **Completed:** 2026-03-05T11:08:58Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Full IMAP ingestion pipeline: connect to Yahoo, search unread emails from last 10 days, classify each via LLM, match or auto-create jobs, persist to job_emails, mark as read
- Read-only fetchRawEmails() for debugging without side effects
- Both API routes registered in TanStack Router route tree — build exits 0
- All 6 mail-ingestion.test.ts tests pass green

## Task Commits

Each task was committed atomically:

1. **Task 1: Build src/services/mail-ingestion.ts** - `8581529` (feat)
2. **Task 2: Create POST /api/mail/ingest and GET /api/mail/emails routes** - `54c4424` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `src/services/mail-ingestion.ts` — Core ingestion service: runIngestion, fetchRawEmails, normalizeSubject, getSearchSince
- `src/routes/api/mail/ingest.tsx` — POST /api/mail/ingest endpoint
- `src/routes/api/mail/emails.tsx` — GET /api/mail/emails endpoint
- `package.json` / `pnpm-lock.yaml` — Added imapflow, mailparser, @types/mailparser
- `src/routeTree.gen.ts` — Auto-updated with new mail routes

## Decisions Made

- Used `null` as the `part` argument to `client.download()` instead of `'RFC822'` — simpleParser needs the full raw stream, not a named MIME part.
- DB write before messageFlagsAdd: if the DB insert fails the email will be re-fetched on the next run, preventing silent data loss.
- Per-folder try/catch around `getMailboxLock` so a misconfigured or missing folder name skips gracefully and the remaining folders still process.
- ilike match guards against null and 'Unknown' values to avoid false job matches from LLM hallucinations.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required beyond the environment variables documented in CLAUDE.md (`YAHOO_IMAP_USER`, `YAHOO_IMAP_PASSWORD`, `YAHOO_MAIL_FOLDERS`, `YAHOO_MAIL_MAX_EMAILS`).

## Next Phase Readiness

- Mail ingestion service fully implemented with test coverage
- API routes registered and TypeScript-clean
- Ready for Plan 01-03 (dashboard integration / job detail mail view)

---
*Phase: 01-yahoo-mail-ingestion-job-email-tracking*
*Completed: 2026-03-05*

## Self-Check: PASSED

- FOUND: src/services/mail-ingestion.ts
- FOUND: src/routes/api/mail/ingest.tsx
- FOUND: src/routes/api/mail/emails.tsx
- FOUND: commit 8581529 (feat: mail-ingestion service)
- FOUND: commit 54c4424 (feat: API routes)
