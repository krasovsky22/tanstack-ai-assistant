# Phase 9: Embeddable Chat Widget - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Build an embeddable chat widget distributed as a local npm package (`packages/chat-widget/`). The widget renders a floating chat button + panel on any external website, sends messages through the existing gateway worker via a new proxy route (`/api/gateway/widget`), and the gateway routes those messages through `/api/chat-sync` — the same path as Telegram. Conversation state is persisted in the DB with source='widget'.

</domain>

<decisions>
## Implementation Decisions

### Widget Embedding Format
- Distributed as a UMD/IIFE bundle — embedded via a single `<script>` tag, no build step required on the host site
- Init API: `ChatWidget.init({ endpoint: 'https://...', apiKey: '...' })` — minimal config, no theming options at init time
- Package lives in `packages/chat-widget/` within this repo (monorepo `packages/` subdir pattern)
- Output: local `dist/` file only — no npm publish, no CDN; developers copy or reference the built file

### Widget Appearance
- Floating button in the bottom-right corner of the host page (like Intercom/Crisp)
- Clicking opens a slide-up chat panel
- Chat panel UI: message list + text input only — no sidebar, no conversation history nav, no tool call display
- Widget internals: React + minimal CSS (plain styles, **not** Chakra UI — avoids bundle size and host-site style conflicts)
- Conversation history persists in JS memory: survives minimize/reopen, resets on page refresh

### Backend Endpoint
- New proxy route `/api/gateway/widget` in the TanStack app — widget always talks to the main app URL, no separate port to expose
- This route forwards requests to the gateway worker's `WebWidgetProvider`
- API key required: widget passes `apiKey` from `ChatWidget.init()` as a request header; server validates against `WIDGET_API_KEY` env var
- `WIDGET_API_KEY` is a single shared secret configured via env var (no per-site key DB table)

### Gateway Integration
- New `WebWidgetProvider` class in `workers/gateway/providers/` alongside `TelegramProvider`
- The provider receives requests forwarded from `/api/gateway/widget` and processes them through the same `handleMessage()` flow as Telegram
- **Async with polling**: `/api/gateway/widget` returns a job ID immediately; widget polls `/api/gateway/widget/{jobId}` until the LLM result is ready
- Conversation persistence: same chatId-based pattern as Telegram — widget generates a UUID chatId (stored in memory), gateway uses `getOpenConversationByChatId()`, conversations saved to DB with `source='widget'`

### Claude's Discretion
- Exact polling interval and timeout in the widget (suggested: 1s poll, 60s timeout)
- Where job state is held during async processing (in-memory map in the gateway, Redis not needed)
- Widget CSS styling details (colors, shadows, font sizes — should be neutral/generic)
- How the gateway worker's WebWidgetProvider receives forwarded requests from the TanStack app (HTTP callback, shared queue, or direct function call)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `workers/gateway/handler.ts`: `handleMessage()` — shared message processing function used by all gateway providers; WebWidgetProvider calls this directly
- `workers/gateway/providers/telegram.js`: Existing provider pattern to model `WebWidgetProvider` after — implements `start(callback)` and `send(chatId, text)`
- `/api/chat-sync` (`src/routes/api/chat-sync.tsx`): Full LLM + conversation persistence flow, already handles chatId-based lookup — WebWidgetProvider routes to this
- `src/services/chat.ts`: `getOpenConversationByChatId()`, `saveConversationToDb()` — used by chat-sync for Telegram conversations; widget conversations use the same path

### Established Patterns
- Gateway providers implement a `Provider` interface with `start()` and `send()` — `WebWidgetProvider` must implement the same interface
- `CONVERSATION_SOURCES` or `source` field on conversations distinguishes Telegram vs UI vs cron; add `'widget'` as a new source
- Environment variables documented in `.env.example` and `CLAUDE.md` — add `WIDGET_API_KEY`

### Integration Points
- `workers/gateway/index.ts`: Register `WebWidgetProvider` in the `providers` array alongside `TelegramProvider`
- `src/routes/api/`: Add new `gateway-widget.tsx` route for `/api/gateway/widget` (POST to submit, GET `/{jobId}` to poll)
- `tsconfig.gateway.json`: `packages/chat-widget/` uses its own tsconfig; gateway worker uses the existing `tsconfig.gateway.json`
- `pnpm` workspace: Add `packages/chat-widget` as a workspace package; add `build:widget` script to root `package.json`

</code_context>

<specifics>
## Specific Ideas

- Widget modeled on Intercom/Crisp floating button pattern — bottom-right, opens upward
- The gateway worker already has a `processOutboundMessages()` poll loop — the async job state fits the same pattern (store pending jobs in memory, resolve when chat-sync responds)
- `ChatWidget.init()` exposes the widget as a global on `window.ChatWidget`

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-embeddable-chat-widget-npm-package-with-gateway-integration*
*Context gathered: 2026-03-30*
