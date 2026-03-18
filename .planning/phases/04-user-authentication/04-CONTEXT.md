# Phase 4: User Authentication - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning
**Source:** Inline requirements from /gsd:plan-phase invocation

<domain>
## Phase Boundary

This phase introduces user authentication using TanStack Router's authenticated routes pattern. It delivers: a users table, a login page (no register/forgot/restore), protected routes for all existing pages, a manual user creation script, user-aware API routes, and per-user data scoping across all existing tables except knowledge records.

Reference implementation: https://github.com/TanStack/router/tree/main/examples/react/authenticated-routes

</domain>

<decisions>
## Implementation Decisions

### Authentication Library
- Use TanStack Router's built-in authenticated-routes pattern (not a third-party auth library)
- Reference: https://github.com/TanStack/router/tree/main/examples/react/authenticated-routes

### Users Table
- Create a `users` table in the database
- Store credentials required for login (username/email + hashed password)

### Login Page
- Create a dedicated login page/route
- Login form only — no register, forgot password, or restore password buttons or routes
- Session/token management as required by TanStack Router auth pattern

### Route Structure
- Move ALL current pages under new `/protected/*` routes
- Unauthenticated users are redirected to login

### User Creation
- Create a manually-executed script (not a UI) to create users in the database
- Script should be runnable from the command line (e.g., `pnpm create-user` or `node scripts/create-user.js`)

### API Routes
- `/api/chat` and `/api/chat-sync` remain PUBLIC (no auth guard)
- These routes should accept and read a `userId` parameter passed in the request
- Fetch user from database using that userId
- Use the fetched user for LLM context enrichment

### Data Scoping — Existing Tables
- Add `user_id` column to all existing tables: `jobs`, `conversations`, `cronjobLogs`, `cronjobs`
- All queries on those tables filter by `user_id` so users only see their own records
- Write migrations for the schema changes

### Knowledge Records
- Knowledge-related records are GLOBAL — no `user_id` required
- Do not add user scoping to knowledge tables

### Claude's Discretion
- Session storage mechanism (cookie, JWT, localStorage) — choose what fits TanStack Router auth pattern best
- Password hashing algorithm (bcrypt recommended)
- Migration strategy for existing rows without user_id (nullable or seeded with a default user)
- Exact shape of userId passed to public API routes (header, body field, query param)

</decisions>

<specifics>
## Specific Ideas

- TanStack Router authenticated-routes example is the canonical reference
- The create-user script should hash the password before storing it
- LLM context from user: enrich system prompt or tool context with user info (name, etc.)
- Existing conversations/jobs without a user_id should be handled gracefully (nullable FK or default user)

</specifics>

<deferred>
## Deferred Ideas

- Register / sign-up flow — explicitly out of scope
- Forgot password / restore password — explicitly out of scope
- OAuth or third-party providers — not mentioned
- Role-based access control — not mentioned

</deferred>

---

*Phase: 04-user-authentication*
*Context gathered: 2026-03-18 via inline requirements*
