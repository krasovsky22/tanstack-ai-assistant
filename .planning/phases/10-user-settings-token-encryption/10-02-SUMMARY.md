---
phase: 10-user-settings-token-encryption
plan: "02"
subsystem: security
tags: [aes-256-gcm, encryption, node:crypto, user-settings, pat]

# Dependency graph
requires:
  - phase: 10-01
    provides: test scaffolds for crypto (ENC-01 through ENC-07) and user-settings (ENC-05, ENC-06)
provides:
  - AES-256-GCM encrypt/decrypt helpers in src/lib/crypto.ts
  - Encrypt-on-write, decrypt-on-read for jiraPat and githubPat in user-settings service
  - ENCRYPTION_KEY env var documentation in .env.example and CLAUDE.md
affects: [user-settings, jira-integration, github-mcp, future-phases-reading-pats]

# Tech tracking
tech-stack:
  added: [node:crypto (createCipheriv, createDecipheriv, randomBytes) — built-in, no package install]
  patterns:
    - "enc: prefix sentinel for stored ciphertext — allows safe null on legacy plaintext"
    - "blob layout: iv (12 bytes) || authTag (16 bytes) || ciphertext — all in single base64 blob"
    - "Encrypt-on-write / decrypt-on-read at service boundary — API layer unaware, receives plaintext"
    - "Module-level startup validation — throw at import time if ENCRYPTION_KEY missing or invalid"

key-files:
  created:
    - src/lib/crypto.ts
  modified:
    - src/services/user-settings.ts
    - .env.example
    - CLAUDE.md

key-decisions:
  - "enc: prefix sentinel allows null return for legacy plaintext PATs (no re-encryption needed, user re-enters)"
  - "Service boundary encryption — API routes remain unmodified; masking layer (••••••••) unchanged"
  - "Startup validation throws at module load time — prevents silent operation with missing key"
  - "Non-secret fields (jiraBaseUrl, jiraEmail, jiraDefaultProject) are not encrypted — only PAT fields"

patterns-established:
  - "Encrypt-on-write, decrypt-on-read pattern at service layer — transparent to API routes and tool callers"
  - "TDD: test stubs created in prior plan (10-01), implementation in this plan turns them GREEN"

requirements-completed: [ENC-01, ENC-02, ENC-03, ENC-04, ENC-05, ENC-06, ENC-07, ENC-08]

# Metrics
duration: 8min
completed: 2026-04-06
---

# Phase 10 Plan 02: User Settings Token Encryption Summary

**AES-256-GCM field-level encryption for jiraPat and githubPat using node:crypto, with encrypt-on-write and decrypt-on-read at the service boundary**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-06T11:38:51Z
- **Completed:** 2026-04-06T11:41:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `src/lib/crypto.ts` with AES-256-GCM encrypt/decrypt using 12-byte random IV per call and startup key validation
- Updated `src/services/user-settings.ts` to encrypt PATs on write and decrypt on read — API layer completely unaware
- Documented ENCRYPTION_KEY in `.env.example` (with generation instructions) and `CLAUDE.md` Environment Variables section
- All 49 tests pass GREEN, including 7 crypto tests (ENC-01 through ENC-04, ENC-07) and 3 user-settings tests (ENC-05, ENC-06)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/lib/crypto.ts** - `aa6d769` (feat)
2. **Task 2: Wire encrypt/decrypt into user-settings.ts + document ENCRYPTION_KEY** - `42e1733` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/lib/crypto.ts` — AES-256-GCM encrypt/decrypt with startup validation; blob = iv(12) || tag(16) || ciphertext
- `src/services/user-settings.ts` — Added encrypt-on-write for jiraPat/githubPat in upsertUserSettings(); decrypt-on-read in getUserSettings()
- `.env.example` — Added Security section with ENCRYPTION_KEY entry and openssl generation command
- `CLAUDE.md` — Added ENCRYPTION_KEY to Environment Variables section, marked as required

## Decisions Made
- `enc:` prefix sentinel allows `decrypt()` to return `null` for legacy plaintext values — callers treat null as "not set", prompting user to re-enter PAT
- Service boundary encryption keeps API routes unchanged; the existing `••••••••` masking logic in `src/routes/api/user-settings.tsx` continues to work as-is since it receives plaintext from `getUserSettings()`
- `upsertUserSettings()` receives plaintext from the API layer (the PUT handler resolves the mask before calling the service), so no double-encryption risk

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**ENCRYPTION_KEY must be added to your `.env` file before starting the app:**

```bash
# Generate key
openssl rand -hex 32

# Add to .env
ENCRYPTION_KEY=<output from above>
```

Without this, the app will throw `Error: ENCRYPTION_KEY must be set and be exactly 64 hex chars` at startup.

## Next Phase Readiness
- PAT encryption complete — all user PAT fields (jiraPat, githubPat) are encrypted at rest
- Phase 10 is now complete (both 10-01 and 10-02 done)
- Existing code calling `getUserSettings()` receives plaintext as before — zero migration needed for callers
- Legacy stored plaintext PATs will return null (users prompted to re-enter) — acceptable behavior per plan spec

---
*Phase: 10-user-settings-token-encryption*
*Completed: 2026-04-06*
