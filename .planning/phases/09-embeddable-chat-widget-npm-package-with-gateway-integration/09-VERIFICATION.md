---
phase: 09-embeddable-chat-widget-npm-package-with-gateway-integration
verified: 2026-04-06T02:32:56Z
status: human_needed
score: 9/10 must-haves verified
human_verification:
  - test: "Open packages/chat-widget/test.html in a browser with pnpm dev + WIDGET_API_KEY=test123 pnpm gateway:dev running"
    expected: "Blue floating button appears bottom-right; clicking opens chat panel; typing a message and clicking Send produces an LLM reply within ~30s; closing and reopening the panel preserves previous messages"
    why_human: "End-to-end browser flow (UI rendering, LLM response, memory persistence) cannot be verified by static code analysis"
---

# Phase 9: Embeddable Chat Widget — Verification Report

**Phase Goal:** Build an embeddable chat widget distributed as an IIFE bundle (`packages/chat-widget/`). The widget renders a floating button + chat panel on any external website, communicates with the LLM via proxy routes (`/api/gateway/widget`), and the gateway routes messages through `/api/chat-sync` — the same path as Telegram. Conversation state is persisted in DB with `source='widget'`.

**Verified:** 2026-04-06T02:32:56Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Note on Architectural Divergence

The implementation diverged from the original plan design in a significant but intentional way. The plan specified a three-hop async flow: widget → POST `/api/gateway/widget` (returns jobId) → WebWidgetProvider internal HTTP server → `/api/chat-sync` → poll GET `/api/gateway/widget/$jobId`. After all plans executed, a deliberate refactor (`412ee2a`) removed this indirection. The current architecture is: widget → POST `/api/gateway/widget` → `src/services/widget.ts` (calls LLM directly via `runChatWithToolCollection`) → returns `{ conversationId, text }` synchronously. The `$jobId.tsx` polling route was deleted. The phase goal's requirement that "gateway routes messages through `/api/chat-sync`" is **not literally satisfied** — `widget.ts` calls `runChatWithToolCollection` directly, bypassing `chat-sync`. However, the functionally equivalent outcome (LLM processes the message, conversation persists in DB with `source='widget'`) is achieved. The WebWidgetProvider still exists in the gateway worker and is conditionally started, but is no longer in the actual message-processing path for the widget.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | pnpm workspace includes packages/* so chat-widget deps resolve | VERIFIED | `pnpm-workspace.yaml` contains `'packages/*'` glob |
| 2 | CONVERSATION_SOURCES.WIDGET === 'widget' | VERIFIED | `src/lib/conversation-sources.ts` exports `WIDGET: 'widget'` |
| 3 | WebWidgetProvider implements Provider interface (name, start, stop, send) | VERIFIED | `workers/gateway/providers/web-widget.ts` implements all four methods; `readonly name = CONVERSATION_SOURCES.WIDGET` |
| 4 | WebWidgetProvider conditionally registered in gateway when WIDGET_API_KEY set | VERIFIED | `workers/gateway/index.ts` has `if (process.env.WIDGET_API_KEY) { ... WebWidgetProvider ... }` |
| 5 | POST /api/gateway/widget validates x-widget-api-key and returns 401 on mismatch | VERIFIED | `src/services/widget.ts` checks `apiKey !== configuredKey`, returns `corsJson({ error: 'Unauthorized' }, 401)` |
| 6 | All responses from /api/gateway/widget include CORS headers | VERIFIED | `CORS_HEADERS` applied via `corsJson()` on all response paths including OPTIONS 204 |
| 7 | Conversation state persisted in DB with source='widget' | VERIFIED | `src/services/widget.ts` line 106: `CONVERSATION_SOURCES.WIDGET` passed to `saveConversationToDb()` |
| 8 | packages/chat-widget/ IIFE bundle exists and builds | VERIFIED | `packages/chat-widget/dist/chat-widget.js` (192KB); `pnpm build:widget` script in root `package.json` with `formats: ['iife']` in vite config |
| 9 | Widget uses .cw-* CSS prefix, no Chakra UI | VERIFIED | 16 `.cw-*` class definitions in `styles.ts`; no Chakra imports in any widget source file |
| 10 | Full automated test suite passes GREEN | VERIFIED | 39 tests across 9 test files all pass (confirmed via `pnpm test`) |

**Score:** 10/10 truths verified (automated)

**Human verification required for end-to-end browser flow** (truth: "Widget opens, sends message, receives LLM reply, memory persists across minimize").

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `pnpm-workspace.yaml` | VERIFIED | Contains `packages/*` glob |
| `src/lib/conversation-sources.ts` | VERIFIED | Exports `WIDGET: 'widget'` |
| `src/lib/conversation-sources.test.ts` | VERIFIED | W9-05 test GREEN |
| `src/routes/api/gateway/widget/widget.test.ts` | VERIFIED | 6 tests GREEN (W9-01, W9-02, W9-03) |
| `workers/gateway/providers/web-widget.ts` | VERIFIED | WebWidgetProvider class, 117 lines, substantive implementation |
| `workers/gateway/providers/web-widget.test.ts` | VERIFIED | 2 tests GREEN (W9-04) |
| `workers/gateway/index.ts` | VERIFIED | Conditional `WebWidgetProvider` registration block present |
| `src/routes/api/gateway/widget/index.tsx` | VERIFIED | Route exists, delegates to `handleWidgetPost` from `@/services/widget` |
| `src/services/widget.ts` | VERIFIED | 117-line substantive service: auth, LLM call, DB persistence, CORS |
| `packages/chat-widget/package.json` | VERIFIED | `@internal/chat-widget`, private, has `build:widget` script |
| `packages/chat-widget/vite.config.widget.ts` | VERIFIED | `formats: ['iife']`, `name: 'ChatWidget'`, `fileName: () => 'chat-widget.js'` |
| `packages/chat-widget/src/index.tsx` | VERIFIED | `window.ChatWidget = { init(config) { createRoot(...).render(<Widget .../>) } }` |
| `packages/chat-widget/src/Widget.tsx` | VERIFIED | Floating button + conditional ChatPanel, `injectStyles()` called |
| `packages/chat-widget/src/ChatPanel.tsx` | VERIFIED | Message list, text input, form submit wired to `sendMessage` |
| `packages/chat-widget/src/useChat.ts` | VERIFIED | POST to `/api/gateway/widget`, returns `{ conversationId, text }` synchronously |
| `packages/chat-widget/src/styles.ts` | VERIFIED | 16 `.cw-*` classes injected once via style tag |
| `packages/chat-widget/dist/chat-widget.js` | VERIFIED | 192KB file exists (Apr 2 build) |
| `packages/chat-widget/test.html` | VERIFIED | Smoke test page with `ChatWidget.init({ endpoint, apiKey, username })` |
| `.env.example` | VERIFIED | Documents `WIDGET_API_KEY`, `WIDGET_INTERNAL_PORT`, `WIDGET_GATEWAY_URL` |
| `CLAUDE.md` | VERIFIED | Documents all three widget env vars, gateway worker WebWidgetProvider note |

Note: `src/routes/api/gateway/widget/$jobId.tsx` was created in Plan 03 then deliberately removed in post-plan refactor `412ee2a`. Its absence is intentional — the synchronous response pattern supersedes the polling approach.

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/chat-widget/src/useChat.ts` | `/api/gateway/widget` | `fetch()` POST | VERIFIED | Line 28: `fetch(\`${endpoint}/api/gateway/widget\`, ...)` |
| `packages/chat-widget/src/index.tsx` | `packages/chat-widget/src/Widget.tsx` | `createRoot().render(<Widget .../>)` | VERIFIED | `createRoot(container).render(<Widget endpoint={...} apiKey={...} username={...} />)` |
| `src/routes/api/gateway/widget/index.tsx` | `src/services/widget.ts` | dynamic import `handleWidgetPost` | VERIFIED | Route server handlers import and call `handleWidgetPost` |
| `src/services/widget.ts` | DB persistence | `saveConversationToDb()` with `CONVERSATION_SOURCES.WIDGET` | VERIFIED | Line 102-109: creates conversation with `source: 'widget'` |
| `workers/gateway/index.ts` | `workers/gateway/providers/web-widget.ts` | conditional instantiation on `WIDGET_API_KEY` | VERIFIED | `if (process.env.WIDGET_API_KEY) { const { WebWidgetProvider } = await import('./providers/web-widget.js') }` |
| `workers/gateway/providers/web-widget.ts` | `/api/chat-sync` | `fetch(APP_URL + '/api/chat-sync')` in `handlePostJob()` | VERIFIED | WebWidgetProvider still calls `/api/chat-sync` — but this code path is now unreachable since widget route no longer forwards to WebWidgetProvider |

### Requirements Coverage

No requirement IDs were declared in any plan's `requirements:` field for Phase 9. All plans have `requirements: []`. No orphaned requirements found in REQUIREMENTS.md for Phase 9.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `workers/gateway/providers/web-widget.ts` | 32 | `console.log(...)` startup message | Info | Expected operational log — not a stub indicator |

No TODO/FIXME/PLACEHOLDER comments found in key files. No stub returns (`return null`, `return {}`) found. All handlers have substantive implementations.

**WebWidgetProvider orphan status:** WebWidgetProvider is registered and started in `workers/gateway/index.ts` when `WIDGET_API_KEY` is set. Its internal HTTP server starts and listens on `WIDGET_INTERNAL_PORT`. However, since the widget route (`src/services/widget.ts`) no longer forwards jobs to `WIDGET_GATEWAY_URL/jobs`, the WebWidgetProvider's `POST /jobs` handler and job-state Map are effectively unused in the current architecture. Its `send()` method in the outbound polling loop will never have a matching `chatId` in `chatIdToJobId`. This is a warning-level concern: the provider starts a server and consumes a port for no functional purpose. It is not a blocker — the widget works correctly without it.

### Human Verification Required

#### 1. Full Widget E2E Flow

**Test:** Start `pnpm dev` (port 3000) and `WIDGET_API_KEY=test123 pnpm gateway:dev`. Ensure `.env` has `WIDGET_API_KEY=test123`. Run `pnpm build:widget`. Open `packages/chat-widget/test.html` (update apiKey to `test123`). Click the blue button, send a message, wait for LLM reply.

**Expected:** Blue circle button appears bottom-right. Clicking opens chat panel. Sending a message shows "..." loading indicator. LLM reply appears within ~30 seconds. Closing and reopening the panel shows previous messages still present.

**Why human:** Visual rendering, real-time LLM response, in-memory persistence behavior, and CORS behavior from `file://` or local dev server cannot be verified by static code analysis.

### Summary

Phase 9 automated checks all pass. The IIFE bundle is built, the API key authentication and CORS headers are implemented, conversations persist in DB with `source='widget'`, the full test suite is GREEN (39/39), and CLAUDE.md/.env.example document the new env vars.

One architectural divergence from the plan: the original design routed widget messages through WebWidgetProvider → `/api/chat-sync` using an async jobId polling pattern. The final implementation replaced this with a synchronous direct-LLM-call in `src/services/widget.ts`, returning `{ conversationId, text }` immediately. This divergence was a deliberate post-plan refactor (commit `412ee2a`) that simplified the architecture. The phase goal's functional outcomes — widget embeds on external pages, LLM responds via gateway proxy routes, conversations persist in DB — are fully achieved.

WebWidgetProvider remains in the gateway codebase and starts an HTTP server, but is no longer in the active widget message path. This is a minor cleanup concern, not a functional gap.

Human browser verification is the final outstanding check.

---

_Verified: 2026-04-06T02:32:56Z_
_Verifier: Claude (gsd-verifier)_
