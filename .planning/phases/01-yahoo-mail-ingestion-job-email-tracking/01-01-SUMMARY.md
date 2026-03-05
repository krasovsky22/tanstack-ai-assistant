---
phase: 01-yahoo-mail-ingestion-job-email-tracking
plan: "01"
subsystem: database
tags: [drizzle, postgresql, imap, vitest, job-emails, migration]

# Dependency graph
requires: []
provides:
  - job_emails PostgreSQL table with 9 columns, FK to jobs (onDelete: set null), and job_id index
  - jobEmails Drizzle table definition exported from src/db/schema.ts
  - generated-from-email status in JOB_STATUSES constant
  - YAHOO_IMAP_* env vars documented in .env.example with App Password warning
  - Wave 0 test scaffold for mail-ingestion service (6 tests, RED until Plan 02)
  - Wave 0 test scaffold for email-count API route (2 tests, RED until Plan 03)
affects:
  - 01-02 (mail-ingestion service — imports jobEmails from schema, must satisfy test scaffold)
  - 01-03 (email-count route — must satisfy test scaffold)
  - 01-04 (dashboard badges — uses jobEmails table)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 TDD: test scaffolds created before implementation files exist, intentionally RED"
    - "Drizzle migration journal must be kept in sync with __drizzle_migrations DB table for migrate to work"

key-files:
  created:
    - src/db/migrations/0008_add_job_emails_table.sql
    - src/db/migrations/meta/_journal.json (updated to include 0001-0008)
    - src/services/mail-ingestion.test.ts
    - src/routes/api/mail/email-count.test.ts
  modified:
    - src/db/schema.ts
    - src/lib/job-constants.ts
    - .env.example

key-decisions:
  - "Repaired Drizzle migration journal (_journal.json) to include all migrations 0000-0008 and back-filled __drizzle_migrations tracking table — prior migrations were applied via db:push without journal entries"
  - "jobId column is nullable (no .notNull()) to support orphaned email records when a matched job is deleted"
  - "Wave 0 test scaffolds use @ts-expect-error on imports of non-existent files — expected behavior until Plans 02/03 create implementations"

patterns-established:
  - "Migration journal must match DB tracking table: when using db:push, also update _journal.json and insert hash rows into drizzle.__drizzle_migrations"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 01 Plan 01: Data Foundation for Yahoo Mail Ingestion Summary

**PostgreSQL job_emails table (9 columns, FK to jobs, job_id index) with Drizzle schema, generated-from-email status constant, YAML IMAP env vars, and two Wave 0 TDD test scaffolds for Plans 02 and 03**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-05T10:40:59Z
- **Completed:** 2026-03-05T10:43:54Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Created and applied SQL migration 0008_add_job_emails_table.sql — table now exists in PostgreSQL with 9 columns, FK to jobs (onDelete: SET NULL), and job_emails_job_id_idx index
- Appended jobEmails Drizzle table definition to schema.ts and added 'generated-from-email' to JOB_STATUSES
- Created two Wave 0 test scaffolds (mail-ingestion.test.ts with 6 tests, email-count.test.ts with 2 tests) that are intentionally RED until Plans 02/03 create their implementations

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration + Drizzle schema + job-constants + env vars** - `9008fc0` (feat)
2. **Task 2: Create mail-ingestion test scaffold (Wave 0)** - `2ae34ed` (test)
3. **Task 3: Create email-count test scaffold (Wave 0)** - `321d06c` (test)

## Files Created/Modified
- `src/db/migrations/0008_add_job_emails_table.sql` - DDL for job_emails table with index on job_id
- `src/db/migrations/meta/_journal.json` - Updated to include all migrations 0000-0008
- `src/db/schema.ts` - Added jobEmails pgTable definition after cronjobLogs
- `src/lib/job-constants.ts` - Added 'generated-from-email' to JOB_STATUSES array
- `.env.example` - Added YAHOO_IMAP_USER, YAHOO_IMAP_PASSWORD (with App Password warning), YAHOO_MAIL_FOLDERS, YAHOO_MAIL_MAX_EMAILS
- `src/services/mail-ingestion.test.ts` - Wave 0 test scaffold: vi.mock for imapflow/@tanstack/ai/@db, 6 tests across 3 describe blocks
- `src/routes/api/mail/email-count.test.ts` - Wave 0 test stub: vi.mock for @/db and drizzle-orm, 2 tests for GET handler

## Decisions Made
- **Repaired Drizzle migration journal:** The _journal.json only had entry 0000 and __drizzle_migrations had 0 rows (migrations were previously applied via db:push). Fixed by updating the journal to include all 8 existing migrations and back-filling hash rows into drizzle.__drizzle_migrations. This lets pnpm db:migrate work correctly going forward.
- **Nullable jobId:** Column defined without .notNull() so email records survive job deletion via onDelete: SET NULL — matches the DDL.
- **@ts-expect-error on Wave 0 imports:** Added to suppress TypeScript errors on imports of files that don't exist yet. This is intentional Wave 0 TDD behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Repaired Drizzle migration tracking state**
- **Found during:** Task 1 (running pnpm db:migrate)
- **Issue:** _journal.json had only migration 0000; __drizzle_migrations DB table had 0 rows. Drizzle tried to re-run all migrations from 0000, failing because tables already exist.
- **Fix:** Updated _journal.json to include entries for all 9 migrations (0000-0008). Back-filled 8 hash rows into drizzle.__drizzle_migrations so Drizzle treats 0000-0007 as already applied and only runs 0008.
- **Files modified:** src/db/migrations/meta/_journal.json
- **Verification:** pnpm db:migrate exits 0, job_emails table confirmed via \d job_emails in PostgreSQL
- **Committed in:** 9008fc0 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix — without it, the migration could not run. No scope creep.

## Issues Encountered
- Drizzle migration journal was out of sync with DB (migrations applied via db:push bypass journal tracking). Fixed as a blocking deviation — see above.

## User Setup Required
Add these environment variables to your `.env` file before using IMAP ingestion:
- `YAHOO_IMAP_USER` — your full Yahoo email address
- `YAHOO_IMAP_PASSWORD` — a 16-character App Password from myaccount.yahoo.com (NOT your login password)
- `YAHOO_MAIL_FOLDERS` — defaults to `INBOX`
- `YAHOO_MAIL_MAX_EMAILS` — defaults to `50`

## Next Phase Readiness
- job_emails table exists in PostgreSQL, jobEmails exported from schema — Plans 02 and 03 can import immediately
- mail-ingestion.test.ts defines the exact contract Plan 02 must satisfy (normalizeSubject, getSearchSince, runIngestion)
- email-count.test.ts defines the contract Plan 03 must satisfy (GET handler returning { count: number })

---
*Phase: 01-yahoo-mail-ingestion-job-email-tracking*
*Completed: 2026-03-05*

## Self-Check: PASSED

All files verified present. All commits verified in git log.
