# Playwright QA Script Registry

## Cronjob Logs Page
- **ID**: cronjob-logs-page
- **Coverage**: Cronjob logs page at `/cronjobs/:id/logs` — header, table, more/less toggle, back link, badge styling
- **Steps**:
  1. Navigate to `http://10.10.100.139:3000/cronjobs` (use host IP, not localhost — browser runs in Docker)
  2. Snapshot the page and confirm 3 cronjobs are listed in a table with columns: Name, Schedule, Status, Last Run, Actions
  3. Navigate to `http://10.10.100.139:3000/cronjobs/2447b10e-36de-4de5-981d-52dcb30cb1d4/logs`
  4. Snapshot the page and confirm:
     - No console errors on fresh load
     - Page header contains link `← Automation` with href `/cronjobs`
     - H2 heading text is `Logs — Jira DB ticket triage (simple changes auto-done)`
     - A table is present with columns: Ran At, Status, Duration, Result / Error
     - Multiple log rows are shown (each with a "success" badge and truncated result ending in "more")
  5. Take a full-page screenshot to confirm visual polish
  6. Click the "more" button on the first log row
  7. Confirm the row expands to show full content and button label changes to "less"
  8. Click "less" to collapse
  9. Confirm row returns to truncated state with "more" label
  10. Click `← Automation` link
  11. Confirm URL changes to `/cronjobs` and the Automation list renders
- **Last Run**: 2026-03-16
- **Status**: passing
- **Notes**:
  - Host IP `10.10.100.139` required for Docker-based Playwright MCP to reach the dev server; start server with `HOST=0.0.0.0 pnpm dev`
  - All visible logs have `status = 'success'` (green badge). Red error badge is implemented in source (`colorPalette={log.status === 'success' ? 'green' : 'red'}`) but not exercisable with current DB data
  - A hydration warning ("Hydration failed because the server rendered...") appears in the console when navigating client-side to the logs page; this is a React SSR mismatch, likely from the date `toLocaleString()` call producing different output on server vs client. Not a blocking failure but worth developer investigation
  - Console also logs a non-critical WebSocket error for TanStack DevTools (`ws://localhost:42069`) — expected when browser runs in Docker and cannot reach the devtools server on the host

## Conversations Dashboard
- **ID**: conversations-dashboard
- **Coverage**: `/conversations` — list page, conversation cards, hover states, delete button visibility/color, sidebar open/collapsed, group section collapse/expand
- **Steps**:
  1. Navigate to `http://<host-ip>:3000/conversations` (server must run with `HOST=0.0.0.0 pnpm dev`; host IP currently `192.168.68.107`)
  2. Wait 2s for `useLiveQuery` hydration
  3. Take full-page screenshot — confirm IconRail (60px left), ChatSidebar (280px, "All Chats" heading, "New Chat" button), main content "Conversations" heading, "New Chat" button top-right
  4. Snapshot page — verify conversation cards render with title, timestamp, and (where applicable) source badge
  5. Evaluate `window.getComputedStyle` on first `[aria-label="Delete conversation"]` — assert `opacity: 0`, `position: absolute`
  6. Force `opacity: 1` on first delete button via `browser_evaluate`, take screenshot — confirm gray Trash2 icon appears at top-right of card
  7. Hover over delete button — take screenshot — confirm red icon and red.50 background (assert via evaluate: `color: rgb(220,38,38)`, `background: rgb(254,242,242)`)
  8. Click "Toggle sidebar" button — take screenshot — confirm sidebar collapses to 48px with only a single PanelLeft icon remaining
  9. Click "Open sidebar" button — confirm sidebar re-expands to 280px with "All Chats" heading visible
  10. Click the "Today" group header chevron — confirm items collapse (group children removed from snapshot)
  11. Click again — confirm items expand
  12. Check console: assert no errors beyond the known WebSocket DevTools noise
  13. Check network: assert `/api/conversations` returns 200
- **Last Run**: 2026-03-17
- **Status**: passing
- **Notes**:
  - Delete button uses CSS `_groupHover` (opacity transition); Playwright synthetic hover does not trigger it — use `browser_evaluate` to force visibility for screenshot capture
  - 11 conversations present in DB at time of test run, grouped into "Today" (4) and "Last 30 days" (7)
  - No source badges visible in current data (all `c.source` values are null)
  - Console: 1 error (WebSocket DevTools, non-blocking), 2 warnings (Vite crypto externalization, non-blocking)
  - All API calls returned 200

## Conversations New Chat
- **ID**: conversations-new-chat
- **Coverage**: `/conversations/new` — empty state, suggestion chips, ChatInput states, ToolsModal open/expand/close
- **Steps**:
  1. Navigate to `http://<host-ip>:3000/conversations/new`
  2. Take full-page screenshot — confirm breadcrumb "Dashboard / New Chat", 4 suggestion chips, ChatInput box, no agent-status banner
  3. Snapshot — assert: `textbox "Type a message..."` present, `button "Send message" [disabled]` present, `button "Attach File"` present, `button "Tools"` present
  4. Evaluate send button: assert `disabled=true`, `backgroundColor: rgb(228,228,231)` (gray.200)
  5. Click "What can you do?" suggestion chip
  6. Confirm textarea value becomes "What can you do?" in snapshot
  7. Take screenshot — confirm text appears in ChatInput, suggestion chip shows `[active]`
  8. Evaluate send button: assert `disabled=false`, `backgroundColor: rgb(61,122,40)` (brand.600 green)
  9. Click "Tools" button
  10. Confirm `dialog "Available Tools"` appears in snapshot with subtitle "53 tools across 11 groups"
  11. Take screenshot — confirm modal header, group list (JIRA 22, CRONJOBS 4, JOBS 9, ...)
  12. Click "Cronjobs" group trigger — confirm 4 tool cards expand (list_cronjobs, create_cronjob, update_cronjob, delete_cronjob) with descriptions
  13. Take screenshot of expanded group
  14. Click "Close" button — confirm dialog is removed from snapshot
  15. Check console: assert no new errors introduced by ToolsModal interaction
  16. Check network: assert `/api/tools` returns 200
- **Last Run**: 2026-03-17
- **Status**: passing
- **Notes**:
  - ToolsModal fetches `/api/tools` on open; 53 tools loaded across 11 groups at time of test
  - Suggestion chips fill textarea but do NOT auto-submit — by design (see UX improvement suggestion U-2 in QA report)
  - Send button disabled state: `backgroundColor: rgb(228,228,231)`, enabled state: `rgb(61,122,40)`
  - All console messages are the same known-non-blocking noise as the dashboard page

## Chat Sidebar Toggle
- **ID**: chat-sidebar-toggle
- **Coverage**: ChatSidebar open/collapse/expand, group section collapse/expand — tested from `/conversations`
- **Steps**:
  1. Navigate to `http://<host-ip>:3000/conversations`
  2. Confirm sidebar is open (280px): "All Chats" heading visible, "New Chat" button visible, conversation groups visible
  3. Click `button "Toggle sidebar"` — confirm snapshot shows `button "Open sidebar"` only (collapsed 48px state)
  4. Take screenshot — confirm main content area expands leftward, sidebar is minimal icon strip
  5. Click `button "Open sidebar"` — confirm sidebar re-expands, "All Chats" heading returns
  6. Click a group header (e.g. "Today") — confirm items in that group disappear from snapshot (collapsed)
  7. Click same header again — confirm items return (expanded)
- **Last Run**: 2026-03-17
- **Status**: passing
- **Notes**:
  - The `transition: margin-left 0.2s` on the main content area fires on collapse/expand but the sidebar panel itself has no `transition: width` — there is a visual mismatch (main slides, sidebar snaps). See visual polish improvement V-3 in QA report.

## User Authentication Flow
- **ID**: user-auth-flow
- **Coverage**: Phase 4 user auth — login page rendering, valid login + navigation, session persistence after refresh, invalid credentials error display
- **Steps**:
  1. Clear cookies/localStorage/sessionStorage via `browser_evaluate`, navigate to `http://<host-ip>:3000/login`
  2. Fill username=`testuser`, password=`mypassword123`, click Sign in — assert URL becomes `/`, IconRail nav (AI Chat, Job Search, Automation, Knowledge Base, Mail) visible in snapshot
  3. Reload page (`location.reload()`) — assert URL stays `/`, home page content intact, no redirect to `/login`
  4. Clear cookies/localStorage/sessionStorage, navigate to `/login`
  5. Fill username=`wronguser`, password=`wrongpass`, click Sign in — assert error text "Invalid credentials" appears in snapshot, URL stays `/login`
- **Last Run**: 2026-03-18
- **Status**: passing
- **Notes**:
  - Fix applied: server function now returns `{ success: true }` instead of throwing redirect; client calls `router.navigate({ to: '/' })` on success. All 3 targeted tests pass.
  - Session cookie is `HttpOnly` — JS `document.cookie` returns `""` after clearing, which is correct for non-HttpOnly cookies. The session cookie itself persists through the browser context across reload (by design).
  - Cookie clearing via `document.cookie` JS manipulation is sufficient for test isolation between the three sub-tests here since each test navigates to `/login` fresh.
  - "Invalid credentials" error text renders as a `paragraph` element below the password field — reliable selector target.
  - Console noise during tests: 1 WebSocket DevTools error + 2 Vite crypto warnings — all known non-blocking, safe to ignore.
  - Host IP: `192.168.68.103` (as of 2026-03-18). Always confirm with `ifconfig | grep "inet " | grep -v 127.0.0.1` before running.

## Notifications Feature
- **ID**: notifications-feature
- **Coverage**: `/notifications` list, `/notifications/$id` detail, bell icon badge, home page panel, settings toggle, LLM create_notification tool
- **Steps**:
  1. Login at `http://<host-ip>:3000/login` with testuser/mypassword123
  2. On home page `/`, verify left icon rail contains a "Notifications" bell icon link (5th position)
  3. Click the Notifications bell icon — assert URL becomes `/notifications`
  4. Verify empty state shows heading "No notifications yet" with descriptor text
  5. Navigate to `/conversations/new`
  6. Type: `create a notification with the title 'Test Notification' and content 'This is a **test** notification with *markdown* support.'`
  7. Click Send — wait for `create_notification` tool call to complete and response to say "Notification created"
  8. Verify bell icon in left rail shows a count badge (e.g. "1") immediately after creation
  9. Navigate to `/notifications` — verify notification card appears with: title "Test Notification", source badge "llm" (purple), relative timestamp ("just now"), green unread dot
  10. Verify "Mark All Read" button and unread count badge ("1") are visible in page header
  11. Click the notification card — assert URL becomes `/notifications/<uuid>`
  12. On detail page: verify title as h2 heading, content rendered as markdown (`**test**` is bold, `*markdown*` is italic), "Mark as Unread" button (meaning auto-read on view), "Convert to Conversation" button, "Delete" button (red), "← Notifications" back link
  13. Click "← Notifications" — verify the green unread dot is gone from the card (marked read)
  14. Re-open detail page, click "Mark as Unread" — verify button changes to "Mark as Read", bell badge shows count again
  15. Navigate to `/notifications` — click "Mark All Read" — verify unread count badge in heading disappears and "Mark All Read" button is hidden
  16. Navigate to `/settings` — verify "Browser Notifications" section exists with a toggle and status badge
  17. Navigate to `/` — scroll to bottom — verify "Recent Notifications" panel is visible with "View All" link
- **Last Run**: 2026-03-19
- **Status**: failing
- **Known Failures**:
  - **BUG-NOTIF-01** (FAIL): Notification list card content preview renders raw markdown (`**test**`, `*markdown*`) instead of rendered HTML. Only the detail page renders markdown correctly.
  - **BUG-NOTIF-02** (FAIL): "Convert to Conversation" navigates to `/conversations/new?from_notification_id=<uuid>` but does NOT pre-fill the chat input with the notification content. The textbox shows empty placeholder.
  - **BUG-NOTIF-03** (FAIL): "Mark All Read" on the list page does not reactively update the bell icon badge count in the left nav rail. Badge still shows old count until next navigation.
  - **NON-CRITICAL**: Hydration error appears in console on `/settings` page.
- **Passing**:
  - Bell icon in left rail with unread count badge
  - Empty state on `/notifications`
  - LLM `create_notification` tool call creates notification
  - Notification list page with card: title, timestamp, source badge, unread dot
  - Detail page: title as heading, markdown rendering, all action buttons present
  - Auto-mark-read on detail page view
  - Mark as Unread / Mark as Read toggle on detail page
  - Mark All Read button hides itself and count badge after click
  - Settings Browser Notifications section with toggle
  - Home page Recent Notifications panel

## Cronjob List Page
- **ID**: cronjob-list
- **Coverage**: `/cronjobs` — lists all cronjobs with name, schedule, status badge, last run, and action buttons
- **Steps**:
  1. Navigate to `http://10.10.100.139:3000/cronjobs`
  2. Confirm page loads (0 console errors on fresh load)
  3. Confirm heading "Automation" is present
  4. Confirm "New Job" button/link is present pointing to `/cronjobs/new`
  5. Confirm table columns: Name, Schedule, Status, Last Run, Actions
  6. Confirm each row has action buttons: Stop/Start, Test run, View logs, Edit, Delete
  7. Confirm "View logs" links point to `/cronjobs/:id/logs`
- **Last Run**: 2026-03-16
- **Status**: passing
