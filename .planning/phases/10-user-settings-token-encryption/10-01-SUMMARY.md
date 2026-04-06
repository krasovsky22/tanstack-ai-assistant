---
phase: 10-user-settings-token-encryption
plan: "01"
subsystem: testing
tags: [vitest, tdd, encryption, crypto, user-settings, aes-gcm]

# Dependency graph
requires: []
provides:
  - RED test stubs for AES-256-GCM crypto module (ENC-01 through ENC-04, ENC-07)
  - RED test stubs for user-settings service encrypt/decrypt wiring (ENC-05, ENC-06)
affects: [10-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.hoisted() for mock functions referenced inside vi.mock() factory — avoids hoisting ReferenceError"
    - "Dynamic import with process.env set in beforeAll() for testing module-load-time validation"
    - "Query string cache-bust on dynamic import path (import('@/lib/crypto?bust=' + Date.now())) for Vitest module isolation"

key-files:
  created:
    - src/lib/crypto.test.ts
    - src/services/user-settings.test.ts
  modified: []

key-decisions:
  - "vi.hoisted() used for mockLimit/mockReturning — vi.mock factory hoisting causes ReferenceError when referencing outer let/const variables"
  - "Dynamic import with bust-cache query string for ENC-07 — tests module-load-time ENCRYPTION_KEY validation without top-level import"

patterns-established:
  - "vi.hoisted() pattern: hoist mock function refs used inside vi.mock factory to avoid ReferenceError"

requirements-completed:
  - ENC-01
  - ENC-02
  - ENC-03
  - ENC-04
  - ENC-05
  - ENC-06
  - ENC-07

# Metrics
duration: 2min
completed: 2026-04-06
---

# Phase 10 Plan 01: User Settings Token Encryption - Wave 0 RED Tests Summary

**Vitest RED stubs for AES-256-GCM field-level encryption: 7 crypto tests (ENC-01/02/03/04/07) and 3 service tests (ENC-05/06) that fail because crypto.ts and encrypt/decrypt wiring do not exist yet**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-06T11:34:48Z
- **Completed:** 2026-04-06T11:36:48Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `src/lib/crypto.test.ts` with 7 test cases covering ENC-01 through ENC-04 and ENC-07 — all RED (import failure, no crypto.ts)
- Created `src/services/user-settings.test.ts` with 3 test cases covering ENC-05 and ENC-06 — all RED (service doesn't call encrypt/decrypt yet)
- Confirmed correct RED state: crypto tests skip due to missing module; user-settings tests assert against behavior not yet implemented

## Task Commits

Each task was committed atomically:

1. **Task 1: Write crypto.test.ts — RED stubs for ENC-01 through ENC-04 and ENC-07** - `5d8f8c3` (test)
2. **Task 2: Write user-settings.test.ts — RED stubs for ENC-05 and ENC-06** - `01db279` (test)

**Plan metadata:** (docs commit follows)

_Note: TDD Wave 0 — test-only commits, no implementation_

## Files Created/Modified
- `src/lib/crypto.test.ts` - Wave 0 RED tests: round-trip (ENC-01), random IV (ENC-02), legacy plaintext null (ENC-03), tampered ciphertext null (ENC-04), missing key throws (ENC-07)
- `src/services/user-settings.test.ts` - Wave 0 RED tests: upsertUserSettings encrypts PATs (ENC-05), getUserSettings decrypts PATs (ENC-06), legacy plaintext returns null (ENC-06)

## Decisions Made
- `vi.hoisted()` used for `mockLimit` and `mockReturning` mock functions — the plain `let` approach causes a Vitest hoisting ReferenceError when `vi.mock()` factory runs before variable initialization. `vi.hoisted()` is the correct Vitest pattern for this scenario.
- Dynamic import bust-cache query string (`import('@/lib/crypto?bust=' + Date.now())`) used for ENC-07 tests — allows testing module-load-time ENCRYPTION_KEY validation by bypassing Vitest's module cache per test invocation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vi.mock ReferenceError via vi.hoisted() pattern**
- **Found during:** Task 2 (user-settings.test.ts)
- **Issue:** Plan's `vi.mock` factory referenced outer `mockLimit`/`mockReturning` variables but `vi.mock` is hoisted before variable initialization, causing `ReferenceError: Cannot access 'mockLimit' before initialization`
- **Fix:** Wrapped mock function definitions in `vi.hoisted()` call which runs before `vi.mock` hoisting
- **Files modified:** src/services/user-settings.test.ts
- **Verification:** Test file collected successfully, all 3 tests reached assertion phase (RED for correct reasons)
- **Committed in:** 01db279 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Required for test file to execute at all. No scope creep — still Wave 0 RED stubs as specified.

## Issues Encountered
None beyond the vi.hoisted() deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Wave 0 RED tests in place — Plan 02 can proceed to implement `src/lib/crypto.ts` and update `user-settings.ts` to call encrypt/decrypt
- Tests define the exact contract: `enc:` prefix, round-trip, random IV, null for legacy, null for tampered, key validation at load
- Both test files syntax-valid and discoverable by `pnpm test`

---
*Phase: 10-user-settings-token-encryption*
*Completed: 2026-04-06*
