# Phase 8: GitHub MCP Tool Integration - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate the GitHub MCP server into the AI assistant: connect to GitHub's hosted MCP endpoint via streamable HTTP, dynamically load all GitHub tools into `buildChatOptions()`, store the user's GitHub PAT in `userSettings`, and add a GitHubSettingsCard to the Settings UI for PAT entry and connection validation.

</domain>

<decisions>
## Implementation Decisions

### MCP Transport
- Use streamable HTTP to `https://api.githubcopilot.com/mcp/` — GitHub's hosted MCP endpoint
- Same transport pattern as `zapier-mcp.ts` (StreamableHTTPClientTransport + bearer token)
- GitHub PAT passed as bearer token in Authorization header
- No stdio subprocess, no local binary, no Docker container

### Tool Registration
- Dynamically load ALL tools the GitHub MCP server exposes via `client.listTools()`
- Mirror the Zapier pattern: no hardcoded allowlist, tools evolve with the server
- Tools silently unavailable when user has no GitHub PAT configured — consistent with Jira behavior

### PAT Storage
- Add `githubPat` column to the existing `userSettings` table (new Drizzle migration)
- No separate table, no system-level env var fallback
- Per-user only: tools only activate when the logged-in user has a PAT saved

### Settings UI
- New `GitHubSettingsCard` component on the Settings page (below existing Jira card)
- Same card pattern as `JiraSettingsCard`: input + save button + connection feedback
- After save: validate by calling GitHub API (e.g., GET /user via MCP or direct REST) — show "Connected as @username" on success or an error message on failure
- When PAT already saved: show masked placeholder (••••••••••••) with an "Update" button
- Show required PAT scopes near the input field (e.g., "Requires: repo, read:user scopes")
- No tools list display — keep the card focused on credential management

### Claude's Discretion
- Exact GitHub API endpoint used for PAT validation (MCP tool call vs direct REST call)
- MCP client singleton lifecycle (shared vs per-user instance)
- Error handling when GitHub MCP server is unreachable

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `zapier-mcp.ts`: Full MCP client pattern using `StreamableHTTPClientTransport` — copy and adapt for GitHub (different URL, bearer token from user PAT instead of env var)
- `userSettings` table + `user-settings.ts` service: `upsertUserSettings()` and `getUserSettings()` already handle per-user credential storage and retrieval — add `githubPat` column to the same table
- `JiraSettingsCard` (Settings page): Existing card UI pattern for credential input + validation feedback — model GitHubSettingsCard after this
- `buildChatOptions()` in `chat.ts`: Conditional tool loading pattern (`enabled('github') && githubPat ? getGitHubMcpTools(githubPat) : []`)

### Established Patterns
- Tool factory functions return arrays of `toolDefinition()` objects and are registered in `buildChatOptions()`
- `DISABLE_TOOLS` env var controls tool groups — add `github` key
- Per-user credential settings flow: load from DB in API route → pass to `buildChatOptions()` → tool factory checks for credentials
- Chakra UI for all components; `lucide-react` for icons

### Integration Points
- `src/db/schema.ts`: Add `githubPat text('github_pat')` to `userSettings` table; new migration required
- `src/services/user-settings.ts`: Extend `UserSettingsRecord` interface with `githubPat`
- `src/services/chat.ts` (`buildChatOptions()`): Add GitHub MCP tool loading alongside Zapier/Jira
- Settings page route: Add `GitHubSettingsCard` component below Jira section

</code_context>

<specifics>
## Specific Ideas

- GitHub MCP endpoint: `https://api.githubcopilot.com/mcp/` (per https://github.com/github/github-mcp-server)
- PAT validation: call a lightweight GitHub endpoint after saving to confirm the token works and display the connected username
- Required scopes hint text near the PAT input field

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-github-mcp-tool-integration*
*Context gathered: 2026-03-29*
