---
phase: quick-2
plan: "01"
subsystem: knowledge-base, notifications, tools, chat
tags: [agent-scoping, knowledge-base, notifications, drizzle, migration]
dependency_graph:
  requires: [agents table (Phase 11)]
  provides: [agent-scoped KB files, agent-scoped notifications, notification tools in chat]
  affects: [buildChatOptions, getKnowledgeBaseTools, getNotificationTools, /api/knowledge-base, /api/notifications]
tech_stack:
  added: []
  patterns: [nullable FK for agent isolation, filter-by-agentId query param pattern]
key_files:
  created:
    - src/db/migrations/0015_add_agent_id_to_kb_and_notifications.sql
  modified:
    - src/db/schema.ts
    - src/db/migrations/meta/_journal.json
    - src/routes/api/knowledge-base/index.tsx
    - src/routes/api/notifications/index.tsx
    - src/tools/knowledgebasetool.ts
    - src/tools/notificationtool.ts
    - src/tools/index.ts
    - src/services/chat.ts
    - src/routes/api/chat.tsx
    - src/routes/api/chat-sync.tsx
decisions:
  - "agentId is nullable on both tables — NULL means global/unscoped, valid for legacy rows and admin-level files"
  - "list_knowledge_base_files returns files for the agent OR global (null agentId) files — both are relevant context"
  - "getNotificationTools registered in buildChatOptions as always-on (no DISABLE_TOOLS gate) since notifications is a core agent capability"
  - "GET /api/knowledge-base without agentId returns all rows — backward-compatible for admin UI"
metrics:
  duration: "~8 min"
  completed: "2026-04-07"
  tasks_completed: 2
  files_changed: 10
---

# Quick Task 2: Knowledge Base and Notifications Scoped to Agent

Agent-scoped KB files and notifications via nullable agentId FK on both tables, API filter support, and notification tools wired into the chat engine.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add agentId FK to knowledgebase_files and notifications — schema + migration | 13f283f | schema.ts, 0015 migration, _journal.json |
| 2 | Scope KB and notification API routes + wire tools into buildChatOptions with agentId | 0092870 | 8 files |

## What Was Built

**Database:** Migration 0015 adds a nullable `agent_id uuid REFERENCES agents(id) ON DELETE SET NULL` column to both `knowledgebase_files` and `notifications`. Existing rows are unaffected (agent_id = NULL = global/unscoped).

**Knowledge Base API (`/api/knowledge-base`):**
- GET: accepts `?agentId=<uuid>` query param and filters rows by `eq(knowledgebaseFiles.agentId, agentId)`. Without agentId, all rows returned (admin-compatible).
- POST: reads `agentId` from FormData and stores it in the new column.

**Notifications API (`/api/notifications`):**
- GET: accepts `?agentId=<uuid>` and adds it to the conditions array alongside userId and unreadOnly filters.
- POST: reads `body.agentId` and stores it.

**Knowledge Base Tool (`getKnowledgeBaseTools`):**
- Signature updated to `getKnowledgeBaseTools(agentId?: string | null)`.
- New `list_knowledge_base_files` tool added — returns files belonging to the agent OR with null agentId (global files), ordered by createdAt desc, limited to 50 rows. Direct DB query via drizzle.

**Notification Tool (`getNotificationTools`):**
- Signature updated to `getNotificationTools(userId: string | null, agentId?: string | null)`.
- `create_notification` stores `agentId` in the insert.
- `list_notifications` filters by `agentId` when provided.

**Tools index (`src/tools/index.ts`):** `getNotificationTools` exported.

**Chat service (`buildChatOptions`):**
- New `agentId?: string | null` parameter (7th arg).
- `getKnowledgeBaseTools(agentId)` called with agentId.
- `getNotificationTools(userId ?? null, agentId)` registered as always-on tools.

**Chat routes:**
- `/api/chat`: passes `agentId ?? null` as 7th arg to `buildChatOptions`.
- `/api/chat-sync`: passes `agentId ?? null` in both non-gateway and gateway flows.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/db/migrations/0015_add_agent_id_to_kb_and_notifications.sql` exists
- [x] `src/db/schema.ts` has agentId on knowledgebaseFiles and notifications
- [x] `pnpm db:migrate` applied migration successfully (`[✓] migrations applied successfully!`)
- [x] `pnpm build` passed with no TypeScript errors (`✓ built in 37.48s`)
- [x] Commits 13f283f and 0092870 exist in git log

## Self-Check: PASSED
