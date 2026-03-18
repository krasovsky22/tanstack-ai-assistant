# Phase 4: User Authentication - Research

**Researched:** 2026-03-18
**Domain:** TanStack Router authenticated routes, server-side session cookies, Drizzle schema migrations, bcrypt password hashing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use TanStack Router's built-in authenticated-routes pattern (not a third-party auth library)
- Reference: https://github.com/TanStack/router/tree/main/examples/react/authenticated-routes
- Create a `users` table in the database with credentials (username/email + hashed password)
- Login page only — no register, forgot password, or restore password buttons or routes
- Move ALL current pages under new `/protected/*` routes (unauthenticated users redirected to login)
- Create a manually-executed script (not UI) to create users in the database
- `/api/chat` and `/api/chat-sync` remain PUBLIC — accept and read a `userId` parameter
- Add `user_id` column to: `jobs`, `conversations`, `cronjobLogs`, `cronjobs`
- All queries on those tables filter by `user_id`
- Knowledge-related records are GLOBAL — no `user_id` required
- Write Drizzle migrations for schema changes

### Claude's Discretion
- Session storage mechanism (cookie, JWT, localStorage) — choose what fits TanStack Router auth pattern best
- Password hashing algorithm (bcrypt recommended)
- Migration strategy for existing rows without user_id (nullable or seeded with default user)
- Exact shape of userId passed to public API routes (header, body field, query param)

### Deferred Ideas (OUT OF SCOPE)
- Register / sign-up flow
- Forgot password / restore password
- OAuth or third-party providers
- Role-based access control
</user_constraints>

---

## Summary

This phase introduces user authentication using TanStack Router's `_authenticated` pathless layout route pattern. The project already uses `@tanstack/react-start` (v1.132.0) which ships `useSession`, `getCookie`, `setCookie`, and `deleteCookie` from `@tanstack/react-start/server` — a cookie-encrypted server-side session mechanism built on iron-session-style sealing. This is the correct session approach for this stack: httpOnly encrypted cookies, server-validated on every request through the root route's `beforeLoad`.

The current codebase already has `conversations.user_id` (nullable text) from migration `0005`. The remaining tables — `jobs`, `cronjobs`, `cronjobLogs` — need nullable `user_id` columns added. The schema also needs a new `users` table with `id`, `username`, `passwordHash`, and `createdAt`. All page routes currently sit directly under `src/routes/` and must move to `src/routes/_protected/` (pathless layout — underscore prefix removes the segment from URLs).

**Primary recommendation:** Use `useSession` from `@tanstack/react-start/server` for encrypted cookie sessions. The `_protected` pathless layout route enforces auth via `beforeLoad` + `throw redirect({ to: '/login' })`. The root route's `beforeLoad` fetches the session with `createServerFn` and places the user into router context, making it available everywhere without prop drilling.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-start/server` | already installed (1.132.0) | `useSession`, `getCookie`, `setCookie`, `deleteCookie` | Built-in to the project's framework, no extra dependency |
| `@tanstack/react-router` | already installed (1.132.0) | `createFileRoute`, `redirect`, pathless layout routes | File-based routing already in use |
| `bcryptjs` | ^2.4.3 | Password hashing (pure JS, no native build step) | ESM-compatible, no native compilation required for this TypeScript/ESM project |
| `drizzle-orm` | already installed (0.45.1) | Schema migrations, DB queries | Already the project ORM |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/bcryptjs` | ^2.4.6 | TypeScript types for bcryptjs | Add alongside bcryptjs |
| `tsx` | already installed | Run the create-user CLI script | Same tool already used for workers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `bcryptjs` | `bcrypt` (native) | `bcrypt` is ~20% faster but requires native compilation (`node-gyp`). The project uses pnpm with no native deps — bcryptjs avoids build complexity with negligible speed difference for a CLI script and infrequent login operations |
| `useSession` cookie | JWT in localStorage | cookies are httpOnly (XSS-safe), server-validated. localStorage JWTs are client-accessible and more error-prone |
| `_protected` pathless layout | per-route `beforeLoad` | Layout route centralises auth check — one file protects every child route |

**Installation:**
```bash
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── routes/
│   ├── __root.tsx            # add fetchUser createServerFn + beforeLoad → context.user
│   ├── login.tsx             # new: public login page (POST via createServerFn loginFn)
│   ├── _protected.tsx        # new: pathless layout — beforeLoad throws redirect if !context.user
│   ├── _protected/
│   │   ├── index.tsx         # was: routes/index.tsx
│   │   ├── conversations.tsx # was: routes/conversations.tsx
│   │   ├── conversations/    # was: routes/conversations/
│   │   ├── jobs.tsx          # etc.
│   │   ├── jobs/
│   │   ├── cronjobs.tsx
│   │   ├── cronjobs/
│   │   ├── mail.tsx
│   │   ├── mail/
│   │   ├── knowledge-base.tsx
│   │   └── knowledge-base/
│   └── api/                  # unchanged — all API routes stay public
├── services/
│   └── session.ts            # new: useAppSession() wrapper (typed SessionManager)
└── db/
    ├── schema.ts             # add users table + user_id to jobs/cronjobs/cronjobLogs
    └── migrations/
        ├── 0009_add_users_table.sql
        └── 0010_add_user_id_to_tables.sql
scripts/
└── create-user.mjs           # new: CLI script — node scripts/create-user.mjs <username> <password>
```

### Pattern 1: Server-side Session via useSession (TanStack Start)

**What:** `useSession` from `@tanstack/react-start/server` stores an encrypted, signed, httpOnly cookie. The session is read inside `createServerFn` handlers — not in client components.
**When to use:** Any time the server needs to identify the logged-in user.

```typescript
// src/services/session.ts
import { useSession } from '@tanstack/react-start/server'

type SessionUser = {
  userId: string
  username: string
}

export function useAppSession() {
  return useSession<SessionUser>({
    password: process.env.SESSION_SECRET!, // must be >= 32 chars
    name: 'orin-session',
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
}
```

### Pattern 2: Root Route beforeLoad — Hydrate User into Router Context

**What:** `createServerFn` reads the session on every navigation; result goes into `context.user`.
**When to use:** Required so that `_protected.tsx` and any route can read `context.user`.

```typescript
// src/routes/__root.tsx  (additions to existing file)
import { createServerFn } from '@tanstack/react-start'
import { useAppSession } from '@/services/session'

const fetchUser = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await useAppSession()
  if (!session.data.userId) return null
  return { userId: session.data.userId, username: session.data.username }
})

// Add to createRootRoute:
export const Route = createRootRoute({
  beforeLoad: async () => {
    const user = await fetchUser()
    return { user }
  },
  // ... rest unchanged
})
```

Note: The existing `__root.tsx` uses `createRootRoute` (not `createRootRouteWithContext`). Because `beforeLoad` returns `{ user }`, child routes automatically get `context.user` typed correctly without needing `createRootRouteWithContext`.

### Pattern 3: Pathless Layout Route `_protected.tsx`

**What:** A route file named `_protected.tsx` with no path segment. All files inside `_protected/` inherit its `beforeLoad`.
**When to use:** This is the entire auth guard — one file covers all protected routes.

```typescript
// src/routes/_protected.tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: () => <Outlet />,
})
```

### Pattern 4: Login Route with createServerFn

**What:** A public `login.tsx` route with a `loginFn` server function that validates credentials, creates a session, and redirects.

```typescript
// src/routes/login.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useAppSession } from '@/services/session'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

const loginFn = createServerFn({ method: 'POST' })
  .validator((d: { username: string; password: string }) => d)
  .handler(async ({ data }) => {
    const user = await db.select().from(users)
      .where(eq(users.username, data.username))
      .limit(1)
      .then(r => r[0] ?? null)

    if (!user) return { error: 'Invalid credentials' }

    const valid = await bcrypt.compare(data.password, user.passwordHash)
    if (!valid) return { error: 'Invalid credentials' }

    const session = await useAppSession()
    await session.update({ userId: user.id, username: user.username })

    throw redirect({ to: '/' })
  })
```

### Pattern 5: Logout Route

```typescript
// src/routes/logout.tsx (or a server fn callable from a button)
import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { clearSession } from '@tanstack/react-start/server'
import { useAppSession } from '@/services/session'

const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAppSession()
  await session.clear()
  throw redirect({ to: '/login' })
})
```

### Pattern 6: CLI User Creation Script

**What:** A Node ESM script (`.mjs`) that reads username and password from CLI args, hashes the password, and inserts into the `users` table.
**When to use:** Only administrators run this — no UI required.

```javascript
// scripts/create-user.mjs
import bcrypt from 'bcryptjs'
// import db and users table via tsx or direct postgres connection
const [username, password] = process.argv.slice(2)
const passwordHash = await bcrypt.hash(password, 12)
// insert into users table
```

Add to `package.json` scripts: `"create-user": "tsx --env-file=.env scripts/create-user.mjs"`

### Anti-Patterns to Avoid
- **Storing raw passwords:** Always hash with bcrypt before inserting. Never log or return password fields.
- **Guarding individual routes instead of the layout:** Per-route `beforeLoad` is fragile — new routes can be forgotten. Use `_protected.tsx` layout.
- **Reading session in client components:** `useSession` is a server-only function. It must be called inside `createServerFn` or server handler code, not in React component bodies.
- **Using `undefined!` for auth context permanently:** The example pattern `context: { auth: undefined! }` works at runtime because `beforeLoad` fills it before any route renders, but TypeScript will accept `null` checks — handle the nullable case properly.
- **Hardcoding SESSION_SECRET:** Must come from `process.env.SESSION_SECRET`. The secret must be >= 32 characters or `useSession` will throw.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie encryption/signing | Custom HMAC cookie logic | `useSession` from `@tanstack/react-start/server` | Iron-seal-based AES-256-CBC + SHA-256 HMAC; handles expiry, clock skew, padding |
| Password hashing | SHA256 or MD5 of password | `bcryptjs.hash(password, 12)` | Bcrypt includes salt, is deliberately slow (work factor), resistant to rainbow tables |
| Session data store | Server-side session DB table | Encrypted cookie — stateless | No DB lookup on every request; session is self-contained in the cookie |
| Route auth checking | Custom middleware layer | TanStack Router `beforeLoad` in layout route | Type-safe, co-located with routing, runs before render |

---

## Common Pitfalls

### Pitfall 1: SESSION_SECRET Too Short
**What goes wrong:** `useSession` throws `"Password string too short (minimum 32 characters)"` at runtime.
**Why it happens:** The iron-seal library enforces a minimum key length for cryptographic security.
**How to avoid:** Generate a 32+ char random string for `SESSION_SECRET` in `.env`. Add a startup check that throws if `SESSION_SECRET` is missing or too short.
**Warning signs:** 500 errors on any page after adding session logic.

### Pitfall 2: routeTree.gen.ts Not Regenerated
**What goes wrong:** After moving route files into `_protected/`, old routes still appear in routeTree.gen.ts, causing 404s or double-registration.
**Why it happens:** The file is auto-generated by `@tanstack/router-plugin`. It must be regenerated.
**How to avoid:** Run `pnpm dev` (or `pnpm build`) after moving route files — the plugin auto-regenerates. Never edit `routeTree.gen.ts` manually.
**Warning signs:** TypeScript errors in routeTree.gen.ts about missing or duplicate routes.

### Pitfall 3: conversations.user_id Already Exists (migration 0005)
**What goes wrong:** Running a migration that tries to add `user_id` to `conversations` will fail with "column already exists".
**Why it happens:** Migration 0005 already added `user_id text` to `conversations`.
**How to avoid:** Only migrate `jobs`, `cronjobs`, `cronjobLogs`. Verify existing column presence before writing migrations. The Drizzle schema already reflects this column correctly.

### Pitfall 4: createServerFn Called Outside Server Context
**What goes wrong:** `useSession` / `getCookie` throw or return undefined when called outside a server function handler.
**Why it happens:** These are server-only functions that depend on the active request context provided by Nitro/TanStack Start.
**How to avoid:** Always call session utilities inside `createServerFn(...).handler(async () => { ... })` or within a route's server-side `loader`/`action`. Never in client-side React code.

### Pitfall 5: Existing Rows Without user_id
**What goes wrong:** Queries with `WHERE user_id = $1` return zero results for all existing data after migration.
**Why it happens:** Existing `jobs`, `cronjobs`, `cronjobLogs` rows have NULL `user_id` after the column is added.
**How to avoid:** Make the column nullable (no `.notNull()`). When querying, handle the migration strategy in two ways:
  - Option A: Leave existing rows with NULL — they become "orphaned" (not visible to any user). Acceptable if existing data is test/dev data.
  - Option B: Create a default "system" or "admin" user first, then `UPDATE jobs SET user_id = '<default-user-id>'` in the migration. Recommended for production.
  The migration strategy is at Claude's Discretion — document it in STATE.md when chosen.

### Pitfall 6: _protected vs protected Naming
**What goes wrong:** A route directory named `protected/` (without underscore) creates URL segments `/protected/conversations`, breaking existing bookmarks/links.
**Why it happens:** TanStack Router adds directory names to URLs unless prefixed with `_`.
**How to avoid:** Name the directory `_protected` (leading underscore). URLs remain `/`, `/conversations`, `/jobs`, etc.

### Pitfall 7: AppLayout Showing on Login Page
**What goes wrong:** The `AppLayout` wrapper in `__root.tsx` (with `IconRail` and `ChatSidebar`) renders on the login page, showing navigation UI to unauthenticated users.
**Why it happens:** `AppLayout` wraps all children in `__root.tsx`.
**How to avoid:** Conditionally suppress `IconRail`/`ChatSidebar` on the login route. Check `pathname === '/login'` in `AppLayout`, or extract the layout into `_protected.tsx` component only.

---

## Code Examples

Verified patterns from official sources:

### Schema: users table (Drizzle)
```typescript
// Source: drizzle-orm docs + project pattern
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

### Schema: Adding user_id to jobs, cronjobs, cronjobLogs
```typescript
// In schema.ts — add to each table:
userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
// nullable — matches existing pattern for conversations.userId
```

### Migration SQL (0009)
```sql
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
```

### Migration SQL (0010)
```sql
ALTER TABLE "jobs" ADD COLUMN "user_id" text REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "cronjobs" ADD COLUMN "user_id" text REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "cronjob_logs" ADD COLUMN "user_id" text REFERENCES "users"("id") ON DELETE SET NULL;
```

### Session wrapper
```typescript
// Source: @tanstack/start-server-core session.d.ts (verified in node_modules)
// src/services/session.ts
import { useSession } from '@tanstack/react-start/server'

type SessionData = { userId: string; username: string }

export function useAppSession() {
  return useSession<SessionData>({
    password: process.env.SESSION_SECRET!,
    name: 'orin-session',
    cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
  })
}
```

### create-user script
```javascript
// scripts/create-user.mjs
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import postgres from 'postgres'

const [username, password] = process.argv.slice(2)
if (!username || !password) {
  console.error('Usage: pnpm create-user <username> <password>')
  process.exit(1)
}

const sql = postgres(process.env.DATABASE_URL)
const passwordHash = await bcrypt.hash(password, 12)
const [user] = await sql`
  INSERT INTO users (id, username, password_hash)
  VALUES (gen_random_uuid(), ${username}, ${passwordHash})
  RETURNING id, username
`
console.log('Created user:', user)
await sql.end()
```

Add to `package.json`: `"create-user": "node --env-file=.env scripts/create-user.mjs"`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `createRootRouteWithContext<T>()` for auth | `createRootRoute` with `beforeLoad` returning context shape | TanStack Router v1 | Both work; `createRootRoute` + `beforeLoad` return is simpler, no wrapper needed |
| Client-side localStorage auth (SPA pattern) | Server-side encrypted cookie session | TanStack Start launch | SSR-safe, no XSS risk, works on first SSR render |
| Custom session middleware | `useSession` from `@tanstack/react-start/server` | Bundled in framework | Zero config, iron-seal encryption built in |

**Deprecated/outdated:**
- The `start-basic-auth` example uses Prisma — this project uses Drizzle; translate patterns accordingly.
- The `authenticated-routes` example uses `localStorage` for the auth token — this is a client-SPA example without SSR. For this SSR/TanStack Start project, server-side sessions via `useSession` are the correct approach.

---

## Open Questions

1. **Migration strategy for existing rows (Claude's Discretion)**
   - What we know: After adding `user_id` to `jobs`, `cronjobs`, `cronjobLogs`, existing rows will have NULL values
   - What's unclear: Whether existing data matters (dev environment vs real user data)
   - Recommendation: Default to nullable + no backfill for Phase 4 (simplest). If data must be preserved, create an admin user in the migration and `UPDATE` all rows to that user's id. Document the decision in STATE.md.

2. **userId shape for public API routes (Claude's Discretion)**
   - What we know: `/api/chat` and `/api/chat-sync` must accept a `userId` param; currently `chat-sync.tsx` already reads `userId` from request body
   - What's unclear: Should the browser's streaming `/api/chat` also send userId, and where does it come from in the browser (cookie-based session)?
   - Recommendation: For `/api/chat` (browser), read the session server-side (the route handler has server context, so `useSession()` can be called there directly). For `/api/chat-sync` (workers), keep accepting `userId` in the POST body — workers don't have browser cookies. This is the cleanest split.

3. **IconRail/sidebar on login page**
   - What we know: `AppLayout` in `__root.tsx` always renders `IconRail`
   - Recommendation: Check `pathname === '/login'` in `AppLayout` and suppress `IconRail` + sidebar. Or move layout rendering into `_protected.tsx` component entirely.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.5 |
| Config file | none — vitest reads from vite.config.ts (no dedicated vitest config found) |
| Quick run command | `pnpm vitest run src/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | users table schema correct (columns, types, unique) | unit | `pnpm vitest run src/db/schema.test.ts` | ❌ Wave 0 |
| AUTH-02 | useAppSession config returns correct session config shape | unit | `pnpm vitest run src/services/session.test.ts` | ❌ Wave 0 |
| AUTH-03 | loginFn returns error on wrong password | unit | `pnpm vitest run src/routes/login.test.ts` | ❌ Wave 0 |
| AUTH-04 | _protected beforeLoad throws redirect when no user in context | unit | `pnpm vitest run src/routes/_protected.test.ts` | ❌ Wave 0 |
| AUTH-05 | create-user script hashes password (bcrypt rounds >= 10) | unit | `pnpm vitest run scripts/create-user.test.ts` | ❌ Wave 0 |
| AUTH-06 | user_id queries filter correctly (jobs/cronjobs) | unit | `pnpm vitest run src/db/user-scoping.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run src/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/db/schema.test.ts` — covers AUTH-01, verifies users table structure
- [ ] `src/services/session.test.ts` — covers AUTH-02, session config shape
- [ ] `src/routes/login.test.ts` — covers AUTH-03, loginFn error paths (vi.mock bcryptjs + db)
- [ ] `src/routes/_protected.test.ts` — covers AUTH-04, redirect behavior
- [ ] `scripts/create-user.test.ts` — covers AUTH-05, hash rounds validation
- [ ] `src/db/user-scoping.test.ts` — covers AUTH-06, query filter correctness

---

## Sources

### Primary (HIGH confidence)
- `node_modules/.pnpm/@tanstack+start-server-core@1.161.3/dist/esm/request-response.d.ts` — verified `useSession`, `getCookie`, `setCookie`, `deleteCookie`, `clearSession` all exist in the installed version
- `node_modules/.pnpm/@tanstack+start-server-core@1.161.3/dist/esm/session.d.ts` — verified `SessionConfig` interface with `password`, `cookie`, `name`, `maxAge` fields
- `src/db/schema.ts` — existing schema: `conversations.userId` already present, `jobs`/`cronjobs`/`cronjobLogs` have no `user_id` yet
- `src/db/migrations/` — confirmed next migration index is 0009
- `https://raw.githubusercontent.com/TanStack/router/main/examples/react/start-basic-auth/src/routes/__root.tsx` — official `createServerFn` + `useSession` + `beforeLoad` pattern
- `https://raw.githubusercontent.com/TanStack/router/main/examples/react/start-basic-auth/src/routes/_authed.tsx` — official `loginFn` + protected route `beforeLoad` pattern
- `https://raw.githubusercontent.com/TanStack/router/main/examples/react/authenticated-routes/src/auth.tsx` — official `AuthContext`, `useAuth`, `AuthProvider` pattern (client-only SPA variant)

### Secondary (MEDIUM confidence)
- https://spin.atomicobject.com/authenticated-routes-tanstack-router/ — `_authenticated` pathless layout pattern, `beforeLoad` redirect — verified against official example
- https://tanstack.com/router/v1/docs/guide/authenticated-routes — confirmed `beforeLoad` redirect + pathless layout pattern (redirect followed, content consistent with examples)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified directly in node_modules; `useSession` API confirmed from `.d.ts` source
- Architecture: HIGH — patterns taken directly from official TanStack Start example source files
- Pitfalls: HIGH — pitfalls 1-4 are based on verified API contracts; pitfall 5-7 are based on project-specific inspection (schema, route structure, root layout)
- Migration strategy: MEDIUM — the nullable FK approach is standard Drizzle practice; backfill strategy depends on user data state

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (TanStack Start is fast-moving; re-verify `useSession` API if version bumps)
