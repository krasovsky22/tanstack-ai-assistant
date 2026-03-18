---
phase: 04-user-authentication
plan: "02"
subsystem: auth
tags: [tanstack-router, session, cookie-auth, pathless-layout, protected-routes, login, bcryptjs]

requires:
  - phase: 04-01
    provides: "users table in PostgreSQL, bcryptjs installed, SESSION_SECRET documented"
provides:
  - "useAppSession() typed wrapper around @tanstack/react-start/server useSession"
  - "fetchUser createServerFn + root route beforeLoad returning { user } in context"
  - "Login page at /login with loginFn (POST) and logoutFn (POST) server functions"
  - "Pathless _protected layout route — beforeLoad throws redirect to /login if !context.user"
  - "All page routes moved under /_protected/ — URLs unchanged (/jobs, /conversations, etc.)"
  - "IconRail/ChatSidebar suppressed when pathname === '/login'"
affects:
  - 04-03-api-scoping
  - 04-04-logout-ui

tech-stack:
  added: []
  patterns:
    - "Pathless layout route: _protected.tsx with /_protected prefix — children keep original URL paths"
    - "Root route context hydration: beforeLoad returns { user } from createServerFn calling useAppSession()"
    - "Session cookie pattern: httpOnly, sameSite=lax, secure=prod-only via useSession()"

key-files:
  created:
    - "src/services/session.ts"
    - "src/routes/login.tsx"
    - "src/routes/_protected.tsx"
    - "src/routes/_protected/index.tsx"
    - "src/routes/_protected/conversations.tsx"
    - "src/routes/_protected/conversations/$id.tsx"
    - "src/routes/_protected/conversations/index.tsx"
    - "src/routes/_protected/conversations/new.tsx"
    - "src/routes/_protected/jobs.tsx"
    - "src/routes/_protected/jobs/$id.tsx"
    - "src/routes/_protected/jobs/index.tsx"
    - "src/routes/_protected/jobs/new.tsx"
    - "src/routes/_protected/jobs/extract-from-url.tsx"
    - "src/routes/_protected/cronjobs.tsx"
    - "src/routes/_protected/cronjobs/$id.tsx"
    - "src/routes/_protected/cronjobs/$id/index.tsx"
    - "src/routes/_protected/cronjobs/$id/logs.tsx"
    - "src/routes/_protected/cronjobs/index.tsx"
    - "src/routes/_protected/cronjobs/new.tsx"
    - "src/routes/_protected/mail.tsx"
    - "src/routes/_protected/mail/index.tsx"
    - "src/routes/_protected/knowledge-base.tsx"
    - "src/routes/_protected/knowledge-base/index.tsx"
  modified:
    - "src/routes/__root.tsx"
    - "src/routeTree.gen.ts"

key-decisions:
  - "All old route files deleted after copying to _protected/ — TanStack Router file-based routing requires no duplicate path registrations"
  - "loginFn returns { error } on bad credentials instead of throwing — allows client to display error without redirect"
  - "logoutFn exported from login.tsx for reuse in future logout UI (plan 04-04)"

patterns-established:
  - "Pathless layout auth guard: createFileRoute('/_protected') with beforeLoad checking context.user"
  - "Root context hydration pattern: beforeLoad on createRootRoute returning { user } from server function"

requirements-completed:
  - AUTH-02
  - AUTH-03
  - AUTH-04

duration: 11min
completed: "2026-03-18"
---

# Phase 04 Plan 02: Auth Wiring — Session Service, Login Page, Protected Layout Summary

**Cookie session auth wired to TanStack Router: useAppSession() service, root context hydration, /login page with bcrypt validation, and pathless _protected layout guarding all existing page routes**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-18T09:04:31Z
- **Completed:** 2026-03-18T09:15:43Z
- **Tasks:** 2
- **Files modified:** 25

## Accomplishments

- Created `src/services/session.ts` with `useAppSession()` typed wrapper (httpOnly cookie, sameSite=lax)
- Added `fetchUser` createServerFn and `beforeLoad` to root route — hydrates `context.user` on every navigation
- Created `/login` page with `loginFn` (bcrypt password check, session.update on success) and `logoutFn` (session.clear)
- Created `src/routes/_protected.tsx` pathless layout — throws `redirect({ to: '/login' })` when `context.user` is null
- Moved all 21 page route files under `src/routes/_protected/` with updated createFileRoute paths
- AppLayout suppresses IconRail and ChatSidebar when `pathname === '/login'`
- `pnpm build` exits 0 — no TypeScript errors, routeTree.gen.ts regenerated

## Task Commits

Each task was committed atomically:

1. **Task 1: Session service + root user hydration + login/logout routes** - `dfb1ea5` (feat)
2. **Task 2: Create _protected layout + move all page routes under _protected/** - `374f22a` (feat)

## Files Created/Modified

- `src/services/session.ts` — useAppSession() typed wrapper using @tanstack/react-start/server useSession
- `src/routes/__root.tsx` — added fetchUser createServerFn, beforeLoad returning { user }, isLoginPage suppression logic
- `src/routes/login.tsx` — loginFn (POST, bcrypt verify, session.update), logoutFn (POST, session.clear), LoginPage Chakra UI form
- `src/routes/_protected.tsx` — pathless layout, beforeLoad throws redirect('/login') if !context.user
- `src/routes/_protected/index.tsx` — moved from routes/index.tsx, route path /_protected/
- `src/routes/_protected/conversations*.tsx` — moved from routes/conversations*
- `src/routes/_protected/jobs*.tsx` — moved from routes/jobs*
- `src/routes/_protected/cronjobs*.tsx` — moved from routes/cronjobs*
- `src/routes/_protected/mail/*.tsx` — moved from routes/mail*
- `src/routes/_protected/knowledge-base/*.tsx` — moved from routes/knowledge-base*
- `src/routeTree.gen.ts` — regenerated by pnpm build with all _protected routes

## Decisions Made

- Old route files deleted after copying to `_protected/` — TanStack Router file-based routing would double-register routes if both existed
- `loginFn` returns `{ error: 'Invalid credentials' }` for both "user not found" and "wrong password" — avoids username enumeration
- `logoutFn` exported from `login.tsx` so plan 04-04 (logout UI) can import it without duplication

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - build passed cleanly on first attempt.

## User Setup Required

SESSION_SECRET must be set in `.env` before the login route will function. Generation instructions are in `.env.example`:
```
openssl rand -base64 32
```

A user account must also be created via `pnpm create-user <username> <password>` (from plan 04-01) before login can succeed.

## Next Phase Readiness

- Session service and protected layout ready for plan 04-03 (API endpoint auth scoping)
- `logoutFn` exported and available for plan 04-04 (logout button in IconRail)
- All page URLs unchanged — `/jobs`, `/conversations`, `/cronjobs`, `/mail`, `/knowledge-base` still work after auth
- `context.user` available in all protected route loaders for user-scoped data queries

## Self-Check: PASSED

- FOUND: src/services/session.ts
- FOUND: src/routes/login.tsx
- FOUND: src/routes/_protected.tsx
- FOUND: src/routes/_protected/index.tsx
- FOUND: src/routes/_protected/conversations.tsx
- FOUND: src/routes/_protected/jobs.tsx
- FOUND: src/routes/_protected/cronjobs.tsx
- FOUND: src/routes/_protected/mail.tsx
- FOUND: src/routes/_protected/knowledge-base.tsx
- FOUND commit: dfb1ea5 (Task 1 — session service + login route)
- FOUND commit: 374f22a (Task 2 — _protected layout + route migration)

---
*Phase: 04-user-authentication*
*Completed: 2026-03-18*
