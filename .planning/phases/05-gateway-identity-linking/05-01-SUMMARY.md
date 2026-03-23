---
phase: 05-gateway-identity-linking
plan: "01"
subsystem: database
tags: [drizzle, postgres, migration, tdd, gateway, identity-linking]

# Dependency graph
requires:
  - phase: 04-user-authentication
    provides: users table with uuid PK that gatewayIdentities and linkingCodes FK-reference
provides:
  - gatewayIdentities Drizzle table definition with provider/externalChatId unique constraint
  - linkingCodes Drizzle table definition with 6-char code and expiry support
  - Migration SQL 0011_add_gateway_identities creating both tables
  - Wave 0 RED test stubs encoding GID-01 through GID-07 behavioral contracts
affects:
  - 05-02 (service implementation must satisfy GID-03/04/05 RED stubs)
  - 05-03 (handler update must satisfy GID-06/07 RED stubs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Wave 0 TDD: schema tests GREEN immediately after schema changes, service/handler tests RED until Plans 02/03

key-files:
  created:
    - src/db/migrations/0011_add_gateway_identities.sql
    - src/db/gateway-identity.test.ts
    - src/services/gateway-identity.test.ts
    - workers/gateway/handler.test.ts
  modified:
    - src/db/schema.ts
    - src/db/migrations/meta/_journal.json

key-decisions:
  - "Array syntax for Drizzle table extras: (t) => [unique().on(...)] — confirmed for drizzle-orm 0.45.1"
  - "Wave 0 test for schema (GID-01/02) placed in GREEN state immediately since schema was added in same plan Task 1; @ts-expect-error not needed"
  - "handler.test.ts uses full Provider mock including start/stop to match interface — plan stub omitted start/stop which would cause TS errors"

patterns-established:
  - "Wave 0 schema tests: import from @/db/schema directly, assert column keys with toBeDefined()"
  - "Wave 0 service tests: vi.mock('@/db') with chained mock return values, @ts-expect-error on missing module import"
  - "Wave 0 handler tests: vi.stubGlobal('fetch', mockFetch) + verify call count and URL patterns"

requirements-completed: [GID-01, GID-02, GID-03, GID-04, GID-05, GID-06, GID-07]

# Metrics
duration: 8min
completed: 2026-03-23
---

# Phase 05 Plan 01: Gateway Identity DB Foundation Summary

**Drizzle schema tables `gatewayIdentities` and `linkingCodes` with FK→users, migration 0011, and three Wave 0 RED test files encoding behavioral contracts for Plans 02/03**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-23T17:33:58Z
- **Completed:** 2026-03-23T17:41:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added `gatewayIdentities` table (provider, externalChatId, userId FK, linkedAt; unique on provider+externalChatId) and `linkingCodes` table (code unique, userId FK, expiresAt, usedAt) to schema.ts
- Created migration SQL `0011_add_gateway_identities.sql` with full DDL including FK constraints and unique constraints
- Updated `_journal.json` with idx=11 entry; applied via `pnpm db:push`
- Created `src/db/gateway-identity.test.ts` (GID-01/02) — 8 tests GREEN
- Created `src/services/gateway-identity.test.ts` (GID-03/04/05) — RED (module not yet created)
- Created `workers/gateway/handler.test.ts` (GID-06/07) — RED (handler not yet updated)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add gatewayIdentities and linkingCodes to schema + migration** - `ed5fbff` (feat)
2. **Task 2: Wave 0 test stubs — RED for GID-01 through GID-07** - `9f21e27` (test)

## Files Created/Modified
- `src/db/schema.ts` — Added `unique` import; appended `linkingCodes` and `gatewayIdentities` table exports
- `src/db/migrations/0011_add_gateway_identities.sql` — DDL for both tables with FK and unique constraints
- `src/db/migrations/meta/_journal.json` — Added idx=11 entry
- `src/db/gateway-identity.test.ts` — Wave 0 schema column assertions for GID-01/GID-02 (GREEN)
- `src/services/gateway-identity.test.ts` — Wave 0 service stubs for GID-03/GID-04/GID-05 (RED)
- `workers/gateway/handler.test.ts` — Wave 0 handler intercept stubs for GID-06/GID-07 (RED)

## Decisions Made
- Drizzle 0.45.1 uses array syntax for table extras: `(t) => [unique().on(...)]` — verified from package.json before writing schema
- Schema test file (`src/db/gateway-identity.test.ts`) is immediately GREEN because Task 1 creates the schema before Task 2 creates the tests — no `@ts-expect-error` needed
- Gateway handler test uses full `Provider` mock (start/stop/send) to satisfy the interface — plan's stub omitted start/stop which would fail TypeScript strict checks

## Deviations from Plan

None — plan executed exactly as written with one minor adjustment: handler test stub added `start` and `stop` to `mockProvider` to match the `Provider` interface exactly (plan example omitted these, which would cause TypeScript errors).

## Issues Encountered
None — `pnpm db:push` applied cleanly; all three test verification states confirmed as expected (GREEN/RED/RED).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DB foundation complete — Plans 02 and 03 can now implement against established table definitions
- GID-03/04/05 RED stubs ready for Plan 02 (`src/services/gateway-identity.ts` implementation)
- GID-06/07 RED stubs ready for Plan 03 (handler.ts update with `/link` intercept and identity resolution)

---
*Phase: 05-gateway-identity-linking*
*Completed: 2026-03-23*
