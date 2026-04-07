# Phase 11: Configurable Agents - Research

**Researched:** 2026-04-07
**Domain:** DB-driven agent configuration, TanStack Start API routes, Drizzle ORM, Chakra UI CRUD pages
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Fields: `name` (display label), `model` (free-text model ID), `maxIterations` (integer), `systemPrompt` (textarea), `isDefault` (boolean), `apiKey` (auto-generated UUID on create)
- Model name is free-text input — no dropdown of presets
- One agent is marked `isDefault=true` — used as fallback for Telegram, cron, and new browser conversations
- API key is auto-generated on agent creation and displayed (copyable)
- No access control — any authenticated user can CRUD agents; agents are shared across all users
- Dedicated route at `/agents` under `_protected` layout (`src/routes/_protected/agents.tsx`)
- Full CRUD: list table + create/edit form/modal + delete
- Table columns: name, model, maxIterations, isDefault badge, API key (masked/copyable), actions
- "Set as gateway agent" row action sets `isDefault=true`, clears previous default
- System prompt is a textarea in the create/edit form (not shown inline in table)
- Agent dropdown sits above the chat input (top of conversation view), pre-selected with default
- Dropdown locked (disabled) after first message is sent
- Existing conversations with no `agentId` show no agent label; default agent handles response
- No retroactive migration of existing conversations
- `WIDGET_API_KEY` env var is retired — widget passes an agent API key instead
- `/api/gateway/widget` validates incoming API key against `agents` table
- Telegram and cron always use `isDefault=true` agent

### Claude's Discretion

- API key generation format (UUID v4 or random hex string)
- Exact table/form layout and visual styling on the Agents page
- How the agent dropdown visually locks after first message (disabled state, tooltip, or just removed)
- Migration numbering and column ordering in the new `agents` table

### Deferred Ideas (OUT OF SCOPE)

- Per-agent tool group toggles (enable/disable zapier, jira, github per agent)
- Temperature control per agent
- Per-gateway-identity agent mapping (each Telegram user routes to a different agent)
</user_constraints>

---

## Summary

Phase 11 replaces the hardcoded `resolveAdapter()` function in `src/services/chat.ts` with a database-driven agent configuration system. The central new artifact is an `agents` table in PostgreSQL (via Drizzle ORM), a new `/agents` admin page following the exact same CRUD table+modal pattern as the existing `/cronjobs` page, an agent selector dropdown in `Chat.tsx` (locked after first send), and updated validation logic in the widget service that looks up API keys from the `agents` table instead of comparing against the `WIDGET_API_KEY` env var.

The integration touch points are well-understood from existing code: `buildChatOptions()` receives an agent config object and uses it to call either `openaiText(model)` or `bedrockText(model)`; both `/api/chat` and `/api/chat-sync` need to read an `agentId` from the request body and load the matching agent record; the widget service (`src/services/widget.ts`) needs its API key validation replaced with an agent table lookup; and the cron/Telegram workers always load the `isDefault=true` agent with a single DB query.

The migration numbering picks up at `0013`. The `conversations` table gains a nullable `agentId` UUID FK column. The `agents` table is a clean, independent table with no user-scope FK. The `WIDGET_API_KEY` env var is deprecated — existing `.env.example` should mark it as deprecated with a note about per-agent keys.

**Primary recommendation:** Implement in four sequential plans: (1) DB schema + migration, (2) agents CRUD API routes + admin page, (3) wire agent config into `buildChatOptions()` and both chat endpoints, (4) update widget service + retire `WIDGET_API_KEY`.

---

## Standard Stack

### Core (already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | existing | Schema definition, migrations, queries | Already used for all DB work |
| @tanstack/react-router | existing | File-based routing for new `/agents` route | Project standard |
| @tanstack/react-query | existing | Server state for agents list, invalidation on mutations | Already used in cronjobs, settings |
| @tanstack/react-form | existing | Agent create/edit form | Used in settings page |
| Chakra UI v3 | existing | All UI components (Table, Modal/Dialog, Badge, Input, Textarea, Select) | Project standard; CLAUDE.md mandates it |
| crypto (Node built-in) | built-in | `crypto.randomUUID()` for API key generation | Already used in chat routes |

### No New Dependencies Required

All capabilities needed for this phase already exist in the project. No `npm install` step is needed.

---

## Architecture Patterns

### Recommended Project Structure Changes

```
src/
├── db/
│   ├── schema.ts                          # add agents table + agentId FK on conversations
│   └── migrations/
│       ├── 0013_add_agents_table.sql      # agents table
│       └── 0014_add_agent_id_to_conversations.sql  # nullable FK column
├── routes/
│   ├── _protected/
│   │   └── agents.tsx                     # new: full CRUD page
│   └── api/
│       ├── agents.tsx                     # new: GET list, POST create
│       ├── agents/
│       │   └── $id.tsx                    # new: GET one, PUT update, DELETE
│       ├── chat.tsx                       # modified: read agentId from body
│       ├── chat-sync.tsx                  # modified: read agentId or default
│       └── gateway/
│           └── widget/
│               └── index.tsx              # modified: pass agent key to service
├── services/
│   ├── chat.ts                            # modified: buildChatOptions accepts AgentConfig
│   └── widget.ts                          # modified: lookup apiKey in agents table
└── components/
    └── Chat.tsx                           # modified: add agent selector dropdown
```

### Pattern 1: Agents Table Schema (Drizzle)

**What:** New `agents` table in `src/db/schema.ts`, plus nullable `agentId` FK on `conversations`.
**When to use:** Always — this is the foundational change.

```typescript
// src/db/schema.ts additions

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  model: text('model').notNull(),
  maxIterations: integer('max_iterations').notNull().default(10),
  systemPrompt: text('system_prompt').notNull().default(''),
  isDefault: boolean('is_default').notNull().default(false),
  apiKey: text('api_key').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// On conversations table — add nullable agentId column:
agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
```

### Pattern 2: Agent Config Loading in buildChatOptions

**What:** `buildChatOptions()` accepts an optional `agentConfig` parameter; falls back to existing `resolveAdapter()` when no config provided (backward-compat for tests).
**When to use:** All chat entry points.

```typescript
// src/services/chat.ts

interface AgentConfig {
  model: string;
  maxIterations: number;
  systemPrompt: string;
}

export async function buildChatOptions(
  messages: any[],
  conversationId?: string,
  userId?: string | null,
  jiraSettings?: UserJiraSettings | null,
  githubSettings?: GitHubSettings | null,
  agentConfig?: AgentConfig | null,   // NEW optional param
) {
  // Use agent config model if provided, otherwise fall back to env-based resolution
  const adapter = agentConfig
    ? resolveAdapterForModel(agentConfig.model)
    : resolveAdapter();

  const agentMaxIterations = agentConfig?.maxIterations ?? 15;
  const agentSystemPrompt = agentConfig?.systemPrompt ?? '';

  return {
    adapter,
    messages,
    conversationId,
    agentLoopStrategy: maxIterations(agentMaxIterations),
    systemPrompts: [
      (agentSystemPrompt ? agentSystemPrompt + '\n\n' : '') + EXISTING_SYSTEM_PROMPT + ...,
    ],
    tools,
  };
}

// New adapter resolver that handles model string dispatch:
function resolveAdapterForModel(model: string) {
  // Bedrock models contain ':' (e.g. 'amazon.nova-pro-v1:0') or 'amazon.'/'anthropic.'
  const isBedrockModel =
    model.startsWith('amazon.') ||
    model.startsWith('anthropic.') ||
    model.startsWith('meta.') ||
    model.includes(':');
  if (isBedrockModel) {
    return bedrockText(model as any);
  }
  return openaiText(model);
}
```

### Pattern 3: Default Agent Lookup (for cron and Telegram)

**What:** Single DB query to get the `isDefault=true` agent; called at the start of gateway/cron flows.

```typescript
// Reusable helper in src/services/chat.ts or src/services/agents.ts

export async function getDefaultAgent() {
  const { db } = await import('@/db');
  const { agents } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');
  const rows = await db.select().from(agents).where(eq(agents.isDefault, true)).limit(1);
  return rows[0] ?? null;
}

export async function getAgentById(id: string) {
  const { db } = await import('@/db');
  const { agents } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');
  const rows = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAgentByApiKey(apiKey: string) {
  const { db } = await import('@/db');
  const { agents } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');
  const rows = await db.select().from(agents).where(eq(agents.apiKey, apiKey)).limit(1);
  return rows[0] ?? null;
}
```

### Pattern 4: Set-Default Atomicity (single UPDATE + clear)

**What:** When setting a new default agent, clear the old default in the same logical operation — two sequential updates inside one request handler. No transaction needed for this (eventual consistency is acceptable — if two users click simultaneously, last write wins, which is fine since agents are shared).

```typescript
// In PUT /api/agents/:id handler — set default:
await db.update(agents).set({ isDefault: false }).where(eq(agents.isDefault, true));
await db.update(agents).set({ isDefault: true }).where(eq(agents.id, id));
```

### Pattern 5: Widget API Key Validation (replace env var)

**What:** `handleWidgetPost()` in `src/services/widget.ts` currently compares `apiKey` header to `process.env.WIDGET_API_KEY`. Replace with agent table lookup.

```typescript
// Before:
if (!configuredKey || apiKey !== configuredKey) {
  return corsJson({ error: 'Unauthorized' }, 401);
}

// After:
const agent = apiKey ? await getAgentByApiKey(apiKey) : null;
if (!agent) {
  return corsJson({ error: 'Unauthorized' }, 401);
}
// Use agent.model, agent.maxIterations, agent.systemPrompt in buildChatOptions(...)
```

### Pattern 6: Chat.tsx Agent Selector Dropdown

**What:** A `<NativeSelect>` or Chakra `Select` above the chat input, pre-populated with agents from `/api/agents`, pre-selected with the default agent, disabled once messages.length > 0.

**Key behavior:** `agentId` state is initialized to the default agent's ID when agents list loads. The `agentId` is added to the `body` passed to `useChat`:

```typescript
const { messages, ... } = useChat({
  connection: fetchHttpStream('/api/chat'),
  initialMessages,
  body: { conversationId, agentId },  // add agentId here
});
```

The dropdown is rendered only when no messages exist OR is shown as disabled/read-only once messages start:

```typescript
<Select
  disabled={messages.length > 0 || isLoading}
  value={agentId}
  onChange={(e) => setAgentId(e.target.value)}
>
  {agents.map(agent => (
    <option key={agent.id} value={agent.id}>{agent.name}</option>
  ))}
</Select>
```

### Pattern 7: Agents CRUD Page (follows cronjobs/index.tsx)

**What:** `src/routes/_protected/agents.tsx` — single-file page with table + modal (create/edit). Pattern directly mirrors `cronjobs/index.tsx`.

**Table columns:** name | model | maxIterations | isDefault badge | API key (masked + copy button) | actions (Edit, Set Default, Delete)

**Form fields (modal):**
- Name: `<Input>`
- Model: `<Input placeholder="gpt-5.2 or amazon.nova-pro-v1:0">`
- Max Iterations: `<NumberInput>` or `<Input type="number">`
- System Prompt: `<Textarea rows={6}>`
- isDefault: `<Switch>` or checkbox (optional — "Set as default" action in table may be sufficient)

### Anti-Patterns to Avoid

- **Encrypting API keys:** Agent API keys are bearer tokens (like `WIDGET_API_KEY`) — store plaintext. The encryption pattern from Phase 10 is for sensitive user PATs. Don't apply it here.
- **Making `agentId` required in existing routes:** Existing conversations have no `agentId`. Both chat endpoints must handle `agentId === undefined` gracefully by loading the default agent.
- **Blocking the request when no default agent exists:** If no agent is in the DB yet (fresh install), the system should fall back to the current `resolveAdapter()` behavior (env-based). This prevents breaking the app before agents are configured.
- **Storing `agentId` on the client's `useChat` body without also sending it to `/api/conversations` save:** The `conversationId` → `agentId` relationship must be persisted to the `conversations` table so future loads know which agent was used (even if only for display).
- **Single migration for both tables:** Use two separate migration files — one for `agents` table creation, one for adding `agentId` to `conversations`. Keeps rollback granular.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation for API keys | Custom random string generator | `crypto.randomUUID()` | Already used throughout project, collision-safe |
| Copy-to-clipboard | Manual execCommand or custom hook | `navigator.clipboard.writeText()` + `toaster.create()` | Already used in Settings page (linking code section) |
| Model routing logic | Complex string parsing | Simple `startsWith` prefix check on model string | The two adapters (`openaiText` / `bedrockText`) cover all supported models |
| Select component | Custom dropdown | Chakra UI `NativeSelect` or `Select` | Project mandates Chakra UI for all UI |
| Atomic "set default" | DB transaction | Two sequential UPDATEs | No transaction isolation risk — last write wins is acceptable |

**Key insight:** All building blocks exist. This phase is wiring and a new page — no novel infrastructure.

---

## Common Pitfalls

### Pitfall 1: agentId Not Carried Through to saveConversationToDb

**What goes wrong:** The `agentId` is sent from the client in the request body, used for `buildChatOptions()`, but never written to the `conversations` row — so the conversation has no agent association.
**Why it happens:** `saveConversationToDb()` signature currently doesn't accept `agentId`. Easy to overlook since the chat still works.
**How to avoid:** Update `saveConversationToDb()` and `appendMessagesToConversation()` to accept and persist `agentId`. Add it to the `conversations` insert.
**Warning signs:** Conversation list shows no agent info even after selecting an agent.

### Pitfall 2: Default Agent Fallback Not Handling Empty agents Table

**What goes wrong:** New install, no agents in DB → `getDefaultAgent()` returns null → `resolveAdapterForModel(null.model)` throws TypeError.
**Why it happens:** Phase assumes agents table is always populated.
**How to avoid:** Always check: `const agentConfig = agentRecord ?? null;` and pass `null` to `buildChatOptions()` which falls back to `resolveAdapter()`.
**Warning signs:** 500 error on first chat after fresh deployment.

### Pitfall 3: Widget Clients Break on WIDGET_API_KEY Removal

**What goes wrong:** Existing widget embeds using the old `WIDGET_API_KEY` env var stop working immediately.
**Why it happens:** The widget service is changed to validate against the agents table, but the old key no longer exists there.
**How to avoid:** Clearly document in `.env.example` that `WIDGET_API_KEY` is deprecated. During the plan, create a default agent first (migration or seed) so there's an agent API key to use. Consider a brief deprecation period: if the agents table lookup fails, also check `WIDGET_API_KEY` env var as fallback (optional, Claude's discretion).
**Warning signs:** Widget returns 401 after upgrade.

### Pitfall 4: Model String Does Not Match Adapter

**What goes wrong:** User types `claude-opus-4-6` (OpenAI client) but the model is actually a Bedrock model — or vice versa.
**Why it happens:** Free-text model input with no validation.
**How to avoid:** The `resolveAdapterForModel()` helper uses prefix-based heuristics (amazon., anthropic., meta. → Bedrock; anything else → OpenAI). This is a reasonable heuristic. Document in the form placeholder. LLM call will fail with a clear API error if the model string is wrong — that's acceptable per the CONTEXT decision.
**Warning signs:** API returns model-not-found error when chatting.

### Pitfall 5: Drizzle FK Type Mismatch on agentId

**What goes wrong:** Adding `agentId` to `conversations` as `uuid` type FK fails if the column type is mismatched, similar to the Phase 04 pitfall with `users.id`.
**Why it happens:** `agents.id` is `uuid` — the FK column on `conversations` must also be `uuid`, not `text`.
**How to avoid:** Use `uuid('agent_id').references(() => agents.id, { onDelete: 'set null' })` in the schema. Confirmed pattern: existing FK columns (`userId` on `jobs`, `conversations`) use `uuid` type referencing `users.id`.
**Warning signs:** `db:migrate` errors with type mismatch or Drizzle type errors at build time.

### Pitfall 6: isDefault Constraint — Zero or Multiple Defaults

**What goes wrong:** Through concurrent edits (or a bug), the table ends up with zero defaults (nothing is default) or multiple defaults.
**Why it happens:** The clear-then-set pattern requires two separate writes.
**How to avoid:** The "Set as default" endpoint always clears ALL defaults first, then sets the target. On the application layer, `getDefaultAgent()` uses `.limit(1)` — so multiple defaults won't crash the app. Zero defaults falls back to env-based resolver.

### Pitfall 7: Chat.tsx agentId State Initialization Race

**What goes wrong:** The Chat component renders before the agents list loads, `agentId` is `undefined`, and the first message is sent without an agent.
**Why it happens:** `useQuery` is async; the default agent ID isn't known on mount.
**How to avoid:** Initialize `agentId` state to `undefined`; in a `useEffect`, set it to `agents.find(a => a.isDefault)?.id` when the agents list resolves. Don't send the message until agents are loaded (disable the send button while agents are loading, or just send `agentId: undefined` which the server handles gracefully via default agent fallback).

---

## Code Examples

### Migration 0013 — agents table

```sql
-- src/db/migrations/0013_add_agents_table.sql
CREATE TABLE IF NOT EXISTS "agents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "model" text NOT NULL,
  "max_iterations" integer NOT NULL DEFAULT 10,
  "system_prompt" text NOT NULL DEFAULT '',
  "is_default" boolean NOT NULL DEFAULT false,
  "api_key" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "agents" ADD CONSTRAINT "agents_api_key_unique" UNIQUE("api_key");
```

### Migration 0014 — agentId FK on conversations

```sql
-- src/db/migrations/0014_add_agent_id_to_conversations.sql
ALTER TABLE "conversations" ADD COLUMN "agent_id" uuid;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agent_id_agents_id_fk"
  FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
```

### API Route: POST /api/agents (create)

```typescript
// src/routes/api/agents.tsx
POST: async ({ request }) => {
  const { db } = await import('@/db');
  const { agents } = await import('@/db/schema');
  const { name, model, maxIterations, systemPrompt, isDefault } = await request.json();

  const apiKey = crypto.randomUUID(); // or crypto.randomUUID().replace(/-/g, '') for hex

  if (isDefault) {
    // Clear existing default first
    await db.update(agents).set({ isDefault: false });
  }

  const [created] = await db.insert(agents).values({
    name,
    model,
    maxIterations: maxIterations ?? 10,
    systemPrompt: systemPrompt ?? '',
    isDefault: isDefault ?? false,
    apiKey,
    updatedAt: new Date(),
  }).returning();

  return new Response(JSON.stringify(created), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Modify /api/chat.tsx to read agentId

```typescript
// In POST handler:
const { messages: rawMessages, conversationId, agentId } = await request.json();

// After userId resolution:
let agentConfig = null;
if (agentId) {
  const { getAgentById } = await import('@/services/agents');
  agentConfig = await getAgentById(agentId);
}

const options = await buildChatOptions(messages, conversationId, userId, jiraSettings, githubSettings, agentConfig);
```

### IconRail — Add Agents Nav Icon

```typescript
// src/components/IconRail.tsx — add Bot icon from lucide-react
import { Bot } from 'lucide-react';

// In the icon rail flex column:
<RailIcon
  icon={<Bot size={18} />}
  label="Agents"
  to="/agents"
  isActive={pathname.startsWith('/agents')}
/>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `WIDGET_API_KEY` env var for widget auth | Per-agent API key in DB | Phase 11 | Widget embed scripts must use agent API key, not env var |
| Hardcoded `resolveAdapter()` using env vars | DB-driven `AgentConfig` passed to `buildChatOptions()` | Phase 11 | Model and iteration count configurable at runtime |
| Single hardcoded system prompt in `buildChatOptions()` | Agent-level system prompt prepended to base prompt | Phase 11 | Each agent can have specialized behavior |

**Deprecated/outdated:**
- `WIDGET_API_KEY` env var: retired in this phase, replaced by per-agent API keys from the `agents` table
- `BEDROCK_MODEL` env var: still supported as fallback but effectively superseded by agent config
- `resolveAdapter()` as primary adapter source: becomes a fallback for when no agent config is available

---

## Open Questions

1. **Should `resolveAdapter()` env-var fallback be removed or kept?**
   - What we know: It currently drives all chat calls. New installations will create an agent first.
   - What's unclear: Existing deployments may not immediately create an agent after upgrading.
   - Recommendation: Keep the env-var fallback. When `agentConfig` is null (no agent found or no agentId in request), call the existing `resolveAdapter()`. This makes the upgrade non-breaking.

2. **Should agents be seeded with a default agent on first migration?**
   - What we know: Without a default agent, Telegram/cron will get null from `getDefaultAgent()` and fall back to env-based resolution. That's safe.
   - What's unclear: User experience — the Agents page will show empty on first load with no obvious agent to select in Chat.
   - Recommendation: No seed migration needed; document in CLAUDE.md that an agent must be created before widget/custom model features work. Empty table is handled gracefully.

3. **Is `crypto.randomUUID()` sufficient for agent API keys, or should a longer hex string be used?**
   - What we know: UUID v4 is 122 bits of entropy — sufficient for a bearer token. Already used for IDs throughout the project.
   - Recommendation: Use `crypto.randomUUID()` directly. No extra libraries needed. Claude's discretion per CONTEXT.md.

---

## Validation Architecture

The `.planning/config.json` has no `workflow.nyquist_validation` key — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (existing project setup) |
| Config file | `vite.config.ts` (vitest configured inline, excludes `e2e/**`) |
| Quick run command | `pnpm vitest run src/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| `getDefaultAgent()` returns correct row | unit | `pnpm vitest run src/services/agents.test.ts` |
| `getAgentByApiKey()` returns agent or null | unit | `pnpm vitest run src/services/agents.test.ts` |
| `resolveAdapterForModel()` dispatches to correct adapter | unit | `pnpm vitest run src/services/chat.test.ts` |
| `buildChatOptions()` uses agent config when provided | unit | `pnpm vitest run src/services/chat.test.ts` |
| Widget service validates agent API key (rejects unknown keys) | unit | `pnpm vitest run src/services/widget.test.ts` |
| Widget service routes to correct agent | unit | `pnpm vitest run src/services/widget.test.ts` |
| Agents CRUD page renders (smoke) | manual / Playwright | (post-implementation Playwright QA) |

### Wave 0 Gaps

- [ ] `src/services/agents.ts` — new agent service module (does not exist yet)
- [ ] `src/services/agents.test.ts` — covers `getDefaultAgent`, `getAgentById`, `getAgentByApiKey`
- [ ] `src/services/chat.test.ts` — extend existing test to cover `agentConfig` parameter path and `resolveAdapterForModel`
- [ ] `src/services/widget.test.ts` — extend or create to cover new API key validation logic

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection of `src/services/chat.ts` — confirmed `resolveAdapter()` structure, `buildChatOptions()` signature, `agentLoopStrategy: maxIterations(15)`
- Direct code inspection of `src/db/schema.ts` — confirmed all existing table shapes, FK patterns (uuid type), and import conventions
- Direct code inspection of `src/services/widget.ts` — confirmed current API key validation logic and `buildChatOptions()` call site
- Direct code inspection of `src/routes/api/chat.tsx` and `chat-sync.tsx` — confirmed request body structure and integration points
- Direct code inspection of `src/components/Chat.tsx` — confirmed `useChat` hook usage, `body` prop, message state
- Direct code inspection of `src/routes/_protected/cronjobs/index.tsx` — confirmed CRUD page pattern with Table + mutation hooks
- Direct code inspection of `src/db/migrations/meta/_journal.json` — confirmed next migration number is 0013
- Direct code inspection of `src/lib/bedrock/bedrock-chat.ts` — confirmed `bedrockText(model)` accepts model string
- Direct code inspection of `src/components/IconRail.tsx` — confirmed nav icon addition pattern

### Secondary (MEDIUM confidence)

- STATE.md Phase decisions history — confirmed established patterns: Drizzle 0.45.1 array syntax for extras, FK uuid type requirement (Phase 04 decision), `vi.mock('@/tools')` for chat tests (Phase 02-03 decision)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, no new dependencies
- Architecture: HIGH — all integration points confirmed via direct code inspection; patterns mirror existing phases
- Pitfalls: HIGH — several drawn directly from STATE.md accumulated decisions (FK uuid type, migration journal, adapter dispatch)

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable codebase, no fast-moving dependencies)
