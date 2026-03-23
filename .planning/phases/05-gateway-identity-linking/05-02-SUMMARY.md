---
phase: 05-gateway-identity-linking
plan: "02"
subsystem: api
tags: [drizzle, postgres, tdd, gateway, identity-linking, api-routes, tanstack-router]

# Dependency graph
requires:
  - phase: 05-01
    provides: gatewayIdentities and linkingCodes Drizzle table definitions + Wave 0 RED test stubs
  - phase: 04-user-authentication
    provides: useAppSession() and session-gated route pattern
provides:
  - src/services/gateway-identity.ts with 6 exported functions (generateLinkingCode, createLinkingCode, redeemLinkingCode, getGatewayIdentitiesForUser, deleteGatewayIdentity, resolveGatewayIdentity)
  - GET+DELETE /api/gateway-identities — list and unlink identity endpoints
  - POST+PUT /api/gateway-link — generate and redeem linking code endpoints
  - Public resolve endpoint GET /api/gateway-identities?provider=X&chatId=Y for gateway worker
affects:
  - 05-03 (gateway handler update uses resolveGatewayIdentity and PUT /api/gateway-link)
  - 05-04 (Settings UI uses GET/DELETE /api/gateway-identities and POST /api/gateway-link)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Atomic update+returning() pattern for optimistic locking on linking code redemption
    - onConflictDoUpdate for idempotent gateway identity upsert on re-link
    - Dynamic imports inside TanStack Router server handlers for tree-shaking

key-files:
  created:
    - src/services/gateway-identity.ts
    - src/routes/api/gateway-identities.tsx
    - src/routes/api/gateway-link.tsx
  modified: []

key-decisions:
  - "redeemLinkingCode uses single UPDATE...WHERE (isNull+gt expiry) returning() — atomic claim prevents double-redemption without explicit transaction"
  - "Public resolve endpoint on GET /api/gateway-identities uses query params (provider+chatId) rather than separate route — avoids extra file and route registration"
  - "PUT /api/gateway-link is public (no session) — gateway worker has no user session; security is the one-time code itself"

patterns-established:
  - "Atomic code redemption: UPDATE with isNull(usedAt) + gt(expiresAt, now) in WHERE clause returns claimed row or undefined — single DB call, no race condition"
  - "Route handler multiplex: single GET handler checks query params to serve two different response shapes (resolve vs list)"

requirements-completed: [GID-03, GID-04, GID-05]

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 05 Plan 02: Gateway Identity Service and API Routes Summary

**6-function gateway identity service with atomic linking-code redemption and 5-endpoint REST API using onConflictDoUpdate upsert for idempotent Telegram account linking**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T09:39:27Z
- **Completed:** 2026-03-23T09:42:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Implemented `src/services/gateway-identity.ts` with all 6 exported functions; GID-03/04/05 Wave 0 RED tests now GREEN
- Created `GET+DELETE /api/gateway-identities` — authenticated list/unlink plus public resolve (provider+chatId query params) for gateway worker
- Created `POST+PUT /api/gateway-link` — session-gated code generation (201) and public code redemption (200/400)
- Full test suite (16 tests, 5 files) passes with no regressions; `pnpm build` completes cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: gateway-identity service** - `bec3d32` (feat)
2. **Task 2: API routes — gateway-identities and gateway-link** - `4a08ecc` (feat)

## Files Created/Modified
- `src/services/gateway-identity.ts` — 6 exported functions: generateLinkingCode, createLinkingCode, redeemLinkingCode, getGatewayIdentitiesForUser, deleteGatewayIdentity, resolveGatewayIdentity
- `src/routes/api/gateway-identities.tsx` — GET (list + resolve) and DELETE (unlink) handlers
- `src/routes/api/gateway-link.tsx` — POST (generate code) and PUT (redeem code) handlers

## Decisions Made
- `redeemLinkingCode` uses a single `UPDATE...WHERE isNull(usedAt) AND gt(expiresAt, now)` with `.returning()` — atomically claims the code in one DB round-trip; no separate SELECT needed
- Public resolve endpoint shares `/api/gateway-identities` with query params rather than a separate `/api/resolve` route — reduces route surface area
- `PUT /api/gateway-link` is intentionally public — the gateway worker has no user session and security is enforced by the one-time code expiry mechanism

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — service tests moved from RED to GREEN immediately; build passed on first attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Service layer and REST API complete — Plan 03 (gateway handler) can now call `resolveGatewayIdentity` and `PUT /api/gateway-link`
- Plan 04 (Settings UI) can now call `GET/DELETE /api/gateway-identities` and `POST /api/gateway-link`
- All GID-03/04/05 requirements satisfied

---
*Phase: 05-gateway-identity-linking*
*Completed: 2026-03-23*

## Self-Check: PASSED
- src/services/gateway-identity.ts — FOUND
- src/routes/api/gateway-identities.tsx — FOUND
- src/routes/api/gateway-link.tsx — FOUND
- Commit bec3d32 — FOUND
- Commit 4a08ecc — FOUND
