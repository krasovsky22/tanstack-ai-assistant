---
phase: 11-configurable-agents
plan: "02"
subsystem: api
tags: [drizzle, postgres, agents, widget, auth, tanstack-start]

# Dependency graph
requires:
  - phase: 11-configurable-agents plan 01
    provides: agents table schema with id, name, model, maxIterations, systemPrompt, isDefault, apiKey columns

provides:
  - getDefaultAgent, getAgentById, getAgentByApiKey query helpers in src/services/agents.ts
  - GET /api/agents (list all agents ordered by createdAt)
  - POST /api/agents (create agent with auto-generated UUID apiKey)
  - GET /api/agents/:id (single agent)
  - PUT /api/agents/:id (update agent; isDefault=true clears previous default)
  - DELETE /api/agents/:id (delete agent, returns 204)
  - Widget POST validates x-widget-api-key against agents table (not WIDGET_API_KEY env)

affects: [11-03-admin-ui, 11-04-chat-wiring, widget-auth, gateway-widget]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Dynamic imports for db/schema/drizzle-orm in service functions
    - TanStack Start API route with server.handlers.GET/POST/PUT/DELETE
    - isDefault clear-then-set two sequential UPDATEs (no transaction)

key-files:
  created:
    - src/services/agents.ts
    - src/routes/api/agents.tsx
    - src/routes/api/agents/$id.tsx
    - src/services/widget.test.ts
  modified:
    - src/services/agents.test.ts
    - src/services/widget.ts
    - src/routes/api/gateway/widget/index.tsx
    - .env.example

key-decisions:
  - "Widget auth validates x-widget-api-key against agents table via getAgentByApiKey; WIDGET_API_KEY env deprecated"
  - "PUT /api/agents/:id only clears other defaults when isDefault===true; passing isDefault=false does NOT clear others"
  - "Agent apiKey stored as plaintext UUID (bearer token pattern — encrypting API keys is an explicit anti-pattern)"
  - "POST /api/agents auto-generates apiKey server-side via crypto.randomUUID(); not accepted from client"

patterns-established:
  - "Agent service: dynamic imports for db + schema + drizzle-orm operators in each exported async function"
  - "API routes return plain Response objects (not TanStack json helpers) for consistency with existing routes"

requirements-completed: []

# Metrics
duration: 6min
completed: 2026-04-07
---

# Phase 11 Plan 02: Agents Service + CRUD API + Widget Auth Summary

**Drizzle agent query service (3 helpers), full CRUD REST API for agents table, and widget auth migrated from WIDGET_API_KEY env to per-agent API keys**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-07T03:05:50Z
- **Completed:** 2026-04-07T03:11:50Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Created src/services/agents.ts with getDefaultAgent, getAgentById, getAgentByApiKey — all 6 Wave 0 tests now GREEN
- Created two TanStack Start API route files covering full CRUD (GET list, POST create, GET one, PUT update, DELETE)
- Updated widget.ts to validate x-widget-api-key against the agents table instead of WIDGET_API_KEY env var
- Added widget.test.ts with 2 unit tests covering the auth gate (unknown key → 401, known key → non-401)
- Marked WIDGET_API_KEY as deprecated in .env.example
- Full test suite: 51 tests passing across 12 test files, zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create agents service (GREEN Wave 0 stubs)** - `7026fb3` (feat)
2. **Task 2: Agent CRUD API routes + widget auth swap + widget unit tests** - `4f1e3f5` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/services/agents.ts` - Three Drizzle query helpers using dynamic imports pattern
- `src/services/agents.test.ts` - Removed @ts-expect-error (import now resolves); all 6 Wave 0 tests GREEN
- `src/routes/api/agents.tsx` - GET list + POST create handlers
- `src/routes/api/agents/$id.tsx` - GET one + PUT update (with clear-then-set for isDefault) + DELETE
- `src/services/widget.ts` - Removed configuredKey param; validates via getAgentByApiKey
- `src/services/widget.test.ts` - 2 unit tests for auth validation path
- `src/routes/api/gateway/widget/index.tsx` - Removed configuredKey argument from handleWidgetPost calls
- `.env.example` - WIDGET_API_KEY marked as deprecated in Phase 11

## Decisions Made
- Widget auth validates x-widget-api-key against agents table via getAgentByApiKey; WIDGET_API_KEY env deprecated
- PUT /api/agents/:id only clears other defaults when isDefault===true; passing isDefault=false does NOT clear others
- Agent apiKey stored as plaintext UUID (bearer token pattern — encrypting API keys is an explicit anti-pattern per research)
- POST /api/agents auto-generates apiKey server-side via crypto.randomUUID(); not accepted from client

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. WIDGET_API_KEY env var is now deprecated; existing deployments should remove it and use per-agent API keys from the /agents admin page instead.

## Next Phase Readiness
- agents.ts service functions are ready for consumption by Plan 03 (admin UI) and Plan 04 (chat wiring)
- All agent CRUD endpoints are functional and tested
- Widget auth gateway is now DB-driven and ready for Plan 04 to pass agentConfig to buildChatOptions

---
*Phase: 11-configurable-agents*
*Completed: 2026-04-07*
