---
phase: quick-1
plan: "01"
subsystem: chat-ui
tags: [delete, messages, chat, api, optimistic-ui]
dependency_graph:
  requires: []
  provides:
    - DELETE /api/conversations/:id/messages/:messageId
    - Per-message delete button with optimistic removal
  affects:
    - src/components/Chat.tsx
    - src/routes/api/conversations/$id/messages/$messageId.tsx
tech_stack:
  added: []
  patterns:
    - TanStack Router file-based API route with server handler
    - Drizzle ORM delete with compound where clause
    - Optimistic UI removal via useChat setMessages
    - Chakra UI _groupHover for hover-revealed controls
key_files:
  created:
    - src/routes/api/conversations/$id/messages/$messageId.tsx
  modified:
    - src/components/Chat.tsx
decisions:
  - "Used setMessages from useChat for optimistic removal — hook exposes it as setMessagesManually internally, no local deletedIds state needed"
  - "Delete button positioned on Flex wrapper (already present) with position=relative + role=group — no extra wrapping Box required"
  - "Ownership guard follows Phase 04 pattern: block only when both userId values are non-null and mismatched"
metrics:
  duration: "13 min"
  completed_date: "2026-04-06"
  tasks_completed: 2
  files_changed: 2
---

# Quick Task 1: Per-message delete in conversations chat view

One-liner: DELETE endpoint for individual messages + hover-revealed trash icon with optimistic useChat removal.

## What Was Built

Added the ability for users to delete individual messages from a conversation to keep LLM context clean.

### Task 1: DELETE API endpoint

Created `src/routes/api/conversations/$id/messages/$messageId.tsx` as a TanStack Router API route. The handler:

- Loads the parent conversation to perform an ownership check (same Phase 04 guard pattern: block only when both session userId and record userId are non-null and differ — allows legacy unowned records)
- Deletes the message filtered by both `messages.id` and `messages.conversationId` for safety
- Returns `200 { ok: true }` on success, `403 { error: 'Forbidden' }` on unauthorized access

### Task 2: Delete button in Chat.tsx

Modified `src/components/Chat.tsx`:

- Added `Trash2` (lucide-react) and `IconButton` (Chakra UI) imports
- Added `deletingIds: Set<string>` state to prevent duplicate in-flight requests
- Destructured `setMessages` from `useChat` for optimistic removal
- Added `handleDeleteMessage` async function: sets loading state, calls DELETE, then filters message out of useChat state, clears loading state in finally block
- Added `position="relative"` and `role="group"` to each message `Flex` wrapper
- Rendered an absolutely-positioned `IconButton` (xs, ghost, red) that is `opacity: 0` normally and `opacity: 1` on `_groupHover` — only shown for saved conversations (`!isNew`)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- File exists: src/routes/api/conversations/$id/messages/$messageId.tsx
- File exists: src/components/Chat.tsx (modified)
- Task 1 commit: b1ba39f
- Task 2 commit: 34dd6ab
- Build: clean (✓ built in ~36s, no TypeScript errors)
