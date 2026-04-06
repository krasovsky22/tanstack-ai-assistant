---
phase: quick-1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/routes/api/conversations/$id/messages/$messageId.tsx
  - src/components/Chat.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "User can delete any individual message from a conversation"
    - "After deletion, the message disappears from the chat UI without a page reload"
    - "Deleting a message from the DB does not affect other messages in the conversation"
  artifacts:
    - path: "src/routes/api/conversations/$id/messages/$messageId.tsx"
      provides: "DELETE /api/conversations/:id/messages/:messageId handler"
      exports: ["Route"]
    - path: "src/components/Chat.tsx"
      provides: "Per-message delete button + optimistic removal from useChat messages"
  key_links:
    - from: "src/components/Chat.tsx"
      to: "/api/conversations/$id/messages/$messageId"
      via: "fetch DELETE in handleDeleteMessage"
      pattern: "fetch.*api/conversations.*messages"
---

<objective>
Add per-message delete capability to the conversations chat view.

Purpose: Allow users to prune bad or stale messages from a conversation to keep the LLM context clean after errors or unwanted tool calls.
Output: A DELETE API endpoint for individual messages + a delete button rendered on each chat bubble (visible on hover) that removes the message optimistically from the UI and permanently from the DB.
</objective>

<execution_context>
@/Users/RandomPotato/.claude/get-shit-done/workflows/execute-plan.md
@/Users/RandomPotato/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

@src/routes/api/conversations/$id.tsx
@src/components/Chat.tsx
@src/db/schema.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add DELETE /api/conversations/:id/messages/:messageId endpoint</name>
  <files>src/routes/api/conversations/$id/messages/$messageId.tsx</files>
  <action>
Create a new TanStack Router API route file at `src/routes/api/conversations/$id/messages/$messageId.tsx`.

The route path is `/api/conversations/$id/messages/$messageId`.

Implement a single `DELETE` server handler:
1. Import `db` from `@/db`, `messages` table from `@/db/schema`, `eq` and `and` from `drizzle-orm`.
2. Import `useAppSession` from `@/services/session` and `conversations` table for ownership check.
3. Ownership check: load the parent conversation by `params.id`. If `existing.userId` and session `userId` are both non-null AND they differ, return 403 JSON `{ error: 'Forbidden' }`.
4. Delete the message row: `db.delete(messages).where(and(eq(messages.id, params.messageId), eq(messages.conversationId, params.id)))`.
5. Return 200 JSON `{ ok: true }`.

Use the same ownership guard pattern as the PATCH/DELETE handlers in `src/routes/api/conversations/$id.tsx` — only block when both userId values are non-null and mismatched (allows legacy unowned records per Phase 04 decision).

File structure:
```ts
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/conversations/$id/messages/$messageId')({
  server: {
    handlers: {
      DELETE: async ({ params }) => { ... }
    }
  }
});
```
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -20</automated>
  </verify>
  <done>File exists, TypeScript compiles clean, route registered in routeTree.gen.ts after build/dev start.</done>
</task>

<task type="auto">
  <name>Task 2: Add delete button to each chat bubble in Chat.tsx</name>
  <files>src/components/Chat.tsx</files>
  <action>
Modify `src/components/Chat.tsx` to add a per-message delete button.

**State:** Add `const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())` near other useState declarations.

**Handler:** Add `handleDeleteMessage` function inside the `Chat` component:
```ts
const handleDeleteMessage = async (messageId: string) => {
  if (deletingIds.has(messageId)) return;
  setDeletingIds((prev) => new Set(prev).add(messageId));
  try {
    await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
    });
    // Optimistic: remove from local messages list
    // useChat from @tanstack/ai-react exposes `setMessages` — use it if available,
    // otherwise fall back to local state wrapper.
    // Check: does the `useChat` hook return `setMessages`? If yes, call
    // setMessages((prev) => prev.filter((m) => m.id !== messageId)).
    // If `setMessages` is not exposed by the hook, maintain a local
    // `deletedIds: Set<string>` state and filter messages before rendering:
    // const visibleMessages = messages.filter((m) => !deletedIds.has(m.id));
    // Use the approach that compiles. Prefer setMessages if available.
  } finally {
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
  }
};
```

**UI:** In the message rendering loop (the `messages.map((message) => ...)` block), wrap the existing `<Box bg={isUser ? ...}>` bubble in a relative-positioned `<Box>` with `position="relative"` and a `role="group"` prop. Then render a delete `<IconButton>` or small `<Button>` absolutely positioned at the top-right corner of the bubble wrapper (outside the bubble box):

```tsx
<Box key={message.id} position="relative" role="group" mb="4" display="flex" justifyContent={isUser ? 'flex-end' : 'flex-start'}>
  {/* existing bubble Flex/Box — remove mb="4" from it since wrapper has it */}
  <Box ...existing bubble props minus key and mb...>
    {/* existing content */}
  </Box>
  {/* Delete button — only show on existing conversations (not isNew), hidden until group hover */}
  {!isNew && (
    <IconButton
      aria-label="Delete message"
      size="xs"
      variant="ghost"
      colorPalette="red"
      position="absolute"
      top="-2"
      right={isUser ? 'unset' : '-2'}
      left={isUser ? '-2' : 'unset'}
      opacity={0}
      _groupHover={{ opacity: 1 }}
      transition="opacity 0.15s"
      onClick={() => handleDeleteMessage(message.id)}
      loading={deletingIds.has(message.id)}
      zIndex={1}
    >
      <Trash2 size={12} />
    </IconButton>
  )}
</Box>
```

Import `Trash2` from `lucide-react` and `IconButton` from `@chakra-ui/react` at the top of the file.

If Chakra v3 `IconButton` requires children instead of icon prop, pass `<Trash2 size={12} />` as children (already shown above).

For the optimistic removal: check at runtime whether `useChat` returns `setMessages`. If it does not exist in the destructured return, use a local `const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())` and filter: `const visibleMessages = messages.filter((m) => !deletedIds.has(m.id))` — replace `messages.map(...)` with `visibleMessages.map(...)` in the render.
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -30</automated>
  </verify>
  <done>TypeScript compiles clean. In the running app, hovering over any chat bubble in an existing conversation reveals a small red trash icon. Clicking it removes the message from the UI and deletes it from the DB (verify via network tab: DELETE /api/conversations/.../messages/... returns 200).</done>
</task>

</tasks>

<verification>
1. `pnpm build` exits 0 — no TypeScript errors.
2. Dev server starts: `pnpm dev`.
3. Open an existing conversation — chat bubbles show a trash icon on hover.
4. Click trash on any message — message disappears from UI.
5. Hard refresh — deleted message is gone (confirms DB deletion, not just UI).
</verification>

<success_criteria>
- DELETE endpoint exists at `/api/conversations/:id/messages/:messageId` returning 200 `{ ok: true }`.
- Chat UI shows a hover-revealed delete button on each message bubble for saved conversations.
- Deleted message is removed both from DB and from the UI without a page reload.
- No TypeScript or build errors.
</success_criteria>

<output>
After completion, create `.planning/quick/1-update-conversations-page-to-allow-delet/1-SUMMARY.md`
</output>
