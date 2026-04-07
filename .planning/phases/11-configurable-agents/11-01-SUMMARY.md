---
phase: 11-configurable-agents
plan: "01"
subsystem: database
tags: [postgres, drizzle, migrations, tdd, vitest]

# Dependency graph
requires: []
provides:
  - agents table with id, name, model, maxIterations, systemPrompt, isDefault, apiKey, createdAt, updatedAt
  - conversations.agentId nullable UUID FK referencing agents.id with onDelete set null
  - Migration 0013_add_agents_table.sql applied to DB
  - Migration 0014_add_agent_id_to_conversations.sql applied to DB
  - Wave 0 RED test stubs for getDefaultAgent, getAgentById, getAgentByApiKey
affects: [11-02-agents-service, 11-03-agents-admin-ui, 11-04-chat-agent-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "agents table defined before conversations in schema.ts to avoid FK forward reference"
    - "Wave 0 TDD stubs use @ts-expect-error on missing module import — RED state until Plan 02"
    - "Migration journal entries appended manually alongside SQL files for Drizzle tracking"

key-files:
  created:
    - src/db/migrations/0013_add_agents_table.sql
    - src/db/migrations/0014_add_agent_id_to_conversations.sql
    - src/services/agents.test.ts
  modified:
    - src/db/schema.ts
    - src/db/migrations/meta/_journal.json

key-decisions:
  - "agents table definition placed above conversations in schema.ts — FK forward reference prevention"
  - "agentId uses uuid type with onDelete: set null — nullable FK, conversation survives agent deletion"
  - "Wave 0 test stubs use @ts-expect-error on missing import — established pattern from Phase 01-01 and 03-01"

patterns-established:
  - "New FK table (agents) defined before referencing table (conversations) in schema.ts"
  - "Wave 0 RED stubs fail at module-load time via @ts-expect-error on non-existent import"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-04-07
---

# Phase 11 Plan 01: Configurable Agents DB Foundation Summary

**PostgreSQL agents table with 9 columns + conversations.agentId FK added via Drizzle migrations, with Wave 0 RED TDD stubs for the agents service**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-07T03:02:29Z
- **Completed:** 2026-04-07T03:07:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created `agents` table with all 9 required columns (id, name, model, max_iterations, system_prompt, is_default, api_key, created_at, updated_at) and unique constraint on api_key
- Added nullable `agent_id` UUID FK column to `conversations` table with onDelete set null
- Updated Drizzle schema.ts and _journal.json, applied both migrations via pnpm db:migrate (exit 0)
- Created Wave 0 RED test stubs for `getDefaultAgent`, `getAgentById`, `getAgentByApiKey` — 6 tests that fail until Plan 02 implements agents.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Add agents table to schema + migration files + journal** - `ec337b3` (feat)
2. **Task 2: Wave 0 RED test stubs for agents service** - `259a05e` (test)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/db/migrations/0013_add_agents_table.sql` - DDL for agents table with 9 columns + unique constraint
- `src/db/migrations/0014_add_agent_id_to_conversations.sql` - ALTER TABLE adding agent_id FK
- `src/db/migrations/meta/_journal.json` - Appended idx 13 and 14 journal entries
- `src/db/schema.ts` - Added agents pgTable export and agentId FK on conversations
- `src/services/agents.test.ts` - Wave 0 RED stubs: 6 tests for getDefaultAgent, getAgentById, getAgentByApiKey

## Decisions Made
- agents table defined before conversations in schema.ts — FK forward reference requires definition order
- agentId uses nullable UUID with onDelete: set null — conversations survive agent deletion
- Wave 0 test stubs use @ts-expect-error on the missing @/services/agents import (same pattern as Phase 01-01, 03-01)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DB foundation complete — Plan 11-02 (agents service) can implement getDefaultAgent, getAgentById, getAgentByApiKey against the new table
- Wave 0 test stubs will turn GREEN once agents.ts is created in Plan 02
- conversations.agentId FK ready for Plan 11-04 chat wiring

---
*Phase: 11-configurable-agents*
*Completed: 2026-04-07*
