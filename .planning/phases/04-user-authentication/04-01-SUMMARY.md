---
phase: 04-user-authentication
plan: "01"
subsystem: database
tags: [postgres, drizzle, bcryptjs, migrations, auth, tdd]

requires: []
provides:
  - "users table in PostgreSQL with id (uuid), username (unique), password_hash, created_at"
  - "userId nullable uuid FK on jobs, cronjobs, cronjob_logs tables"
  - "pnpm create-user CLI script (bcrypt cost 12)"
  - "bcryptjs installed as dependency"
  - "SESSION_SECRET documented in .env.example"
affects:
  - 04-02-login-route
  - 04-03-protected-layout
  - 04-04-api-scoping

tech-stack:
  added:
    - "bcryptjs 3.0.3 — password hashing at cost 12"
    - "@types/bcryptjs 3.0.0 — TS stubs (stub types, bcryptjs ships own defs)"
  patterns:
    - "Wave 0 TDD stubs: test file created with failing assertions before implementation"
    - "uuid FK type: FK columns referencing uuid PKs must also be uuid (not text)"
    - "Migration journal: append entries to _journal.json matching SQL migration files"

key-files:
  created:
    - "src/db/migrations/0009_add_users_table.sql"
    - "src/db/migrations/0010_add_user_id_to_tables.sql"
    - "scripts/create-user.mjs"
    - "src/db/schema.test.ts"
    - "src/db/user-scoping.test.ts"
  modified:
    - "src/db/schema.ts"
    - "src/db/migrations/meta/_journal.json"
    - "package.json"
    - ".env.example"

key-decisions:
  - "FK columns referencing users.id (uuid) must use uuid type — text FK causes type mismatch in PostgreSQL"
  - "userId FK added as uuid (not text) on jobs/cronjobs/cronjobLogs — matches users.id PK type"
  - "Wave 0 test stubs use (as any).userId for Drizzle column access — avoids TS type widening issues"

patterns-established:
  - "uuid FK pattern: always match FK column type to PK type of referenced table"
  - "Wave 0 RED stubs: create test files before schema changes to verify RED state, then confirm GREEN after"

requirements-completed:
  - AUTH-01
  - AUTH-05
  - AUTH-06

duration: 4min
completed: "2026-03-18"
---

# Phase 04 Plan 01: DB Foundation — users table, userId FKs, bcryptjs, create-user script

**PostgreSQL users table with bcrypt-hashed password storage, nullable userId UUID FK on jobs/cronjobs/cronjobLogs, and CLI user-creation script wired as `pnpm create-user`**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T08:57:16Z
- **Completed:** 2026-03-18T09:01:38Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Created `users` table with `id` (uuid PK), `username` (unique), `password_hash`, `created_at` via migration 0009
- Added nullable `user_id uuid` FK to `jobs`, `cronjobs`, `cronjob_logs` via migration 0010
- Wave 0 TDD stubs confirmed RED before schema changes, GREEN after
- `pnpm create-user <username> <password>` script verified working with bcrypt cost-12 hashing

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 test stubs (RED)** - `41e6cdc` (test)
2. **Task 2: Install bcryptjs, migrations, schema, create-user** - `fa016c8` (feat)

## Files Created/Modified

- `src/db/schema.ts` — added `users` pgTable export; added `userId` uuid FK to `jobs`, `cronjobs`, `cronjobLogs`
- `src/db/migrations/0009_add_users_table.sql` — CREATE TABLE users DDL
- `src/db/migrations/0010_add_user_id_to_tables.sql` — ALTER TABLE jobs/cronjobs/cronjob_logs ADD COLUMN user_id uuid
- `src/db/migrations/meta/_journal.json` — appended idx 9 and 10 entries
- `scripts/create-user.mjs` — CLI user-creation script with bcrypt hash, 24+ lines
- `package.json` — added `create-user` script + bcryptjs dependency
- `.env.example` — added SESSION_SECRET with generation instructions
- `src/db/schema.test.ts` — Wave 0 RED stub for users export
- `src/db/user-scoping.test.ts` — Wave 0 RED stubs asserting jobs/cronjobs/cronjobLogs userId

## Decisions Made

- FK columns use `uuid` type (not `text`) to match the `users.id` uuid PK — PostgreSQL rejects type mismatch in foreign key constraints
- Wave 0 tests use `(table as any).userId` to access Drizzle column config dynamically without TS widening errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FK column type changed from text to uuid**
- **Found during:** Task 2 (running `pnpm db:migrate` after writing migrations)
- **Issue:** Migration 0010 used `text` for `user_id` FK column; PostgreSQL rejected it because `users.id` is `uuid` — "Key columns user_id and id are of incompatible types: text and uuid"
- **Fix:** Changed `user_id text REFERENCES` to `user_id uuid REFERENCES` in 0010 SQL; updated Drizzle schema.ts FK columns from `text('user_id')` to `uuid('user_id')`
- **Files modified:** `src/db/migrations/0010_add_user_id_to_tables.sql`, `src/db/schema.ts`
- **Verification:** `pnpm db:migrate` exited 0; all 4 DB columns confirmed present via information_schema query
- **Committed in:** `fa016c8` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Necessary correctness fix — PostgreSQL requires FK column type to match referenced PK type. No scope creep.

## Issues Encountered

- First migration run failed with FK type mismatch (text vs uuid). Since migration 0009 and 0010 ran in a single transaction, the rollback was clean — both were pending on retry. Fixed by changing FK column type to uuid and re-running.

## User Setup Required

The plan documented a `user_setup` section requiring `SESSION_SECRET`. This env var is documented in `.env.example` but is consumed by later plans (login route). No external service configuration is required for this plan.

**For future plans:** Generate SESSION_SECRET before running login route:
```
openssl rand -base64 32
```

## Next Phase Readiness

- `users` table live in DB with correct schema
- Drizzle schema exports `users` and `userId` FK on all three target tables
- `pnpm create-user` script verified working
- `bcryptjs` available for reuse in login route (plan 04-02)
- Wave 0 tests GREEN — ready for session/auth implementation

---
*Phase: 04-user-authentication*
*Completed: 2026-03-18*
