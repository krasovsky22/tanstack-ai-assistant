# Phase 3: jira-integration - Research

**Researched:** 2026-03-11
**Domain:** Jira Server REST API v2, LLM tool integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use Jira personal access token (PAT) stored as an environment variable
- PAT is sent as a Bearer token in the Authorization header
- No OAuth flow required — simple static token configuration
- Implement all 5 tool capabilities:
  1. Search/Execute JQL Queries
  2. Edit/Update Ticket Descriptions
  3. Add Comments to Issues
  4. Read All Comments
  5. Assign Tickets to Users
- Documentation: https://developer.atlassian.com/server/jira/platform/rest/v11002/intro/#gettingstarted
- Jira Server REST API v11002 (not Jira Cloud)
- Follow existing tool patterns in `src/tools/` (see `crontool.ts` for reference)
- Register new tool in `src/tools/index.ts` and `buildChatOptions()` in `src/services/chat.ts`
- Use Zod schema validation for tool inputs
- Follow existing env var pattern — add to `.env.example` with descriptive comments
- Variables needed: Jira base URL, personal access token, (optionally) default project key

### Claude's Discretion
- Exact field selection for JQL search results (balance verbosity vs usefulness)
- Error handling strategy for Jira API failures
- Whether to implement pagination for large result sets
- Whether to add a "get issue details" convenience tool

### Deferred Ideas (OUT OF SCOPE)
- OAuth 2.0 / Jira Cloud support
- Webhook integration for real-time issue updates
- Bulk operations across multiple issues
- Jira project management (create projects, manage boards)
- File attachments upload/download
</user_constraints>

---

## Summary

This phase adds a `src/tools/jiratool.ts` file containing 5 LLM-callable tools that interact with the Jira Server REST API v2. The integration is purely HTTP-based using the native `fetch` API — no Jira SDK is needed. Authentication is a static Bearer token passed in the `Authorization` header.

The Jira Server REST API v2 uses plain text (or wiki markup) for text fields. This is different from Jira Cloud's v3 API which uses Atlassian Document Format (ADF). Since the user is on Jira Server v11002, all bodies accept plain strings. Descriptions and comments are simple `{ "fields": { "description": "..." } }` and `{ "body": "..." }` payloads respectively. Assignee is set by username (the `name` field), not `accountId` — `accountId` is Cloud-only.

The tool file structure mirrors `crontool.ts` exactly: export a `getJiraTools()` function, use `toolDefinition().server()` from `@tanstack/ai`, validate inputs with Zod schemas, and lazy-import nothing (no DB needed — all Jira calls go over HTTP). Registration follows the same guarded pattern in `buildChatOptions()` using the `DISABLE_TOOLS` env var.

**Primary recommendation:** Implement as a single `src/tools/jiratool.ts` file with a `getJiraTools()` factory, using native `fetch` with Bearer auth. No external packages needed.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/ai` | existing | `toolDefinition()` API | Already used by all tools in project |
| `zod` | existing | Input schema validation | Already used by all tools in project |
| Native `fetch` | Node 18+ | HTTP requests to Jira API | No extra deps; project already uses it in newsapi.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | — | No additional packages needed | All functionality achievable with fetch + zod |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `fetch` | `jira.js` npm package | jira.js adds a dep; fetch is already the project pattern (newsapi.ts uses it). No benefit. |
| Native `fetch` | `axios` | axios is not in the project; unnecessary dep for simple REST calls |

**Installation:**
```bash
# No new packages required
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/tools/
├── jiratool.ts      # NEW: Jira tool definitions (5 LLM-callable tools)
├── crontool.ts      # Reference: existing pattern
├── newsapi.ts       # Reference: existing HTTP fetch pattern
└── index.ts         # Add getJiraTools export
```

### Pattern 1: Tool File Structure (mirrors crontool.ts)
**What:** Export a single factory function returning an array of `toolDefinition` objects.
**When to use:** Every tool file in this project follows this pattern.
**Example:**
```typescript
// src/tools/jiratool.ts
import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

function jiraFetch(path: string, options?: RequestInit) {
  const baseUrl = process.env.JIRA_BASE_URL;
  const token = process.env.JIRA_PAT;
  return fetch(`${baseUrl}/rest/api/2${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
}

export function getJiraTools() {
  return [
    toolDefinition({ name: 'jira_search', ... }).server(async ({ jql, maxResults }) => {
      // ...
    }),
    // ... other tools
  ];
}
```

### Pattern 2: Env Var Guard (mirrors newsapi.ts)
**What:** Check for required env vars at the top of each `.server()` handler and return an error object if missing.
**When to use:** Any tool that requires env configuration.
**Example:**
```typescript
.server(async (args) => {
  const baseUrl = process.env.JIRA_BASE_URL;
  const token = process.env.JIRA_PAT;
  if (!baseUrl || !token) {
    return {
      success: false,
      error: 'JIRA_BASE_URL and JIRA_PAT environment variables are not configured. Ask the user to set them.',
    };
  }
  // ... proceed
})
```

### Pattern 3: Registration in buildChatOptions (mirrors existing tools)
**What:** Import the factory, add a guarded entry to the tools array.
**When to use:** Every new tool group.
**Example:**
```typescript
// src/services/chat.ts — inside buildChatOptions()
const { getJiraTools, ... } = await import('@/tools');
// In tools array:
...(enabled('jira') ? getJiraTools() : []),
```
And in `src/tools/index.ts`:
```typescript
export { getJiraTools } from './jiratool';
```

### Pattern 4: DISABLE_TOOLS key
**What:** The key `'jira'` must be added to the comment in `.env.example` listing valid disable keys.
**When to use:** Every new tool group.

### Anti-Patterns to Avoid
- **Importing a Jira SDK:** No `jira.js` or similar package. Native fetch matches the project style and keeps dependencies minimal.
- **Using `accountId` for assignee:** This is Jira Cloud. Jira Server uses `name` (username) for the assignee object.
- **Using ADF format for description/comments:** ADF is v3/Cloud only. Jira Server v2 accepts plain strings.
- **Top-level await for env vars:** Read env vars inside `.server()` handlers, not at module load time, so the module can be imported safely without crashing when vars are absent.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client | Custom retry/timeout logic | Native `fetch` with try/catch | Jira API is simple REST; no retries needed for LLM tools |
| Schema validation | Manual type checks | Zod (already in project) | Consistent with all existing tools |
| Auth header | Custom auth middleware | Single `jiraFetch()` helper | Centralized, avoids repetition across 5 tools |

**Key insight:** A thin private `jiraFetch()` helper function within `jiratool.ts` (not exported) handles auth headers for all 5 tools, keeping each tool handler clean.

---

## Common Pitfalls

### Pitfall 1: Jira Server vs Jira Cloud API Differences
**What goes wrong:** Using `accountId` for assignee (Cloud) or ADF for description (Cloud/v3) on a Server v2 instance — 400 errors.
**Why it happens:** Most recent online examples target Jira Cloud v3.
**How to avoid:** Jira Server REST API v2 uses `name` (username string) for assignee. Description and comment bodies are plain strings.
**Warning signs:** `400 Bad Request` with message about invalid field format.

### Pitfall 2: Missing `Content-Type` on mutating requests
**What goes wrong:** PUT/POST requests without `Content-Type: application/json` return 415 Unsupported Media Type.
**Why it happens:** Jira strictly requires the content-type header for JSON bodies.
**How to avoid:** Include in every non-GET request header.
**Warning signs:** `415` status code from Jira.

### Pitfall 3: PUT issue/assignee returns 204 No Content
**What goes wrong:** Code tries to parse JSON from the 204 response and crashes.
**Why it happens:** Jira's issue update endpoints (PUT) return 204 with no body on success.
**How to avoid:** Check `response.ok` and return `{ success: true }` without calling `.json()`.
**Warning signs:** `SyntaxError: Unexpected end of JSON input`.

### Pitfall 4: JQL result set too large for LLM context
**What goes wrong:** JQL search returns 50+ issues with full fields — exceeds LLM context window or degrades response quality.
**Why it happens:** Default `maxResults` on the Jira API is 50; full `fields` can be huge.
**How to avoid:** Default `maxResults` to 10 in the tool schema. Select only key fields: `summary`, `status`, `assignee`, `description`, `priority`, `issuetype`, `created`, `updated`.
**Warning signs:** LLM responses truncate or fail to process results.

### Pitfall 5: JIRA_BASE_URL trailing slash
**What goes wrong:** URL becomes `https://jira.example.com//rest/api/2/search` causing 404.
**Why it happens:** User adds trailing slash to `JIRA_BASE_URL`.
**How to avoid:** Trim trailing slash in `jiraFetch()`: `process.env.JIRA_BASE_URL?.replace(/\/$/, '')`.
**Warning signs:** 404 on every request.

---

## Code Examples

Verified patterns from official Atlassian sources:

### Authentication Header (HIGH confidence)
```typescript
// Source: https://developer.atlassian.com/server/jira/platform/personal-access-token/
// Source: https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html
headers: {
  'Authorization': `Bearer ${process.env.JIRA_PAT}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
}
```

### JQL Search (HIGH confidence)
```typescript
// Source: https://developer.atlassian.com/server/jira/platform/rest/v11002/api-group-issue-search/
// GET /rest/api/2/search
const params = new URLSearchParams({
  jql: jqlQuery,
  maxResults: String(maxResults ?? 10),
  fields: 'summary,status,assignee,description,priority,issuetype,created,updated',
});
const res = await jiraFetch(`/search?${params}`);
const data = await res.json();
// Returns: { total, startAt, maxResults, issues: [{ id, key, self, fields }] }
```

### Update Issue Description (HIGH confidence)
```typescript
// Source: https://developer.atlassian.com/server/jira/platform/jira-rest-api-example-edit-issues-6291632/
// PUT /rest/api/2/issue/{issueIdOrKey}  → 204 No Content on success
const res = await jiraFetch(`/issue/${issueKey}`, {
  method: 'PUT',
  body: JSON.stringify({
    fields: { description: newDescription },
  }),
});
// res.status === 204 on success; do NOT call res.json()
```

### Add Comment (HIGH confidence)
```typescript
// Source: https://developer.atlassian.com/server/jira/platform/jira-rest-api-example-add-comment-8946422/
// POST /rest/api/2/issue/{issueIdOrKey}/comment  → 201 Created
const res = await jiraFetch(`/issue/${issueKey}/comment`, {
  method: 'POST',
  body: JSON.stringify({ body: commentText }),
});
const created = await res.json();
// Returns: { id, body, author, created, updated, self }
```

### Get Comments (HIGH confidence)
```typescript
// Source: https://developer.atlassian.com/server/jira/platform/rest/v11002/
// GET /rest/api/2/issue/{issueIdOrKey}/comment
const res = await jiraFetch(`/issue/${issueKey}/comment`);
const data = await res.json();
// Returns: { startAt, maxResults, total, comments: [{ id, body, author, created, updated }] }
```

### Assign Issue (HIGH confidence — Jira Server uses `name`, not `accountId`)
```typescript
// Source: https://developer.atlassian.com/server/jira/platform/jira-rest-api-example-edit-issues-6291632/
// PUT /rest/api/2/issue/{issueIdOrKey}/assignee  → 204 No Content
const res = await jiraFetch(`/issue/${issueKey}/assignee`, {
  method: 'PUT',
  body: JSON.stringify({ name: username }),  // NOT accountId (that's Cloud only)
});
// res.status === 204 on success
// To unassign: { name: null }
```

### Error Handling Pattern
```typescript
try {
  const res = await jiraFetch(`/issue/${issueKey}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      success: false,
      error: (err.errorMessages ?? []).join('; ') || `Jira returned status ${res.status}`,
    };
  }
  // handle success...
} catch (err: any) {
  return { success: false, error: err.message };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Basic Auth (username:password base64) | Bearer PAT token | Jira Server 8.14+ | No need to handle credentials directly |
| `accountId` for user | `name` (username) for Jira Server | Always | Jira Cloud switched to accountId; Server still uses name |
| ADF rich text | Plain string | Cloud v3 only | Server v2 still uses plain strings — simpler |

**Deprecated/outdated:**
- Basic Auth with username/password: Still works but PAT is the recommended approach for Jira Server integrations per Atlassian docs.

---

## Open Questions

1. **Default project key env var**
   - What we know: CONTEXT.md lists it as optional
   - What's unclear: Whether any tool needs a default project — JQL search doesn't need it; create issue (out of scope) would
   - Recommendation: Add `JIRA_DEFAULT_PROJECT` as optional env var but do not use it in any tool implementation for this phase. Tools operate on explicit issue keys/JQL only.

2. **Pagination for JQL results**
   - What we know: API supports `startAt` + `maxResults` pagination
   - What's unclear: Whether the LLM benefits from multi-page results vs a single capped result
   - Recommendation: Implement single-page with configurable `maxResults` (default 10, max 50 via Zod). Expose `startAt` as an optional parameter so the LLM can paginate if needed. Do not implement automatic multi-page fetching.

3. **"Get issue details" convenience tool**
   - What we know: Marked as Claude's discretion
   - What's unclear: Whether there's overlap with JQL search (which can return a single issue)
   - Recommendation: Add it. A `jira_get_issue` tool with a single `issueKey` input is much more natural for LLM use than crafting JQL for a known key. It returns full details for a single issue without needing to know JQL syntax.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | `vitest.config.ts` (or package.json scripts — `pnpm test`) |
| Quick run command | `pnpm vitest run src/tools/jiratool.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| JIRA-01 | `getJiraTools()` returns array of 5 tool definitions | unit | `pnpm vitest run src/tools/jiratool.test.ts` | ❌ Wave 0 |
| JIRA-02 | Missing env vars returns `{ success: false, error: ... }` | unit | `pnpm vitest run src/tools/jiratool.test.ts` | ❌ Wave 0 |
| JIRA-03 | JQL search calls correct endpoint with Bearer auth | unit (fetch mock) | `pnpm vitest run src/tools/jiratool.test.ts` | ❌ Wave 0 |
| JIRA-04 | Update description sends PUT with correct body | unit (fetch mock) | `pnpm vitest run src/tools/jiratool.test.ts` | ❌ Wave 0 |
| JIRA-05 | Add comment sends POST with correct body | unit (fetch mock) | `pnpm vitest run src/tools/jiratool.test.ts` | ❌ Wave 0 |
| JIRA-06 | Get comments returns comment array | unit (fetch mock) | `pnpm vitest run src/tools/jiratool.test.ts` | ❌ Wave 0 |
| JIRA-07 | Assign issue sends PUT with username `name` field | unit (fetch mock) | `pnpm vitest run src/tools/jiratool.test.ts` | ❌ Wave 0 |
| JIRA-08 | Tool registered in `buildChatOptions()` under `jira` key | unit | `pnpm vitest run src/services/chat.test.ts` | ❌ Wave 0 (partial — existing file) |

### Sampling Rate
- **Per task commit:** `pnpm vitest run src/tools/jiratool.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/tools/jiratool.test.ts` — covers JIRA-01 through JIRA-07; use `vi.stubGlobal('fetch', vi.fn())` pattern to mock fetch calls without live Jira
- [ ] Update `src/services/chat.test.ts` — add assertion that `getJiraTools` is called when `jira` is not in disabled set (covers JIRA-08); existing file needs a new test case

---

## Sources

### Primary (HIGH confidence)
- https://developer.atlassian.com/server/jira/platform/personal-access-token/ — PAT usage, Bearer token header format
- https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html — confirmed `Authorization: Bearer <token>` header
- https://developer.atlassian.com/server/jira/platform/rest/v11002/intro/ — base API structure, versioning
- https://developer.atlassian.com/server/jira/platform/jira-rest-api-example-edit-issues-6291632/ — PUT body format, assignee `name` field (Server), 204 response
- https://developer.atlassian.com/server/jira/platform/jira-rest-api-example-add-comment-8946422/ — POST comment body format, 201 response

### Secondary (MEDIUM confidence)
- https://developer.atlassian.com/server/jira/platform/rest/v11002/api-group-issue-search/ — JQL search params (jql, fields, maxResults, startAt), response structure
- https://developer.atlassian.com/server/jira/platform/rest/v11002/api-group-issue-comments/ — GET comments response structure
- Atlassian developer community: confirmed v2=plain text, v3=ADF for text fields

### Tertiary (LOW confidence)
- Community forum posts on assignee endpoint behavior — cross-verified with official edit examples

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — native fetch + existing project deps, no new packages
- Architecture: HIGH — mirrors crontool.ts exactly, verified against existing code
- API endpoints: HIGH — verified against official Atlassian docs for Server v2
- Authentication: HIGH — PAT Bearer token confirmed in official docs
- Pitfalls: HIGH for Cloud-vs-Server differences (well-documented); MEDIUM for edge cases like 204 handling

**Research date:** 2026-03-11
**Valid until:** 2026-09-11 (Jira Server REST API v2 is stable; changes unlikely)
