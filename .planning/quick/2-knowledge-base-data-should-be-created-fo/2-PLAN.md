---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/db/schema.ts
  - src/db/migrations/0015_add_agent_id_to_kb_and_notifications.sql
  - src/routes/api/knowledge-base/index.tsx
  - src/routes/api/knowledge-base/$id.tsx
  - src/routes/api/notifications/index.tsx
  - src/tools/knowledgebasetool.ts
  - src/tools/notificationtool.ts
  - src/tools/index.ts
  - src/services/chat.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "Knowledge base files uploaded via the UI or LLM tool are scoped to the active agent"
    - "Fetching knowledge base files only returns files for the requesting agent"
    - "Notifications created by the LLM tool are scoped to the active agent"
    - "Fetching notifications only returns notifications for the requesting agent"
  artifacts:
    - path: "src/db/migrations/0015_add_agent_id_to_kb_and_notifications.sql"
      provides: "DB migration adding agentId FK to knowledgebase_files and notifications"
    - path: "src/db/schema.ts"
      provides: "Updated schema with agentId on knowledgebase_files and notifications"
    - path: "src/services/chat.ts"
      provides: "buildChatOptions passes agentId to KB and notification tools"
  key_links:
    - from: "src/services/chat.ts buildChatOptions"
      to: "src/tools/knowledgebasetool.ts getKnowledgeBaseTools"
      via: "agentId parameter"
    - from: "src/services/chat.ts buildChatOptions"
      to: "src/tools/notificationtool.ts getNotificationTools"
      via: "agentId parameter"
    - from: "src/routes/api/knowledge-base/index.tsx GET"
      to: "knowledgebaseFiles.agentId"
      via: "eq filter on agentId query param"
---

<objective>
Scope knowledge base files and notifications to individual agents. Currently both tables have no agent association — all agents share the same KB files and notifications. This plan adds an agentId FK to both tables, filters API reads by agentId, passes agentId through the tool layer, and wires the notification tool (currently unused) into the chat engine.

Purpose: Each agent has its own isolated knowledge base and notification stream so per-agent customization is meaningful.
Output: DB migration, updated schema, updated API routes, updated tools, updated buildChatOptions.
</objective>

<execution_context>
@/Users/RandomPotato/.claude/get-shit-done/workflows/execute-plan.md
@/Users/RandomPotato/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/db/schema.ts
@src/services/chat.ts
@src/tools/knowledgebasetool.ts
@src/tools/notificationtool.ts
@src/tools/index.ts
@src/routes/api/knowledge-base/index.tsx
@src/routes/api/notifications/index.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add agentId FK to knowledgebase_files and notifications — schema + migration</name>
  <files>src/db/schema.ts, src/db/migrations/0015_add_agent_id_to_kb_and_notifications.sql</files>
  <action>
1. In `src/db/schema.ts`, add an `agentId` column to both `knowledgebaseFiles` and `notifications`:

For `knowledgebaseFiles` (add after `updatedAt`):
```ts
agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
```

For `notifications` (add after `userId`):
```ts
agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
```

Both are nullable — existing rows have no agent, which is acceptable (NULL = global/unscoped).

2. Create migration file `src/db/migrations/0015_add_agent_id_to_kb_and_notifications.sql`:
```sql
ALTER TABLE "knowledgebase_files" ADD COLUMN "agent_id" uuid REFERENCES "agents"("id") ON DELETE SET NULL;
ALTER TABLE "notifications" ADD COLUMN "agent_id" uuid REFERENCES "agents"("id") ON DELETE SET NULL;
```

3. Backfill migration tracking: check `.planning/STATE.md` decision pattern (01-01, 08) — after running `pnpm db:migrate`, if journal entry is missing, insert it manually. Run `pnpm db:migrate` to apply.
  </action>
  <verify>
    <automated>cd /Users/RandomPotato/Workspace/tanstack-ai-assistant && pnpm db:migrate 2>&1 | tail -5</automated>
  </verify>
  <done>Migration applied without errors; `knowledgebase_files` and `notifications` tables each have an `agent_id` column in the DB.</done>
</task>

<task type="auto">
  <name>Task 2: Scope KB and notification API routes + wire tools into buildChatOptions with agentId</name>
  <files>
    src/routes/api/knowledge-base/index.tsx,
    src/routes/api/notifications/index.tsx,
    src/tools/knowledgebasetool.ts,
    src/tools/notificationtool.ts,
    src/tools/index.ts,
    src/services/chat.ts
  </files>
  <action>
**`src/routes/api/knowledge-base/index.tsx` GET handler:**
- Read `agentId` from query param: `url.searchParams.get('agentId')`
- Add `agentId` filter to the query: when `agentId` is present, add `eq(knowledgebaseFiles.agentId, agentId)` condition (alongside existing `search` filter)
- When `agentId` is absent, return all rows (backward-compatible for admin use)

**`src/routes/api/knowledge-base/index.tsx` POST handler:**
- Read `agentId` from the `FormData` via `formData.get('agentId')` (string or null)
- Pass `agentId: agentId ?? null` into the `db.insert(knowledgebaseFiles).values({...})` call

**`src/routes/api/notifications/index.tsx` GET handler:**
- Read `agentId` from query param: `url.searchParams.get('agentId')`
- When present, add `eq(notifications.agentId, agentId)` to conditions array alongside existing userId/unreadOnly conditions

**`src/routes/api/notifications/index.tsx` POST handler:**
- Include `agentId: body.agentId ?? null` in the `db.insert(notifications).values({...})` call

**`src/tools/knowledgebasetool.ts`:**
- Change signature: `export function getKnowledgeBaseTools(agentId?: string | null)`
- In the `search_knowledge_base` tool server handler, the search_knowledge_base service call searches Elasticsearch (not filtered by agentId at ES level — that's acceptable for now; agent scoping is enforced at DB/upload level). No change needed to ES search logic.
- Add a new LLM-callable tool `list_knowledge_base_files` that calls `GET /api/knowledge-base?agentId={agentId}` — this gives the LLM visibility into what files exist for its agent. Use `fetch` or direct DB query (prefer direct DB via drizzle import for server tool):
```ts
toolDefinition({ name: 'list_knowledge_base_files', description: 'List files in the knowledge base available to this agent. Returns filenames, categories, and summaries.' })
  .server(async () => {
    const { db } = await import('@/db');
    const { knowledgebaseFiles } = await import('@/db/schema');
    const { desc, eq, isNull, or } = await import('drizzle-orm');
    const rows = await db.select({
      id: knowledgebaseFiles.id,
      originalName: knowledgebaseFiles.originalName,
      categories: knowledgebaseFiles.categories,
      summary: knowledgebaseFiles.summary,
      createdAt: knowledgebaseFiles.createdAt,
    }).from(knowledgebaseFiles)
      .where(agentId ? or(eq(knowledgebaseFiles.agentId, agentId), isNull(knowledgebaseFiles.agentId)) : isNull(knowledgebaseFiles.agentId))
      .orderBy(desc(knowledgebaseFiles.createdAt))
      .limit(50);
    return rows;
  })
```
Note: `list_knowledge_base_files` returns files for this agent OR global (null agentId) files — both are relevant context.

**`src/tools/notificationtool.ts`:**
- Change signature: `export function getNotificationTools(userId: string | null, agentId?: string | null)`
- In `create_notification` server handler, add `agentId: agentId ?? null` to the insert values
- In `list_notifications` server handler, when `agentId` is provided add `eq(notifications.agentId, agentId)` to conditions

**`src/tools/index.ts`:**
- Export `getNotificationTools` from `./notificationtool`

**`src/services/chat.ts` `buildChatOptions`:**
- Add `agentId?: string | null` as a new parameter (after `agentConfig`)
- Pass `agentId` to `getKnowledgeBaseTools(agentId)` (currently called with no args)
- Add `getNotificationTools` to the import list
- Import and call `getNotificationTools(userId ?? null, agentId)` — add to tools array when `enabled('notifications')` (or always-on, since it was never gated)
- Update the call in `src/routes/api/chat.tsx` to pass `agentId` as the last argument to `buildChatOptions`
- Update the call in `src/routes/api/chat-sync.tsx` similarly — read `agentId` from the request body if present and pass it through

Also update `src/routes/api/chat.tsx`: the `agentId` is already destructured from request body (used for `getAgentById`) — pass the same `agentId` string as the last arg to `buildChatOptions(messages, conversationId, userId, jiraSettings, githubSettings, agentConfig, agentId)`.

Check `src/routes/api/chat-sync.tsx` for similar agentId handling and apply the same pattern.
  </action>
  <verify>
    <automated>cd /Users/RandomPotato/Workspace/tanstack-ai-assistant && pnpm build 2>&1 | tail -20</automated>
  </verify>
  <done>Build passes with no TypeScript errors. Knowledge base GET includes agentId filter. POST stores agentId. Notification tool is registered in buildChatOptions. agentId flows from chat routes through buildChatOptions to both tool factories.</done>
</task>

</tasks>

<verification>
1. `pnpm build` passes with no errors
2. `pnpm db:migrate` applied migration 0015 successfully
3. Uploading a file via the knowledge base UI (or POST /api/knowledge-base with agentId in FormData) stores the agentId in the DB row
4. GET /api/knowledge-base?agentId=X only returns files with that agentId
5. LLM create_notification tool call inserts a notification row with the active agentId
</verification>

<success_criteria>
- Migration 0015 applied: `agent_id` column exists on both `knowledgebase_files` and `notifications`
- `getKnowledgeBaseTools(agentId)` and `getNotificationTools(userId, agentId)` both accept and use agentId
- `getNotificationTools` is exported from `src/tools/index.ts` and registered in `buildChatOptions`
- `buildChatOptions` accepts agentId and threads it to tool factories
- Both API route GET handlers filter by agentId when provided
- Both API route POST handlers store agentId when provided
</success_criteria>

<output>
After completion, create `.planning/quick/2-knowledge-base-data-should-be-created-fo/2-SUMMARY.md` following the summary template.
</output>
