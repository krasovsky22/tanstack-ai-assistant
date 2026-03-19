---
name: Notifications Feature Architecture
description: Backend implementation details for the Notifications feature added in March 2026
type: project
---

The Notifications feature was fully implemented on the backend in March 2026.

**DB table:** `notifications` in `src/db/schema.ts` — fields: id (UUID PK), title, content, source (text, used to tag 'llm'-created entries), sourceConversationId (FK → conversations, set null on delete), isRead (boolean, default false), userId (FK → users, cascade delete), createdAt. Applied via `pnpm db:push`.

**API routes (5 files under `src/routes/api/notifications/`):**
- `index.tsx` — GET (list, optional `?unread=true` filter) + POST (create, injects userId from session)
- `$id.tsx` — GET (single, ownership check) + PATCH (isRead only) + DELETE (ownership check)
- `unread-count.tsx` — GET returns `{ count: number }` using Drizzle `count()` aggregate
- `mark-all-read.tsx` — POST bulk sets isRead=true filtered to userId

**LLM tool:** `src/tools/notificationtool.ts` — `getNotificationTools(userId: string | null)` with two tools: `create_notification` (inserts with source='llm') and `list_notifications` (last 20, optional unreadOnly filter).

**Tool disable key:** `notifications` — controlled via `DISABLE_TOOLS` env var, same pattern as other tools in `buildChatOptions()`.

**Section disable key:** `notifications` — added to `Section` type union in `src/lib/sections.ts` and to `VALID_SECTIONS` array in `src/routes/api/sections.tsx`. Documented in `.env.example` under `DISABLE_SECTIONS`.

**Why:** Feature request to expose a first-class notification surface that both the UI and the LLM agent can write to.

**How to apply:** When adding new first-class features, follow this same layered pattern: schema → migration → section type → sections API → API routes (5-file pattern) → tool → tool barrel → service registration → env.example documentation.
