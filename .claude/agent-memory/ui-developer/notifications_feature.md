---
name: Notifications feature architecture
description: How the Notifications UI feature is structured — routes, components, shared utilities, and integration points
type: project
---

The Notifications feature is fully implemented as UI-only; the backend API routes were added by a parallel architect agent.

**Routes:**
- `src/routes/_protected/notifications.tsx` — layout route, uses `useSectionDisabled('notifications')`, returns `<Outlet />`
- `src/routes/_protected/notifications/index.tsx` — list page with unread badge, Mark All Read button, source-colored badges, click to detail
- `src/routes/_protected/notifications/$id.tsx` — detail page with TanStack server fn loader, MarkdownContent renderer, PATCH toggle, delete confirmation, Convert to Conversation nav

**Shared utilities:**
- `src/components/MarkdownRenderer.tsx` — exports `markdownComponents` object and `MarkdownContent` default export; `Chat.tsx` imports `markdownComponents` from here instead of defining inline
- `src/lib/browser-notifications.ts` — `isNotificationSupported`, `requestNotificationPermission`, `showBrowserNotification`

**Integration points:**
- `IconRail.tsx` — polls `/api/notifications/unread-count` every 30s, shows red Badge overlay, fires `showBrowserNotification` when count increases
- `src/routes/_protected/index.tsx` — `NotificationsPanel` component shows top 5 unread, clickable to `/notifications/$id`
- `src/routes/_protected/settings.tsx` — `BrowserNotificationsCard` with Chakra `Switch.Root` pattern, stores enabled state in localStorage
- `src/routes/_protected/conversations/new.tsx` — accepts `from_notification_id` search param, fetches notification content and seeds `Chat` via `suggestedPrompt` prop

**Why:**
- `Chat` component now accepts `suggestedPrompt?: string` prop which seeds the internal `suggestedPrompt` state on mount

**How to apply:**
- When adding new notification-related UI, import `MarkdownContent` from `@/components/MarkdownRenderer`
- When navigating "Convert to Conversation", use search param `from_notification_id`
- Section key is `'notifications'` — already in the `Section` type in `src/lib/sections.ts`
