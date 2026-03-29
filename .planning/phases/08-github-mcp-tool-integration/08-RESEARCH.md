# Phase 8: GitHub MCP Tool Integration - Research

**Researched:** 2026-03-29
**Domain:** GitHub MCP Server, Drizzle ORM schema migration, per-user credential storage, Chakra UI settings card
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**MCP Transport**
- Use streamable HTTP to `https://api.githubcopilot.com/mcp/` — GitHub's hosted MCP endpoint
- Same transport pattern as `zapier-mcp.ts` (StreamableHTTPClientTransport + bearer token)
- GitHub PAT passed as bearer token in Authorization header
- No stdio subprocess, no local binary, no Docker container

**Tool Registration**
- Dynamically load ALL tools the GitHub MCP server exposes via `client.listTools()`
- Mirror the Zapier pattern: no hardcoded allowlist, tools evolve with the server
- Tools silently unavailable when user has no GitHub PAT configured — consistent with Jira behavior

**PAT Storage**
- Add `githubPat` column to the existing `userSettings` table (new Drizzle migration)
- No separate table, no system-level env var fallback
- Per-user only: tools only activate when the logged-in user has a PAT saved

**Settings UI**
- New `GitHubSettingsCard` component on the Settings page (below existing Jira card)
- Same card pattern as `JiraIntegrationCard`: input + save button + connection feedback
- After save: validate by calling GitHub API — show "Connected as @username" on success or an error on failure
- When PAT already saved: show masked placeholder (••••••••••••) with an "Update" button
- Show required PAT scopes near the input field ("Requires: repo, read:user scopes")
- No tools list display — keep the card focused on credential management

### Claude's Discretion
- Exact GitHub API endpoint used for PAT validation (MCP tool call vs direct REST call)
- MCP client singleton lifecycle (shared vs per-user instance)
- Error handling when GitHub MCP server is unreachable

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 8 integrates the GitHub-hosted MCP server (`https://api.githubcopilot.com/mcp/`) into the AI assistant using the exact same pattern already established for Zapier MCP. The core work is: add a `github_pat` column to the `user_settings` table via a new Drizzle migration, create `src/tools/github-mcp.ts` mirroring `zapier-mcp.ts` but accepting a per-user PAT parameter instead of env vars, register the new tool factory in `buildChatOptions()` with a `github` DISABLE_TOOLS key, and add a `GitHubSettingsCard` component to the Settings page.

The GitHub MCP endpoint accepts a `Bearer <PAT>` header and exposes 19+ toolsets dynamically. The `@modelcontextprotocol/sdk` package is already installed in the project. PAT validation should use a direct GitHub REST call (`GET https://api.github.com/user`) with the PAT as a bearer token — this is lightweight, always available, and returns the user's login name for the "Connected as @username" display. A fresh MCP `Client` instance per PAT is the correct approach (not a singleton) because different users have different PATs.

The entire Drizzle/settings/UI scaffolding already exists: `userSettings` table, `upsertUserSettings()`, `getUserSettings()`, the `/api/user-settings` route, and the Settings page. This phase adds one column, one tool file, two small edits to existing files, and one new UI component.

**Primary recommendation:** Copy `zapier-mcp.ts` → `github-mcp.ts`, change the factory signature to accept `githubPat: string`, remove the singleton pattern, add `github` to `DISABLE_TOOLS` guard in `buildChatOptions()`, add `githubPat` to DB schema and service, and build `GitHubSettingsCard` following `JiraIntegrationCard` exactly.

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | Already installed | MCP Client, StreamableHTTPClientTransport | Used by `zapier-mcp.ts` today |
| `drizzle-orm` / `drizzle-kit` | Already installed | Schema column addition + migration | Established DB pattern in project |
| `@tanstack/ai` | Already installed | `toolDefinition()` wrapper | Used by all existing tool files |
| `zod` | Already installed | JSON schema → Zod conversion | `jsonSchemaToZod()` already written in `zapier-mcp.ts` |
| Chakra UI | Already installed | Settings card UI | All UI uses Chakra; `JiraIntegrationCard` is the direct template |
| `@tanstack/react-form` | Already installed | PAT input form | Used by `JiraIntegrationCard` |
| `@tanstack/react-query` | Already installed | Settings data fetching | Used by `SettingsPage` today |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native `fetch` | Built-in | PAT validation via `GET https://api.github.com/user` | Used in the Settings API route to validate before saving |
| `lucide-react` | Already installed | GitHub card icon | `Github` icon exists in lucide-react |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct REST for PAT validation | MCP `whoami` tool call | REST is simpler, no MCP connection needed for validation; MCP tool availability is not guaranteed before auth confirms |
| Per-request MCP Client | Singleton per PAT | Per-request is cleaner (no stale connection state); singleton would require keying by PAT string which adds complexity |

**Installation:** No new packages needed — all dependencies are already present.

---

## Architecture Patterns

### Recommended File Layout
```
src/
├── tools/
│   ├── github-mcp.ts          # NEW: mirrors zapier-mcp.ts, accepts githubPat param
│   └── index.ts               # EDIT: add getGitHubMcpTools export
├── services/
│   └── user-settings.ts       # EDIT: add githubPat to UserSettingsRecord interface
├── db/
│   ├── schema.ts              # EDIT: add githubPat column to userSettings table
│   └── migrations/
│       └── 0012_add_github_pat.sql   # NEW: ALTER TABLE migration
├── routes/
│   ├── api/
│   │   └── user-settings.tsx  # EDIT: include githubPat in GET/PUT handlers + masking
│   └── _protected/
│       └── settings.tsx       # EDIT: add GitHubSettingsCard component below JiraIntegrationCard
└── services/
    └── chat.ts                # EDIT: load GitHub PAT from userSettings, pass to getGitHubMcpTools()
```

### Pattern 1: Per-User MCP Tool Factory (mirrors zapier-mcp.ts)
**What:** An async function that accepts `githubPat: string`, creates a new MCP Client per call, connects via StreamableHTTPClientTransport with the PAT as bearer token, calls `client.listTools()`, and returns an array of `toolDefinition()` objects.
**When to use:** Any MCP server where credentials are per-user rather than global env vars.
**Example:**
```typescript
// Source: mirrors src/tools/zapier-mcp.ts pattern
export async function getGitHubMcpTools(githubPat: string) {
  try {
    const transport = new StreamableHTTPClientTransport(
      new URL('https://api.githubcopilot.com/mcp/'),
      {
        requestInit: {
          headers: { Authorization: `Bearer ${githubPat}` },
        },
      },
    );
    const client = new Client({ name: 'tanstack-ai-assistant', version: '1.0.0' });
    await client.connect(transport);

    const { tools } = await client.listTools();
    return tools.map((tool) => {
      const schema = tool.inputSchema as Record<string, unknown>;
      const inputSchema = (
        schema?.type === 'object' ? jsonSchemaToZod(schema) : z.object({})
      ) as z.ZodObject<z.ZodRawShape>;

      return toolDefinition({
        name: tool.name,
        description: tool.description ?? '',
        inputSchema,
      }).server(async (input) => {
        const result = await client.callTool({
          name: tool.name,
          arguments: input as Record<string, unknown>,
        });
        console.log('[GitHub MCP] Tool call result:', result);
        return result;
      });
    });
  } catch (error) {
    console.warn('[GitHub MCP] Not available, skipping tools:', (error as Error).message);
    return [];
  }
}
```

### Pattern 2: buildChatOptions() GitHub Integration
**What:** Load `githubPat` from the user's settings (already fetched alongside Jira settings) and pass it to `getGitHubMcpTools()` conditionally, guarded by `enabled('github')`.
**When to use:** Adding any new per-user tool group to the agent.
**Example:**
```typescript
// Source: src/services/chat.ts — follows Jira conditional pattern
const [zapierTools, cronjobTools, newsApiTools, githubTools] = await Promise.all([
  enabled('zapier') ? getZapierMcpToolDefinitions() : Promise.resolve([]),
  Promise.resolve(enabled('cronjob') ? getCronjobTools(userId) : []),
  Promise.resolve(enabled('news') ? getNewsApiTools() : []),
  enabled('github') && githubPat
    ? getGitHubMcpTools(githubPat)
    : Promise.resolve([]),
]);
```
Note: `buildChatOptions()` must receive `githubPat` as a parameter (add to function signature alongside `jiraSettings`).

### Pattern 3: PAT Validation via GitHub REST
**What:** After the user saves a PAT, call `GET https://api.github.com/user` with the PAT as bearer token. On success, return the `login` field as the connected username.
**When to use:** Lightweight "ping" validation before committing PAT to DB.
**Example:**
```typescript
// Source: GitHub REST API docs — https://docs.github.com/en/rest/users/users#get-the-authenticated-user
async function validateGitHubPat(pat: string): Promise<{ login: string } | null> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { login: data.login };
}
```
The `/api/user-settings` PUT handler can call this after parsing the body and before upsert.

### Pattern 4: Drizzle Migration for New Column
**What:** Add `github_pat text` column to the existing `user_settings` table.
**Example:**
```sql
-- 0012_add_github_pat.sql
ALTER TABLE "user_settings" ADD COLUMN "github_pat" text;
```
The Drizzle schema change:
```typescript
// src/db/schema.ts — add to userSettings pgTable definition
githubPat: text('github_pat'),
```

### Anti-Patterns to Avoid
- **Singleton MCP client for GitHub:** Unlike Zapier (one global token), GitHub PAT is per-user. A module-level `let mcpClient` singleton would serve one user's token to all requests. Do NOT copy the singleton pattern from `zapier-mcp.ts`.
- **Calling client.listTools() inside the .server() handler:** List tools once at factory-init time, not on every tool invocation. The current Zapier pattern does this correctly.
- **Re-using the masked PAT placeholder string as a real PAT:** The PUT handler in `user-settings.tsx` already handles `••••••••` → keep existing value; extend this same logic for `githubPat`.
- **Skipping the migration:** Do not use `db:push` alone — the project's established pattern requires both a `.sql` migration file and a journal entry (per STATE.md decision 01-01).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Schema → Zod conversion | Custom schema converter | Copy `jsonSchemaToZod()` from `zapier-mcp.ts` | Already handles all types used by MCP tool schemas |
| MCP client connection | Custom HTTP MCP client | `@modelcontextprotocol/sdk` `Client` + `StreamableHTTPClientTransport` | Already installed; handles protocol framing, SSE, and retries |
| Tool wrapping | Manual fetch calls to GitHub API | `client.callTool()` from MCP SDK | Tools evolve with the server; hardcoding API calls defeats the purpose |
| PAT masking in API response | Custom masking logic | Follow exact pattern from `/api/user-settings.tsx` Jira PAT handling | Consistent UX; the pattern handles empty-string → null conversion |

**Key insight:** The only net-new code for the tool layer is copying `zapier-mcp.ts` and changing: (1) the URL, (2) the function signature to accept a `pat` parameter instead of env vars, (3) removing the module singleton.

---

## Common Pitfalls

### Pitfall 1: Singleton MCP Client With Per-User Tokens
**What goes wrong:** Copy the Zapier singleton (`let mcpClient: Client | null = null`) into the GitHub tool file. All users share the first user's token. Requests from other users use wrong credentials silently.
**Why it happens:** `zapier-mcp.ts` uses a singleton because Zapier has one global token from env vars. GitHub tokens are per-user.
**How to avoid:** `getGitHubMcpTools(githubPat)` creates a new `Client` instance per call. No module-level client variable.
**Warning signs:** All GitHub tool calls succeed for one user but return 401/403 results for others.

### Pitfall 2: buildChatOptions() Not Receiving githubPat
**What goes wrong:** `githubPat` is loaded from DB in the API route but not threaded through to `buildChatOptions()`. GitHub tools are never registered.
**Why it happens:** `buildChatOptions()` currently takes `jiraSettings` but not a separate `githubPat` param. It's easy to load the PAT in the route but forget to pass it.
**How to avoid:** Update `buildChatOptions()` signature: add `githubPat?: string | null` parameter. Both `chat.tsx` and `chat-sync.tsx` API routes must be updated to load githubPat from `getUserSettings()` and pass it.
**Warning signs:** GitHub tools never appear in the agent's tool list even when PAT is saved.

### Pitfall 3: Migration Journal Not Updated
**What goes wrong:** Running `db:push` to add the column without creating the `.sql` migration file and updating `_journal.json`.
**Why it happens:** `db:push` is faster for development but bypasses the migration file system.
**How to avoid:** Per project decision 01-01 in STATE.md: always create the `.sql` file AND update `_journal.json`. The next migration is `0012_add_github_pat.sql`.
**Warning signs:** `db:migrate` fails on other environments; `__drizzle_migrations` tracking table is out of sync.

### Pitfall 4: PAT Validation Failure Blocking Save
**What goes wrong:** If PAT validation is wired to block the save on failure, users cannot save a PAT that has restricted scopes or when the GitHub API is momentarily unavailable.
**Why it happens:** Overly strict server-side validation.
**How to avoid:** PAT validation is a UI feedback mechanism — save the PAT regardless, then show "Connected as @username" on success or "Could not validate — PAT saved but may have insufficient scopes" on failure. Do not return HTTP 4xx if GitHub's `/user` endpoint is unreachable.
**Warning signs:** Users report "cannot save" even when entering a valid PAT.

### Pitfall 5: Masked PAT Sent as Real PAT on Update
**What goes wrong:** User opens Settings, doesn't touch the PAT field (showing `••••••••`), and hits Save. The masked string gets written to the DB as the new PAT value.
**Why it happens:** The form submits the current field value including the placeholder.
**How to avoid:** In the PUT handler, check `if (githubPat === '••••••••') { keep existing }` — the exact pattern already used for `jiraPat` in `/api/user-settings.tsx`.
**Warning signs:** GitHub MCP returns 401 after a settings save where user didn't intend to change the PAT.

---

## Code Examples

### Schema Column Addition
```typescript
// src/db/schema.ts — add to userSettings pgTable
export const userSettings = pgTable('user_settings', {
  // ... existing columns ...
  jiraDefaultProject: text('jira_default_project'),
  githubPat: text('github_pat'),           // NEW
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### UserSettingsRecord Interface Extension
```typescript
// src/services/user-settings.ts
export interface UserSettingsRecord {
  jiraBaseUrl: string | null;
  jiraEmail: string | null;
  jiraPat: string | null;
  jiraDefaultProject: string | null;
  githubPat: string | null;   // NEW
}
```
The `upsertUserSettings` and `getUserSettings` functions automatically pick up the new field via the spread/returning pattern once the interface is updated.

### buildChatOptions() Signature Change
```typescript
// src/services/chat.ts
export async function buildChatOptions(
  messages: any[],
  conversationId?: string,
  userId?: string | null,
  jiraSettings?: UserJiraSettings | null,
  githubPat?: string | null,             // NEW
)
```

### Settings Card Structure (Chakra UI)
```tsx
// Pattern from JiraIntegrationCard — GitHubSettingsCard follows same structure:
// 1. Box wrapper with bg/border/shadow
// 2. Header section (px="6" py="4") with title, subtitle, status Badge
// 3. Body section (px="6" py="5") with form
// 4. Single password Input for PAT
// 5. Helper text showing required scopes
// 6. Save Button with loading state
// 7. Connection status text below button (shown after validation)
```

### GitHub REST PAT Validation
```typescript
// Called server-side in /api/user-settings PUT handler after parsing body
const validationRes = await fetch('https://api.github.com/user', {
  headers: {
    Authorization: `Bearer ${githubPat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  },
});
const connectedAs = validationRes.ok
  ? (await validationRes.json()).login
  : null;
// Return connectedAs in PUT response for UI display
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GitHub MCP via stdio subprocess (local binary) | Remote hosted endpoint via streamable HTTP | 2025–2026 | No local install required; PAT is the only config |
| Hardcoded tool allowlist | Dynamic `client.listTools()` | MCP SDK matured | Tools evolve without code changes |
| Classic PAT (ghp_) | Fine-grained PAT also supported | GitHub 2023 | Either PAT type works with bearer auth |

**Tool availability at runtime:** The GitHub MCP server at `https://api.githubcopilot.com/mcp/` exposes 19+ toolsets. The `listTools()` call returns only the tools accessible to the authenticated PAT's scopes — the server filters based on token OAuth scope detection. This means tool availability is automatically correct per user's PAT without any client-side filtering.

---

## Open Questions

1. **MCP client connection reuse within a single request**
   - What we know: Creating a new Client per `buildChatOptions()` call adds latency (one extra HTTP round-trip to connect before listing tools)
   - What's unclear: Whether the GitHub MCP endpoint connection is stateless (re-connect OK) or session-based (connection must be maintained)
   - Recommendation: Create a fresh client per `buildChatOptions()` call (safest). If latency becomes a problem, add a short-lived per-PAT LRU cache with TTL.

2. **PAT validation endpoint availability**
   - What we know: `GET https://api.github.com/user` is the standard lightweight auth check
   - What's unclear: Whether there is a rate limit concern for validation on every settings save
   - Recommendation: Validate only on save (not on every page load). Rate limit is 5000 req/hr per PAT — not a concern for user settings saves.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | none — uses vite.config.ts |
| Quick run command | `pnpm vitest run src/tools/github-mcp.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| `getGitHubMcpTools()` returns `[]` when MCP connect throws | unit | `pnpm vitest run src/tools/github-mcp.test.ts` | Wave 0 |
| `getGitHubMcpTools()` returns tool definitions when listTools succeeds | unit | `pnpm vitest run src/tools/github-mcp.test.ts` | Wave 0 |
| `UserSettingsRecord` includes `githubPat` field | unit (schema import check) | `pnpm vitest run src/services/user-settings.test.ts` | Wave 0 |
| `chat.ts` `buildChatOptions()` includes GitHub tools when githubPat provided | unit | `pnpm vitest run src/services/chat.test.ts` | Exists (extend) |
| Settings API PUT masks github_pat in response | unit | `pnpm vitest run src/routes/api/user-settings.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run <specific test file>`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/tools/github-mcp.test.ts` — unit tests for tool factory (RED: import fails before implementation)
- [ ] `src/services/user-settings.test.ts` — import-check for `githubPat` in `UserSettingsRecord` (RED pattern per project convention)
- [ ] `src/routes/api/user-settings.test.ts` — PAT masking behaviour for `githubPat`

---

## Sources

### Primary (HIGH confidence)
- GitHub official repository `github/github-mcp-server` README — endpoint URL, auth method, toolsets
- `github/github-mcp-server` `docs/remote-server.md` — 19+ toolsets, URL path modifiers, header options
- GitHub Docs `set-up-the-github-mcp-server` — PAT configuration pattern
- Project source `src/tools/zapier-mcp.ts` — copy-target pattern (direct code read)
- Project source `src/db/schema.ts` — current `userSettings` table definition (direct code read)
- Project source `src/routes/_protected/settings.tsx` — `JiraIntegrationCard` UI template (direct code read)
- Project source `src/routes/api/user-settings.tsx` — PAT masking + upsert pattern (direct code read)
- Project source `src/services/user-settings.ts` — `UserSettingsRecord` interface (direct code read)
- Project source `src/services/chat.ts` — `buildChatOptions()` signature and tool loading pattern (direct code read)
- Project `STATE.md` — migration journal requirement (decision 01-01)

### Secondary (MEDIUM confidence)
- GitHub Changelog 2026-01-28 "GitHub MCP Server: New Projects tools, OAuth scope filtering" — confirms dynamic scope-based tool filtering behavior

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed; patterns directly verified from source code
- Architecture: HIGH — GitHub MCP endpoint URL verified from official docs; code patterns copied from existing project files
- Pitfalls: HIGH — derived from direct reading of existing code and project STATE.md decisions
- Validation: HIGH — test framework and pattern verified from existing test files

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (GitHub MCP endpoint is stable; SDK versions are pinned)
