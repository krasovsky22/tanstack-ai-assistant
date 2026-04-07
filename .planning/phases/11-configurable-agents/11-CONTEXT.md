# Phase 11: Configurable Agents - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace hardcoded LLM model env var with a DB-driven agent configuration system. Deliver: an `agents` table, a dedicated Agents admin page (/agents) with full CRUD, a per-agent API key for widget/gateway routing, an agent selector dropdown on the conversation UI, and wiring of the selected agent config into `buildChatOptions()`. Does not include per-user tool group toggles, temperature controls, or per-gateway-identity agent mapping.

</domain>

<decisions>
## Implementation Decisions

### Agent Config Fields
- Fields: `name` (display label), `model` (free-text model ID), `maxIterations` (integer), `systemPrompt` (textarea), `isDefault` (boolean), `apiKey` (auto-generated UUID on create)
- Model name is free-text input — no dropdown of presets; users type any model ID (e.g. `gpt-5.2`, `claude-opus-4-6`, `amazon.nova-pro-v1:0`)
- One agent is marked `isDefault=true` — used as fallback for Telegram, cron, and new conversations when no agent is selected
- API key is auto-generated on agent creation and displayed (for use in widget init config)

### Admin Access Control
- No access control — any authenticated user can create, edit, and delete agents
- Agents are shared across all users (not user-scoped)

### Agents Admin Page
- Dedicated route at `/agents` under the `_protected` layout (new file: `src/routes/_protected/agents.tsx`)
- Full CRUD: list agents in a table, create new agent (form/modal), edit existing, delete
- Table shows: name, model, maxIterations, isDefault badge, API key (masked/copyable), actions
- "Set as gateway agent" action on each row to designate which agent handles Telegram/cron (sets `isDefault=true`, clears it from the previous default)
- System prompt is a textarea in the create/edit form (not shown inline in the table)

### Conversation Agent Selection
- Agent dropdown sits above the chat input area (top of conversation view), pre-selected with the default agent
- Dropdown is only editable before the first message is sent — locked after the conversation starts
- Existing conversations with no `agentId` show no agent label; if the user continues them, the default agent handles the response
- No retroactive migration of existing conversations

### Per-Agent API Keys & Gateway Routing
- Each agent auto-generates a unique API key stored in the `agents` table
- `WIDGET_API_KEY` env var is retired — widget passes an agent API key instead
- `/api/gateway/widget` validates the agent API key by looking up the agents table; the matched agent config is used for that conversation
- Telegram and cron always use the agent marked `isDefault=true` (no interactive key passing possible)
- The gateway agent is configured from the Agents admin page — the agent with `isDefault=true` is the gateway agent

### Claude's Discretion
- API key generation format (UUID v4 or random hex string)
- Exact table/form layout and visual styling on the Agents page
- How the agent dropdown visually locks after first message (disabled state, tooltip, or just removed)
- Migration numbering and column ordering in the new `agents` table

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/services/chat.ts:buildChatOptions()` — integration point; `resolveAdapter()` currently hardcodes model via env var; replace with agent config lookup
- `src/services/chat.ts:resolveAdapter()` — function to replace/extend with agent-aware model selection
- `src/routes/_protected/cronjobs.tsx` — CRUD page pattern to follow for the Agents page (table + modal form)
- `src/routes/_protected/settings.tsx` — existing settings page; no changes needed (agents get their own route)
- `src/components/ui/` — existing Chakra UI components (tables, modals, badges, copy buttons) to reuse
- `src/db/schema.ts` — add `agents` table; add nullable `agentId` FK on `conversations` table

### Established Patterns
- Drizzle migrations: add new migration file under `src/db/migrations/` with sequential number (next is 0013 or higher)
- Auth pattern: all new routes go under `src/routes/_protected/` — protected by existing `_protected.tsx` layout
- `DISABLE_TOOLS` env var pattern for feature gating — not needed for agents (no tool group toggles in scope)
- `userSettings` pattern for encrypted per-user fields — not needed; API keys stored as plaintext in `agents` table (they're bearer tokens, not user secrets)

### Integration Points
- `src/routes/api/chat.tsx` — streaming chat endpoint; must read `agentId` from request, load agent config, pass to `buildChatOptions()`
- `src/routes/api/chat-sync.tsx` — sync chat endpoint for gateway/cron; must load default agent when no agentId provided
- `src/routes/api/gateway/widget.tsx` — widget proxy route; validate incoming API key against `agents` table, extract agentId
- `workers/gateway/` — Telegram worker; always loads default agent (no API key in Telegram messages)
- `workers/cron/` — cron worker; always loads default agent
- `src/components/Chat.tsx` — browser chat UI; add agent selector dropdown above the input using `useChat` hook context
- `src/components/ChatSidebar.tsx` — may need awareness of selected agent for display in conversation list

</code_context>

<specifics>
## Specific Ideas

- API key displayed on the Agents page should be copyable (copy-to-clipboard button) — needed for configuring the widget embed script
- The `isDefault` flag doubles as both "gateway agent" and "default for new browser conversations" — single concept, no separate field needed
- Widget embedding changes: `ChatWidget.init({ endpoint: '...', apiKey: '<agent-api-key>' })` — apiKey is now an agent key, not WIDGET_API_KEY

</specifics>

<deferred>
## Deferred Ideas

- Per-agent tool group toggles (enable/disable zapier, jira, github per agent) — own phase
- Temperature control per agent — own phase
- Per-gateway-identity agent mapping (each Telegram user routes to a different agent) — own phase

</deferred>

---

*Phase: 11-configurable-agents*
*Context gathered: 2026-04-07*
