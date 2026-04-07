---
phase: 11-configurable-agents
plan: "04"
subsystem: api
tags: [agents, llm, openai, bedrock, chat, widget, react-query]

# Dependency graph
requires:
  - phase: 11-configurable-agents plan 01
    provides: agents table schema with model/maxIterations/systemPrompt/agentId FK on conversations
  - phase: 11-configurable-agents plan 02
    provides: /api/agents REST endpoints and getAgentById/getDefaultAgent/getAgentByApiKey services
provides:
  - buildChatOptions accepts optional agentConfig to control model/maxIterations/systemPrompt
  - resolveAdapterForModel dispatches Bedrock vs OpenAI by model string prefix/pattern
  - /api/chat reads agentId from body and loads agent config from DB
  - /api/chat-sync loads default agent when no agentId supplied
  - Chat.tsx agent selector dropdown pre-selected with default agent, locked after first message
  - widget.ts passes matched agent's config to buildChatOptions
  - saveConversationToDb persists agentId to conversations table
affects:
  - future-phases-using-agents
  - widget-integration
  - gateway-worker

# Tech tracking
tech-stack:
  added: []
  patterns:
    - resolveAdapterForModel dispatches by model string prefix (amazon./anthropic./meta./) or colon presence for Bedrock; all others to OpenAI
    - agentConfig nullable param pattern — null falls back to env-based adapter, not a hard failure
    - useQuery + useEffect for agent pre-selection in Chat component

key-files:
  created:
    - src/services/chat.test.ts
  modified:
    - src/services/chat.ts
    - src/routes/api/chat.tsx
    - src/routes/api/chat-sync.tsx
    - src/components/Chat.tsx
    - src/services/widget.ts

key-decisions:
  - "resolveAdapterForModel uses eslint-disable-next-line any cast for openaiText — openaiText has a strict model union type; casting avoids breakage when users configure custom/future model names"
  - "Chat.tsx agent selector disabled (not hidden) once messages.length > 0 — per CONTEXT.md Claude Discretion decision; preserves UX clarity"
  - "saveConversationToDb receives agentId as last optional param with null default — backward compatible with all existing call sites"
  - "chat-sync loads getDefaultAgent in BOTH non-gateway and gateway flows — cron/gateway workers always get an agent config even if agentId absent from request body"

patterns-established:
  - "agentConfig nullable pattern: buildChatOptions(msgs, convId, userId, jiraSettings, githubSettings, agentConfig) — null falls back to env-based resolveAdapter"
  - "resolveAdapterForModel detects Bedrock by amazon./anthropic./meta. prefix or colon in model string"

requirements-completed: []

# Metrics
duration: 6min
completed: 2026-04-07
---

# Phase 11 Plan 04: Wire Agent Configuration into Chat Engine Summary

**DB-driven agent config wired end-to-end: buildChatOptions dispatches to Bedrock or OpenAI based on agent model string, both chat routes load agents from DB, Chat.tsx shows agent selector dropdown, and widget conversations use the matched agent's model**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-07T03:11:26Z
- **Completed:** 2026-04-07T03:17:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added `AgentConfig` interface and `resolveAdapterForModel()` to chat.ts — Bedrock detection by prefix (`amazon.`, `anthropic.`, `meta.`) or colon, all others routed to OpenAI
- `buildChatOptions()` now accepts optional `agentConfig` param — uses agent model/maxIterations/systemPrompt when provided, falls back to env-based `resolveAdapter()` when null
- Both `/api/chat` and `/api/chat-sync` load agent from DB by agentId; chat-sync falls back to `getDefaultAgent()` for cron/gateway workers that omit agentId
- `Chat.tsx` agent selector `NativeSelect` dropdown above input, pre-selected with default agent, disabled after first message sent, `agentId` included in `useChat` body
- `widget.ts` extracts agentConfig from the already-validated agent record and passes it to `buildChatOptions` — widget conversations now use the agent's model instead of env fallback
- `saveConversationToDb` updated with optional `agentId` param, persists to conversations table

## Task Commits

Each task was committed atomically:

1. **Task 1: Update buildChatOptions with agentConfig + resolveAdapterForModel** - `9e481d4` (feat + test — TDD, 15 tests)
2. **Task 2: Wire agentId into chat routes + Chat.tsx selector + widget agentConfig** - `2a2fd77` (feat)

**Plan metadata:** (docs commit follows)

_Note: Task 1 used TDD — tests written first (RED), then implementation (GREEN)_

## Files Created/Modified
- `src/services/chat.ts` - Added AgentConfig interface, resolveAdapterForModel(), agentConfig param on buildChatOptions, agentId on saveConversationToDb
- `src/services/chat.test.ts` - Created: 15 tests covering resolveAdapterForModel dispatch and agentConfig paths in buildChatOptions
- `src/routes/api/chat.tsx` - Reads agentId from body, loads agent via getAgentById, passes agentConfig to buildChatOptions
- `src/routes/api/chat-sync.tsx` - Reads agentId, loads default agent when absent, passes agentConfig to both buildChatOptions call sites
- `src/components/Chat.tsx` - useQuery for agents, agentId state, NativeSelect agent selector dropdown, agentId in useChat body
- `src/services/widget.ts` - Extracts agentConfig from matched agent record and forwards to buildChatOptions

## Decisions Made
- `openaiText(model as any)` cast used in `resolveAdapterForModel` — `openaiText` has a strict union type of known model names; casting allows users to configure custom or future model strings without code changes
- Agent selector in Chat.tsx is disabled (not removed) after first message — UI clarity: user can see which agent was selected, just can't change mid-conversation
- `saveConversationToDb` agentId is the last param with `null` default — all existing call sites remain unchanged

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript error in Chat.tsx at `setMessages((prev) => ...)` callback — existed before this plan, not introduced by these changes (verified via git stash). Documented, not fixed (out of scope per deviation scope rules).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Agents now fully control the LLM used across all chat surfaces: browser UI, gateway (Telegram), cron, and widget
- Phase 11 complete — configurable agents system is end-to-end operational
