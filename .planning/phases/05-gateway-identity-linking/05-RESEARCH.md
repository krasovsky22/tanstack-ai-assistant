# Phase 5: gateway-identity-linking - Research

**Researched:** 2026-03-23
**Domain:** Identity mapping, gateway middleware, code-based OAuth-style linking flow, Settings UI extension
**Confidence:** HIGH

## Summary

Phase 5 bridges the gateway (Telegram) user identity to the existing internal `users` table introduced in Phase 4. Currently, gateway messages arrive in `handler.ts` with only a `chatId` — there is no `userId` tied to that chat. The gateway routes messages to `/api/chat-sync` as an anonymous user, which means Telegram conversations are not scoped to any internal account and the ownership guards added in Phase 4 never fire.

The approach is a short-lived **linking code** pattern: an authenticated web user requests a one-time code via the Settings UI, then sends that code to the bot in Telegram. The gateway intercepts the `/link <code>` message before it reaches the LLM, validates the code against DB, writes a `gateway_identities` join row (`provider + chatId + userId`), and confirms to the user. Once linked, every subsequent gateway message resolves `chatId → userId` so that conversations, jobs, and cronjobs are all scoped correctly. Unlinked users receive a polite prompt to link their account instead of accessing the assistant.

The full scope is: new DB table + migration, linking code service, gateway middleware intercept, `/api/chat-sync` userId resolution, a `GET/DELETE /api/gateway-identities` API, and a new card on the existing Settings page.

**Primary recommendation:** Use the existing Drizzle migration pattern (numbered SQL file + journal entry), a DB-backed short-lived code table, and extend the existing Settings page with a new `GatewayIdentitiesCard` component following the `JiraIntegrationCard` precedent.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 (already installed) | New table schema + queries | Already the project ORM |
| postgres | ^3.4.8 (already installed) | DB driver | Already in use |
| crypto (Node built-in) | N/A | `randomUUID()` for linking codes | Already used across codebase (`src/lib/uuid.ts`) |
| @tanstack/react-query | ^5.90.21 (already installed) | Data fetching in Settings UI | Already the query layer |
| @tanstack/react-form | ^1.28.3 (already installed) | Copy-code / display form patterns | Already used in `JiraIntegrationCard` |
| @chakra-ui/react | ^3.34.0 (already installed) | UI components | Project standard (CLAUDE.md mandate) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node `crypto.randomBytes` | built-in | Generate a short alphanumeric code | Preferred over `randomUUID` for human-typeable codes (6–8 chars) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DB-backed linking codes | JWT / signed tokens | JWT needs no DB round-trip but harder to revoke; DB table is simpler and consistent with project patterns |
| Short alphanumeric code | Full UUID | UUID is unwieldy to type in Telegram; 6-char codes are ergonomic |

**Installation:** No new packages needed — all dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── db/
│   ├── schema.ts              # add gatewayIdentities + linkingCodes tables
│   └── migrations/
│       ├── 0011_add_gateway_identities.sql
│       └── meta/_journal.json  # must be updated manually (Phase 4 precedent)
├── services/
│   └── gateway-identity.ts    # CRUD for gateway_identities + linking code logic
├── routes/
│   └── api/
│       ├── gateway-identities.tsx  # GET (list) + DELETE (unlink)
│       └── gateway-link.tsx        # POST (generate code) + PUT (validate code - internal only, or reuse same route)
│   └── _protected/
│       └── settings.tsx        # extend with GatewayIdentitiesCard
workers/
└── gateway/
    └── handler.ts              # intercept /link <code> before LLM dispatch
```

### Pattern 1: DB-backed linking code table
**What:** A `linking_codes` table holds `(id, code, userId, expiresAt, usedAt)`. Codes are 6-char uppercase alphanumeric, expire after 10 minutes, single-use.
**When to use:** Always — avoids stateful in-memory storage that breaks across worker restarts.
**Example:**
```typescript
// src/db/schema.ts additions
export const linkingCodes = pgTable('linking_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const gatewayIdentities = pgTable('gateway_identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),      // 'telegram'
  externalChatId: text('external_chat_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  linkedAt: timestamp('linked_at').defaultNow().notNull(),
}, (t) => ({
  uniq: unique().on(t.provider, t.externalChatId),  // one identity per provider+chatId
}));
```

### Pattern 2: Gateway handler intercept
**What:** Before calling `/api/chat-sync`, `handler.ts` checks if the message matches `/link XXXXXX`. If so, POST to a `/api/gateway-link` endpoint with `{ code, provider, chatId }` rather than the normal chat route.
**When to use:** Whenever the message is a linking command — this must be checked BEFORE the LLM call to avoid leaking the code to the model.
**Example:**
```typescript
// workers/gateway/handler.ts — add at top of handleMessage()
const LINK_PATTERN = /^\/link\s+([A-Z0-9]{6})\s*$/i;
const linkMatch = msg.text?.trim().match(LINK_PATTERN);
if (linkMatch) {
  const code = linkMatch[1].toUpperCase();
  const res = await fetch(`${APP_URL}/api/gateway-link`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, provider: provider.name, chatId: String(msg.chatId) }),
  });
  const { message } = await res.json();
  await provider.send(msg.chatId, message);
  return;
}
```

### Pattern 3: Block unlinked users at gateway
**What:** After confirming the message is not a linking command, `handler.ts` calls a `/api/gateway-identities/resolve` endpoint (or directly checks via the API) to see if `chatId` maps to a `userId`. If no mapping exists, reply with a linking prompt and return early.
**When to use:** Every message that passes through the gateway.
**Example:**
```typescript
// workers/gateway/handler.ts — after link-code intercept
const identityRes = await fetch(
  `${APP_URL}/api/gateway-identities/resolve?provider=${provider.name}&chatId=${encodeURIComponent(String(msg.chatId))}`
);
const { userId } = await identityRes.json();
if (!userId) {
  await provider.send(
    msg.chatId,
    'Your Telegram account is not linked to an account.\n\nGo to Settings → Gateway Identities, generate a linking code, then send:\n/link YOURCODE',
  );
  return;
}
// pass userId through to /api/chat-sync
```

### Pattern 4: Propagate userId through chat-sync
**What:** `handler.ts` already passes `{ messages, title, source, chatId }` to `/api/chat-sync`. After resolving identity, add `userId` to this payload. `chat-sync.tsx` already handles `userId` from request body (line 91).
**When to use:** All gateway messages from linked users.

### Pattern 5: Settings UI card — follows JiraIntegrationCard precedent
**What:** A new `GatewayIdentitiesCard` component in `settings.tsx`. Shows a "Generate Code" button that POSTs to `/api/gateway-link` and displays the resulting code in a copyable badge with a countdown timer. Below, lists linked identities (provider + chatId + linkedAt) with a Delete button each.
**When to use:** Settings page, after BrowserNotificationsCard.

### Anti-Patterns to Avoid
- **Storing codes in memory only:** The gateway runs in a separate process from the web server. In-memory storage in the server process is invisible to the gateway worker. Always store codes in DB.
- **Passing the raw code through the LLM:** The link command must be intercepted before `buildChatOptions()` is called, or the model might echo the code in logs.
- **One identity per user without unique constraint:** Two Telegram accounts could link to the same internal user (intentional) but one Telegram account should not link to two internal users simultaneously. Enforce `UNIQUE(provider, external_chat_id)`.
- **Not expiring codes:** Stale codes are a security risk. The 10-minute TTL and `usedAt` single-use enforcement are both necessary.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cryptographic code generation | Custom base62 encoder | `crypto.randomBytes(3).toString('hex').toUpperCase().slice(0,6)` | Already used pattern in project; `randomBytes` is CSPRNG |
| Session resolution | Custom session parser | `useAppSession()` from `@/services/session` | Established in Phase 4; consistent across all API routes |
| DB upsert pattern | Manual insert+update logic | Drizzle `.insert().onConflictDoUpdate()` | Used in Phase 4 conversations route |

**Key insight:** This phase is almost entirely glue code. The hard parts (auth session, DB pattern, gateway polling loop, Chakra UI forms) are all solved. The new work is: 2 new tables, 1 new service, 3 new API routes, 1 gateway intercept, and 1 UI card.

---

## Common Pitfalls

### Pitfall 1: Migration journal desync
**What goes wrong:** Adding a migration SQL file without updating `meta/_journal.json` causes `db:migrate` to skip or crash on the new migration.
**Why it happens:** The project uses `db:push` during development and manually maintains the journal (established in Phase 1 decision 01-01).
**How to avoid:** After writing the `.sql` file, add the corresponding entry to `_journal.json` with the correct `idx`, `version: "7"`, `when`, `tag`, and `breakpoints: true`. Follow the pattern of `0010_add_user_id_to_tables`.
**Warning signs:** `db:migrate` completes without error but new tables don't appear in DB.

### Pitfall 2: gateway worker can't import from `@/` paths
**What goes wrong:** The gateway uses `tsconfig.gateway.json` — if the new `gateway-identity` service or API client is imported directly in the worker, TypeScript or runtime path resolution may fail.
**Why it happens:** Workers have separate tsconfig files (`tsconfig.worker.json`, `tsconfig.gateway.json`). The gateway worker currently uses only `fetch` calls to the app server, never direct imports of `@/services/`.
**How to avoid:** Keep the gateway worker thin — it communicates with the app exclusively via HTTP (`APP_URL`). Do not import `src/services/` in the gateway worker.
**Warning signs:** `Cannot find module '@/services/...'` at gateway worker startup.

### Pitfall 3: Race condition on code use
**What goes wrong:** If the user sends the linking command twice quickly, both requests might find the code as unused and both attempt to write the `gateway_identities` row.
**Why it happens:** No atomic check-and-update in the naive implementation.
**How to avoid:** Use a DB transaction: `UPDATE linking_codes SET used_at = NOW() WHERE code = $1 AND used_at IS NULL AND expires_at > NOW() RETURNING user_id`. Only proceed if a row is returned.
**Warning signs:** Duplicate key violation on `gateway_identities.unique(provider, chatId)`.

### Pitfall 4: chatId type mismatch
**What goes wrong:** Telegram's `chat.id` is a JavaScript number; `conversations.chatId` is stored as `text`. The lookup `WHERE external_chat_id = $1` fails or returns nothing due to type coercion.
**Why it happens:** `IncomingMessage.chatId` is typed as `number | string` and the handler already does `String(msg.chatId)` for the chat-sync call. The same coercion must be applied for gateway identity lookups.
**How to avoid:** Always `String(chatId)` before DB queries in the gateway service. Store `externalChatId` as `text` in the schema (consistent with `conversations.chatId`).

### Pitfall 5: Linking code displayed to user briefly before expiry
**What goes wrong:** The UI generates a code and shows it, but the countdown timer is purely client-side. If the user refreshes, the code is gone from the UI even though it's still valid in DB (for up to 10 minutes).
**Why it happens:** The code is returned only once from the POST response.
**How to avoid:** The `GET /api/gateway-link` endpoint (or the existing `GET /api/gateway-identities`) can optionally return the current unexpired, unused code for the user so the UI can re-display it on page load. Alternatively, document this as expected UX (generate a new code if refreshed).

---

## Code Examples

Verified patterns from existing codebase:

### Migration SQL pattern (from 0010_add_user_id_to_tables.sql)
```sql
-- 0011_add_gateway_identities.sql
CREATE TABLE "linking_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "gateway_identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" text NOT NULL,
  "external_chat_id" text NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "linked_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("provider", "external_chat_id")
);
```

### Session-gated API route pattern (from src/routes/api/user-settings.tsx)
```typescript
// src/routes/api/gateway-identities.tsx
export const Route = createFileRoute('/api/gateway-identities')({
  server: {
    handlers: {
      GET: async () => {
        const { useAppSession } = await import('@/services/session');
        const session = await useAppSession();
        const userId = session.data.userId ?? null;
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const { getGatewayIdentitiesForUser } = await import('@/services/gateway-identity');
        const identities = await getGatewayIdentitiesForUser(userId);
        return new Response(JSON.stringify(identities), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
```

### Drizzle service pattern (from src/services/user-settings.ts)
```typescript
// src/services/gateway-identity.ts
import { db } from '@/db';
import { gatewayIdentities, linkingCodes } from '@/db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export function generateLinkingCode(): string {
  return randomBytes(3).toString('hex').toUpperCase(); // e.g. "A3F9C2"
}

export async function createLinkingCode(userId: string) {
  const code = generateLinkingCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const [row] = await db.insert(linkingCodes)
    .values({ code, userId, expiresAt })
    .returning();
  return row;
}

export async function redeemLinkingCode(
  code: string,
  provider: string,
  externalChatId: string,
): Promise<{ success: boolean; message: string }> {
  const now = new Date();
  // Atomic: mark used only if valid
  const [claimed] = await db
    .update(linkingCodes)
    .set({ usedAt: now })
    .where(
      and(
        eq(linkingCodes.code, code.toUpperCase()),
        isNull(linkingCodes.usedAt),
        gt(linkingCodes.expiresAt, now),
      ),
    )
    .returning();

  if (!claimed) {
    return { success: false, message: 'Invalid or expired code. Generate a new one in Settings.' };
  }

  await db.insert(gatewayIdentities)
    .values({ provider, externalChatId, userId: claimed.userId })
    .onConflictDoUpdate({
      target: [gatewayIdentities.provider, gatewayIdentities.externalChatId],
      set: { userId: claimed.userId, linkedAt: now },
    });

  return { success: true, message: 'Account linked! You can now use the assistant.' };
}
```

### Gateway handler intercept pattern (extends workers/gateway/handler.ts)
```typescript
// Add at the top of handleMessage(), before the fetch to /api/chat-sync
const LINK_PATTERN = /^\/link\s+([A-Z0-9]{6})\s*$/i;
const linkMatch = (msg.text ?? '').trim().match(LINK_PATTERN);
if (linkMatch) {
  const res = await fetch(`${APP_URL}/api/gateway-link`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: linkMatch[1].toUpperCase(),
      provider: provider.name,
      chatId: String(msg.chatId),
    }),
  });
  const { message } = await res.json() as { message: string };
  await provider.send(msg.chatId, message);
  return;
}

// Resolve identity — block unlinked users
const resolveRes = await fetch(
  `${APP_URL}/api/gateway-identities/resolve?provider=${encodeURIComponent(provider.name)}&chatId=${encodeURIComponent(String(msg.chatId))}`
);
const { userId } = await resolveRes.json() as { userId: string | null };
if (!userId) {
  await provider.send(
    msg.chatId,
    'Your Telegram account is not linked.\n\nOpen Settings → Gateway Identities, generate a code, then send:\n/link YOURCODE',
  );
  return;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Gateway sends messages as anonymous (no userId) | Gateway resolves userId via identity table before dispatching | Phase 5 | Conversations, jobs, cronjobs all scoped to real user |
| Any Telegram user can access the assistant | Only linked users pass through | Phase 5 | Security: blocks unknown users |

**Deprecated/outdated:**
- Passing `userId: null` from gateway handler to `/api/chat-sync` — after Phase 5, the handler must always pass a resolved `userId` or block the message.

---

## Open Questions

1. **Should a single internal user be able to link multiple Telegram chat IDs (e.g. personal + group chat)?**
   - What we know: The schema's unique constraint is on `(provider, external_chat_id)` — multiple chatIds per userId is naturally supported.
   - What's unclear: Whether this is desired UX or a security risk.
   - Recommendation: Allow it (no restriction on userId uniqueness in `gateway_identities`) — a user might want to use the bot from a group chat and a DM. Document this behavior.

2. **Should expired/unclaimed linking codes be cleaned up?**
   - What we know: DB accumulation is not a real problem at this scale, but stale rows are untidy.
   - What's unclear: Whether to add a cleanup job or rely on manual pruning.
   - Recommendation: No cleanup job in Phase 5 (scope creep). The `WHERE used_at IS NULL AND expires_at > NOW()` query naturally ignores stale rows. Add a DB index on `(expires_at, used_at)` for query performance.

3. **What happens to existing Telegram conversations (pre-Phase 5) after linking?**
   - What we know: Conversations stored with `chatId` but `userId = null` will not be automatically re-owned.
   - What's unclear: Whether re-ownership of old conversations is desired.
   - Recommendation: Out of scope for Phase 5. Old conversations remain unowned. New conversations after linking are scoped correctly. Document this as known behavior.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.5 |
| Config file | vite.config.ts (inferred — no standalone vitest.config) |
| Quick run command | `pnpm vitest run src/db/gateway-identity.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GID-01 | `gatewayIdentities` table column exists in schema | unit | `pnpm vitest run src/db/gateway-identity.test.ts` | Wave 0 |
| GID-02 | `linkingCodes` table column exists in schema | unit | `pnpm vitest run src/db/gateway-identity.test.ts` | Wave 0 |
| GID-03 | `generateLinkingCode()` returns 6-char uppercase hex | unit | `pnpm vitest run src/services/gateway-identity.test.ts` | Wave 0 |
| GID-04 | `redeemLinkingCode()` rejects expired codes | unit | `pnpm vitest run src/services/gateway-identity.test.ts` | Wave 0 |
| GID-05 | `redeemLinkingCode()` rejects already-used codes | unit | `pnpm vitest run src/services/gateway-identity.test.ts` | Wave 0 |
| GID-06 | Gateway handler intercepts `/link CODE` before LLM | unit | `pnpm vitest run workers/gateway/handler.test.ts` | Wave 0 |
| GID-07 | Gateway handler blocks unlinked chatId | unit | `pnpm vitest run workers/gateway/handler.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run src/db/gateway-identity.test.ts src/services/gateway-identity.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/db/gateway-identity.test.ts` — covers GID-01, GID-02 (schema column assertions following `user-scoping.test.ts` pattern)
- [ ] `src/services/gateway-identity.test.ts` — covers GID-03, GID-04, GID-05 (pure function + mocked DB)
- [ ] `workers/gateway/handler.test.ts` — covers GID-06, GID-07 (mock fetch, assert intercept behavior)

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `workers/gateway/handler.ts`, `workers/gateway/providers/telegram.ts`, `workers/gateway/types.ts` — gateway message flow
- Direct codebase inspection: `src/db/schema.ts` — all existing tables and FK patterns
- Direct codebase inspection: `src/services/session.ts`, `src/services/user-settings.ts` — session auth and DB service patterns
- Direct codebase inspection: `src/routes/api/user-settings.tsx` — session-gated API route pattern
- Direct codebase inspection: `src/routes/_protected/settings.tsx` — Settings UI card pattern
- Direct codebase inspection: `src/routes/api/chat-sync.tsx` — gateway flow, `userId` handling
- Direct codebase inspection: `.planning/STATE.md` — Phase 4 decisions (FK types, session patterns, ownership guards)
- Direct codebase inspection: `src/db/migrations/` — numbered SQL + journal pattern

### Secondary (MEDIUM confidence)
- Phase 4 decision log in STATE.md: "FK columns referencing users.id (uuid) must use uuid type" — confirmed for new tables
- Phase 4 decision log: "loginFn returns { error } on bad credentials" — consistent error response pattern for gateway link API

### Tertiary (LOW confidence)
- None — all findings based on direct codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in active use
- Architecture: HIGH — patterns directly derived from existing Phase 4 code (session routes, Drizzle schema, Drizzle service, Settings UI card)
- Pitfalls: HIGH — derived from prior STATE.md decisions (migration journal, worker import isolation, chatId type handling)

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable codebase; no fast-moving external dependencies)
