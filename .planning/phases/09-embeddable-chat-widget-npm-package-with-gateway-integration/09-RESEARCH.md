# Phase 9: Embeddable Chat Widget - Research

**Researched:** 2026-03-30
**Domain:** UMD/IIFE widget bundle, async job polling, TanStack Start dynamic API routes, gateway provider pattern
**Confidence:** HIGH

## Summary

This phase builds three distinct layers: (1) a self-contained React widget bundled as IIFE via a dedicated Vite config in `packages/chat-widget/`, (2) two new TanStack Start API routes (`POST /api/gateway/widget` and `GET /api/gateway/widget/$jobId`) that form the async proxy, and (3) a `WebWidgetProvider` class in `workers/gateway/providers/` that implements the existing `Provider` interface and receives HTTP forwarding from the proxy route.

The widget uses the established async job pattern: POST returns `{ jobId }` immediately, the widget polls `GET /api/gateway/widget/{jobId}` at 1-second intervals with a 60-second timeout. Job state is held in an in-memory `Map` inside the gateway process — no Redis or DB needed. The identity-checking step in `handleMessage()` that blocks unlinked Telegram users must be bypassed for widget requests, since widget users are anonymous by design (`userId` will be null).

The most important architectural decision already made is that the gateway worker receives forwarded requests via an HTTP call from the TanStack app — i.e., the proxy route calls the gateway worker's own HTTP listener, and `WebWidgetProvider` exposes a `handleWidgetRequest()` method backed by a tiny HTTP server running inside the gateway process on a separate internal port.

**Primary recommendation:** Keep widget state fully in React component local state (no library), use a separate `vite.config.widget.ts` with `build.lib` IIFE output, and implement `WebWidgetProvider` as a self-contained HTTP listener on an internal port (e.g. 3001) that only the TanStack proxy route can reach.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Widget Embedding Format**
- Distributed as a UMD/IIFE bundle — embedded via a single `<script>` tag, no build step required on the host site
- Init API: `ChatWidget.init({ endpoint: 'https://...', apiKey: '...' })` — minimal config, no theming options at init time
- Package lives in `packages/chat-widget/` within this repo (monorepo `packages/` subdir pattern)
- Output: local `dist/` file only — no npm publish, no CDN; developers copy or reference the built file

**Widget Appearance**
- Floating button in the bottom-right corner of the host page (like Intercom/Crisp)
- Clicking opens a slide-up chat panel
- Chat panel UI: message list + text input only — no sidebar, no conversation history nav, no tool call display
- Widget internals: React + minimal CSS (plain styles, **not** Chakra UI — avoids bundle size and host-site style conflicts)
- Conversation history persists in JS memory: survives minimize/reopen, resets on page refresh

**Backend Endpoint**
- New proxy route `/api/gateway/widget` in the TanStack app — widget always talks to the main app URL, no separate port to expose
- This route forwards requests to the gateway worker's `WebWidgetProvider`
- API key required: widget passes `apiKey` from `ChatWidget.init()` as a request header; server validates against `WIDGET_API_KEY` env var
- `WIDGET_API_KEY` is a single shared secret configured via env var (no per-site key DB table)

**Gateway Integration**
- New `WebWidgetProvider` class in `workers/gateway/providers/` alongside `TelegramProvider`
- The provider receives requests forwarded from `/api/gateway/widget` and processes them through the same `handleMessage()` flow as Telegram
- **Async with polling**: `/api/gateway/widget` returns a job ID immediately; widget polls `/api/gateway/widget/{jobId}` until the LLM result is ready
- Conversation persistence: same chatId-based pattern as Telegram — widget generates a UUID chatId (stored in memory), gateway uses `getOpenConversationByChatId()`, conversations saved to DB with `source='widget'`

### Claude's Discretion
- Exact polling interval and timeout in the widget (suggested: 1s poll, 60s timeout)
- Where job state is held during async processing (in-memory map in the gateway, Redis not needed)
- Widget CSS styling details (colors, shadows, font sizes — should be neutral/generic)
- How the gateway worker's WebWidgetProvider receives forwarded requests from the TanStack app (HTTP callback, shared queue, or direct function call)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 (already in repo) | Widget UI | Already a project dependency; IIFE bundle includes React |
| Vite (`build.lib`) | ^7.1.7 (already in repo) | IIFE bundle output for `packages/chat-widget/` | Vite `lib` mode with `formats: ['iife']` is the standard way to produce a single self-contained script-tag bundle |
| `@vitejs/plugin-react` | ^5.0.4 (already in repo) | JSX transform for widget Vite config | Same plugin used by the main app |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node `http` built-in | n/a | Internal HTTP server inside gateway for `WebWidgetProvider` | `WebWidgetProvider` needs to receive forwarded HTTP requests from the TanStack proxy route |
| `crypto` (built-in) | n/a | UUID generation (`crypto.randomUUID()`) for chatId in widget | Browser-native; no dependency needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vite `build.lib` IIFE | esbuild CLI directly | Vite already in project; no new tool needed |
| In-memory Map for job state | Redis | Redis not needed — single process, restart = jobs lost (acceptable for transient widget responses) |
| Node `http` for provider listener | Express | Node built-in avoids new gateway dependency; simple enough for a single POST endpoint |

**Installation:**

No new packages required. The `packages/chat-widget/` workspace package reuses `react`, `react-dom`, `@vitejs/plugin-react`, and `vite` from the root workspace via pnpm hoisting. The `pnpm-workspace.yaml` needs one line added:

```yaml
packages:
  - 'packages/*'
```

Add `build:widget` script to root `package.json`:

```json
"build:widget": "vite build --config packages/chat-widget/vite.config.widget.ts"
```

---

## Architecture Patterns

### Recommended Project Structure

```
packages/
└── chat-widget/
    ├── package.json          # name: "@internal/chat-widget", private: true
    ├── tsconfig.json         # extends ../../tsconfig.json, no path aliases
    ├── vite.config.widget.ts # build.lib IIFE config
    └── src/
        ├── index.tsx         # ChatWidget.init() — window global entry point
        ├── Widget.tsx        # Root component: FloatingButton + ChatPanel
        ├── ChatPanel.tsx     # message list + input form
        ├── useChat.ts        # local state + polling logic
        └── styles.ts         # plain CSS string injected into <style> tag

workers/gateway/
├── index.ts                  # register WebWidgetProvider alongside TelegramProvider
├── providers/
│   ├── telegram.ts           # existing
│   └── web-widget.ts         # new WebWidgetProvider

src/routes/api/
├── gateway/
│   └── widget/
│       ├── index.tsx         # POST /api/gateway/widget  (submit message, returns jobId)
│       └── $jobId.tsx        # GET  /api/gateway/widget/$jobId  (poll for result)
```

### Pattern 1: Vite `build.lib` IIFE for Widget Bundle

**What:** Builds `packages/chat-widget/src/index.tsx` as a single IIFE file with React inlined.
**When to use:** Any browser-embeddable widget that must work via `<script src="...">` without a host build step.

```typescript
// packages/chat-widget/vite.config.widget.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'ChatWidget',
      formats: ['iife'],
      fileName: () => 'chat-widget.js',
    },
    rollupOptions: {
      // Do NOT externalize react — bundle it in for standalone script tag use
    },
  },
});
```

Output: `packages/chat-widget/dist/chat-widget.js` (~120-200 KB with React 19 minified).

Host page usage:
```html
<script src="/path/to/chat-widget.js"></script>
<script>ChatWidget.init({ endpoint: 'https://myapp.com', apiKey: 'secret' });</script>
```

### Pattern 2: Widget Entry Point — `window.ChatWidget` Global

**What:** `src/index.tsx` exposes `init()` on `window.ChatWidget`, mounts React into an injected container div.
**When to use:** Standard IIFE widget init pattern — identical to Intercom/Crisp/HubSpot chat.

```typescript
// packages/chat-widget/src/index.tsx
import { createRoot } from 'react-dom/client';
import { Widget } from './Widget';

interface ChatWidgetConfig {
  endpoint: string;
  apiKey: string;
}

declare global {
  interface Window {
    ChatWidget: { init: (config: ChatWidgetConfig) => void };
  }
}

window.ChatWidget = {
  init(config: ChatWidgetConfig) {
    const container = document.createElement('div');
    container.id = 'chat-widget-root';
    document.body.appendChild(container);
    createRoot(container).render(<Widget {...config} />);
  },
};
```

### Pattern 3: Async Job Polling in Widget (`useChat` hook)

**What:** Widget sends message via POST, gets `jobId`, then polls GET until result or timeout.
**When to use:** Any async LLM backend that can't hold HTTP connections open.

```typescript
// packages/chat-widget/src/useChat.ts
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 60_000;

async function sendMessage(endpoint: string, apiKey: string, chatId: string, text: string) {
  const res = await fetch(`${endpoint}/api/gateway/widget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-widget-api-key': apiKey },
    body: JSON.stringify({ chatId, message: text }),
  });
  if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
  const { jobId } = await res.json();

  // Poll until ready
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const poll = await fetch(`${endpoint}/api/gateway/widget/${jobId}`, {
      headers: { 'x-widget-api-key': apiKey },
    });
    if (!poll.ok) throw new Error(`Poll failed: ${poll.status}`);
    const data = await poll.json();
    if (data.status === 'done') return data.text as string;
    if (data.status === 'error') throw new Error(data.error);
    // status === 'pending' → continue polling
  }
  throw new Error('Response timeout');
}
```

### Pattern 4: `WebWidgetProvider` — Internal HTTP Listener

**What:** `WebWidgetProvider` starts a Node `http.Server` on an internal port (e.g. `WIDGET_INTERNAL_PORT`, default 3001). The TanStack proxy route POSTs to it. The provider holds a `Map<jobId, { resolve, reject }>` that resolves when `handleMessage()` completes.
**When to use:** When the gateway worker is a separate process from the TanStack app and the two can only communicate via HTTP.

```typescript
// workers/gateway/providers/web-widget.ts
import http from 'http';
import type { Provider, IncomingMessage } from '../types.js';

export class WebWidgetProvider implements Provider {
  readonly name = 'widget';
  private server: http.Server;
  private jobs = new Map<string, { resolve: (t: string) => void; reject: (e: Error) => void }>();
  private sendFn?: (chatId: string, text: string) => Promise<void>;

  constructor(private port = 3001) {
    this.server = http.createServer(this.handleHttp.bind(this));
  }

  async start(onMessage: (msg: IncomingMessage) => Promise<void>): Promise<void> {
    // Store onMessage for dispatch
    this.sendFn = async (chatId: string, text: string) => {
      const job = this.jobs.get(chatId); // chatId reused as jobId for simplicity
      if (job) job.resolve(text);
    };
    this.server.listen(this.port, () => {
      console.log(`[WebWidget] Listening on port ${this.port}`);
    });
  }

  stop(): void {
    this.server.close();
  }

  async send(chatId: string, text: string): Promise<void> {
    const job = this.jobs.get(chatId);
    if (job) job.resolve(text);
  }

  // HTTP handler for requests forwarded by the TanStack proxy route
  private async handleHttp(req: http.IncomingMessage, res: http.ServerResponse) {
    // Implementation — parse body, dispatch to handleMessage, return jobId
  }
}
```

**Note on job ID design:** The cleanest approach is to use the generated `jobId` (UUID) as the key in `this.jobs`. When `handleMessage()` calls `provider.send(chatId, text)`, the provider must be able to map `chatId` back to the waiting `jobId`. A separate `chatId -> jobId` map handles this.

### Pattern 5: TanStack Start Dynamic API Route (`$jobId`)

The existing `src/routes/api/remote-chats/outbound/$id.tsx` pattern demonstrates exactly how to create a parameterized API route:

```typescript
// src/routes/api/gateway/widget/$jobId.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/gateway/widget/$jobId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { jobId } = params;
        // Validate api key, forward poll to gateway worker
        // ...
      },
    },
  },
});
```

### Pattern 6: Extending `CONVERSATION_SOURCES`

Add `'widget'` to `src/lib/conversation-sources.ts`:

```typescript
export const CONVERSATION_SOURCES = {
  CRONJOB: 'cronjob',
  TELEGRAM: 'telegram',
  WIDGET: 'widget',
} as const;
```

The gateway's `handleMessage()` sets `source: provider.name` when calling `/api/chat-sync`. `WebWidgetProvider.name = 'widget'` automatically maps to the new source.

### Pattern 7: Bypassing Identity Resolution for Widget Users

The `handleMessage()` function in `workers/gateway/handler.ts` currently blocks unauthenticated users (those without a linked `userId`). Widget users are anonymous — they have no linked identity. Two options:

1. **Skip identity check in `handleMessage()`** when `provider.name === 'widget'` — pass `userId: null` directly to `/api/chat-sync`. The `chat-sync` route already handles `userId: null` (see non-chatId flow and fallbacks).
2. **Handle the full LLM call in `WebWidgetProvider`** without going through `handleMessage()` at all — call `/api/chat-sync` directly inside the provider.

**Recommended:** Option 2 — `WebWidgetProvider` calls `/api/chat-sync` directly, bypassing `handleMessage()`. This avoids polluting `handleMessage()` with provider-specific branching. `WebWidgetProvider` is the only provider that doesn't need the identity-linking flow.

### Anti-Patterns to Avoid

- **Externalizing React in the IIFE build:** If `react`/`react-dom` are marked external in Rollup, the widget won't work without the host page also loading React. For a standalone widget this breaks the self-contained requirement. Do NOT externalize.
- **Running widget `vite build` via the main app's `vite.config.ts`:** The main vite config uses TanStack Start plugin which assumes SSR. Use a separate `vite.config.widget.ts`.
- **Sharing a port between TanStack app and `WebWidgetProvider` HTTP server:** The TanStack app runs on port 3000; the provider listener needs its own port (3001 by default, configurable via `WIDGET_INTERNAL_PORT` env var).
- **Storing job state in the DB:** Jobs are transient (60-second lifetime). DB writes add latency and schema overhead for ephemeral state. In-memory Map is correct.
- **Using `crypto.randomUUID()` in the widget without a polyfill check:** Modern browsers (Chrome 92+, Firefox 95+, Safari 15.4+) have `crypto.randomUUID()`. The widget only targets modern browsers so no polyfill is needed, but document this assumption.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Widget bundle format | Custom webpack config | Vite `build.lib` with `formats: ['iife']` | Standard, zero-config for this use case |
| React mounting for widget | Vanilla DOM manipulation | `createRoot()` from `react-dom/client` | React 19 is already bundled in; createRoot is the correct mounting API |
| CSS isolation | Shadow DOM or CSS Modules | Plain `<style>` tag injected into document head with scoped class prefix (e.g. `.cw-*`) | Shadow DOM complicates styling; CSS Modules require build step on host; scoped classes are sufficient |
| Async job tracking | Redis pub/sub | In-memory `Map` in gateway process | Single process; jobs are 60-second TTL; Redis is already not in the stack |

**Key insight:** The hardest part of a standalone widget is not the chat logic — it's CSS isolation. Using a namespace prefix (e.g. `.cw-button`, `.cw-panel`) on all widget styles prevents collisions with host-page CSS without adding complexity.

---

## Common Pitfalls

### Pitfall 1: pnpm Workspace Not Configured for `packages/`

**What goes wrong:** `packages/chat-widget/` is created but pnpm treats it as an external package, not a workspace member. Build script can't resolve workspace-hoisted `react`.
**Why it happens:** `pnpm-workspace.yaml` currently only has `ignoredBuiltDependencies` — no `packages:` entry.
**How to avoid:** Add `packages: ['packages/*']` to `pnpm-workspace.yaml` before creating `packages/chat-widget/package.json`.
**Warning signs:** `Cannot find module 'react'` in widget Vite build.

### Pitfall 2: React Included Twice on Host Pages That Also Use React

**What goes wrong:** If the host page uses React and the widget IIFE bundles its own React, two React instances coexist. React hooks break across instance boundaries.
**Why it happens:** IIFE format with no externals always bundles React.
**How to avoid:** This is a known tradeoff. The widget is for external sites, which may not use React. For internal/known React hosts, document that host must not externalize React either, or provide a secondary build variant. **For this phase, bundle React — the use case is external sites.**
**Warning signs:** "Invalid hook call" error in widget components.

### Pitfall 3: CORS on `/api/gateway/widget`

**What goes wrong:** Widget on `https://external-site.com` calls `https://myapp.com/api/gateway/widget` — cross-origin request blocked by browser.
**Why it happens:** TanStack Start routes don't add CORS headers by default.
**How to avoid:** The `/api/gateway/widget` route handler must return `Access-Control-Allow-Origin: *` (or a configured origin list) and handle `OPTIONS` preflight requests.
**Warning signs:** Console error "CORS policy: No 'Access-Control-Allow-Origin' header" in widget test page.

### Pitfall 4: Gateway Worker Not Running During Development

**What goes wrong:** `/api/gateway/widget` proxy route tries to forward to `WIDGET_GATEWAY_URL` (e.g. `http://localhost:3001`) but gateway isn't running.
**Why it happens:** `pnpm dev` only starts the Vite/TanStack server, not the gateway worker.
**How to avoid:** Update `pnpm dev:all` or document that widget development requires `pnpm gateway:dev` running alongside. Return a clear 503 with message "Gateway not available" from proxy route when forward fails.

### Pitfall 5: `handleMessage()` Identity Check Blocks Widget Messages

**What goes wrong:** `WebWidgetProvider` routes through `handleMessage()`, which calls `/api/gateway-identities` and blocks when `userId` is null, sending the "not linked" message as the response.
**Why it happens:** `handleMessage()` was written for Telegram identity-linking and blocks all anonymous users.
**How to avoid:** `WebWidgetProvider` must NOT call `handleMessage()`. It calls `/api/chat-sync` directly with `source: 'widget'`, `userId: null`, and the widget-generated `chatId`.

### Pitfall 6: TanStack Router File Path for Nested API Route

**What goes wrong:** Route file created at wrong path causes TanStack Router to not register the route.
**Why it happens:** TanStack Router uses directory structure as route hierarchy. `/api/gateway/widget` requires the file at `src/routes/api/gateway/widget/index.tsx` and `$jobId.tsx` at `src/routes/api/gateway/widget/$jobId.tsx`.
**How to avoid:** Follow the established pattern from `src/routes/api/remote-chats/outbound/$id.tsx`. Route path in `createFileRoute` must match the directory path.

### Pitfall 7: Widget `chatId` Lost on Page Refresh

**What goes wrong:** A page refresh generates a new UUID `chatId`, so the widget can't find the previous conversation.
**Why it happens:** `chatId` is stored in JS memory.
**How to avoid:** This is the accepted behavior per the locked decision ("resets on page refresh"). No action needed — document this in a comment in the widget code.

---

## Code Examples

### Widget CSS Injection Pattern

```typescript
// packages/chat-widget/src/styles.ts
const CSS = `
  .cw-button {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #2563eb;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
  }
  .cw-panel {
    position: fixed;
    bottom: 96px;
    right: 24px;
    width: 360px;
    height: 520px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    display: flex;
    flex-direction: column;
    z-index: 9999;
    font-family: system-ui, sans-serif;
  }
`;

export function injectStyles() {
  if (document.getElementById('chat-widget-styles')) return;
  const style = document.createElement('style');
  style.id = 'chat-widget-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}
```

### Proxy Route with CORS and API Key Validation

```typescript
// src/routes/api/gateway/widget/index.tsx
import { createFileRoute } from '@tanstack/react-router';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-widget-api-key',
};

const WIDGET_GATEWAY_URL = process.env.WIDGET_GATEWAY_URL ?? 'http://localhost:3001';
const WIDGET_API_KEY = process.env.WIDGET_API_KEY ?? '';

export const Route = createFileRoute('/api/gateway/widget')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const apiKey = request.headers.get('x-widget-api-key');
        if (!WIDGET_API_KEY || apiKey !== WIDGET_API_KEY) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
          });
        }
        // Forward to gateway worker
        const body = await request.json();
        const jobId = crypto.randomUUID();
        try {
          await fetch(`${WIDGET_GATEWAY_URL}/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId, ...body }),
          });
        } catch {
          return new Response(JSON.stringify({ error: 'Gateway unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
          });
        }
        return new Response(JSON.stringify({ jobId }), {
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      },
    },
  },
});
```

### `WebWidgetProvider` Job State Map Pattern

```typescript
type JobState =
  | { status: 'pending' }
  | { status: 'done'; text: string }
  | { status: 'error'; error: string };

// In WebWidgetProvider class:
private jobs = new Map<string, JobState>();

// When job completes via send():
async send(chatId: string, text: string): Promise<void> {
  const jobId = this.chatIdToJobId.get(chatId);
  if (jobId) {
    this.jobs.set(jobId, { status: 'done', text });
    this.chatIdToJobId.delete(chatId);
  }
}

// Poll endpoint checks:
getJobState(jobId: string): JobState {
  return this.jobs.get(jobId) ?? { status: 'pending' };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ReactDOM.render()` | `createRoot().render()` | React 18 (2022) | Must use `createRoot` — `ReactDOM.render` removed in React 19 |
| Webpack `output.library` for widgets | Vite `build.lib` with `formats: ['iife']` | 2022-2023 | Vite is now the standard; no webpack needed |
| Custom CSS preprocessors in widgets | Plain CSS strings or CSS-in-JS | Ongoing | For self-contained widgets, inlined CSS strings avoid host conflicts |

**Deprecated/outdated:**

- `ReactDOM.render()`: Removed in React 19 (project uses React 19.2.0). Use `createRoot()` only.
- `UMD` format: Still works but IIFE is preferred for browser-only widgets — smaller, no AMD/CJS overhead.

---

## Open Questions

1. **How does the poll route (`$jobId.tsx`) reach the gateway's job state?**
   - What we know: The gateway is a separate process from the TanStack app. Job state lives in the gateway's in-memory Map.
   - What's unclear: The poll route must query job state without a direct function call to the gateway.
   - Recommendation: Poll route also calls the gateway worker's internal HTTP server (`GET WIDGET_GATEWAY_URL/jobs/:jobId`). `WebWidgetProvider` exposes both `POST /jobs` (submit) and `GET /jobs/:jobId` (poll) on its internal HTTP server.

2. **Should `WebWidgetProvider` be started conditionally?**
   - What we know: The gateway only starts Telegram provider if `TELEGRAM_BOT_TOKEN` is set (implied by the constructor throwing).
   - What's unclear: Whether `WebWidgetProvider` should only start if `WIDGET_API_KEY` is set.
   - Recommendation: Yes — guard with `if (process.env.WIDGET_API_KEY)` in `workers/gateway/index.ts` before instantiating `WebWidgetProvider`.

3. **Widget bundle size target**
   - What we know: React 19 + ReactDOM minified is ~130 KB gzip. Widget code will add ~10-20 KB.
   - What's unclear: Whether 150 KB is acceptable to host sites.
   - Recommendation: Acceptable for a developer-targeted widget. Document the size in the widget README comment at the top of `index.tsx`.

---

## Validation Architecture

> `workflow.nyquist_validation` not explicitly set to `false` in `.planning/config.json` — validation section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.0.5 |
| Config file | `vitest.config.ts` (uses vite.config.ts) — no separate file needed |
| Quick run command | `pnpm vitest run src/routes/api/gateway` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| ID | Behavior | Test Type | Automated Command | File Exists? |
|----|----------|-----------|-------------------|-------------|
| W9-01 | API key validation rejects missing/wrong key | unit | `pnpm vitest run src/routes/api/gateway/widget` | Wave 0 |
| W9-02 | POST returns jobId, GET returns `{ status: 'pending' }` then `{ status: 'done', text }` | integration | `pnpm vitest run src/routes/api/gateway/widget` | Wave 0 |
| W9-03 | CORS headers present on POST and OPTIONS responses | unit | `pnpm vitest run src/routes/api/gateway/widget` | Wave 0 |
| W9-04 | `WebWidgetProvider.send()` resolves waiting job | unit | `pnpm vitest run workers/gateway/providers/web-widget` | Wave 0 |
| W9-05 | `CONVERSATION_SOURCES.WIDGET` added | unit | `pnpm vitest run src/lib` | Wave 0 |
| W9-06 | Widget IIFE bundle produces `dist/chat-widget.js` | smoke | `pnpm build:widget && test -f packages/chat-widget/dist/chat-widget.js` | manual |
| W9-07 | Widget CSS uses `.cw-*` namespace (no collision risk) | manual review | n/a | manual |

### Sampling Rate

- **Per task commit:** `pnpm vitest run src/routes/api/gateway`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/routes/api/gateway/widget/widget.test.ts` — covers W9-01, W9-02, W9-03
- [ ] `workers/gateway/providers/web-widget.test.ts` — covers W9-04
- [ ] `src/lib/conversation-sources.test.ts` — covers W9-05 (may already exist — check)

---

## Sources

### Primary (HIGH confidence)

- Direct codebase reading:
  - `workers/gateway/types.ts` — Provider interface (authoritative)
  - `workers/gateway/providers/telegram.ts` — Provider implementation pattern (authoritative)
  - `workers/gateway/handler.ts` — `handleMessage()` identity-check flow (authoritative)
  - `workers/gateway/index.ts` — provider registration pattern (authoritative)
  - `src/routes/api/chat-sync.tsx` — chat-sync flow, `userId: null` handling (authoritative)
  - `src/routes/api/remote-chats/outbound/$id.tsx` — dynamic `$id` route file pattern (authoritative)
  - `vite.config.ts` — existing Vite setup (authoritative)
  - `package.json` — installed versions (authoritative)
  - `pnpm-workspace.yaml` — current workspace config (authoritative)
  - `src/lib/conversation-sources.ts` — `CONVERSATION_SOURCES` constants (authoritative)

### Secondary (MEDIUM confidence)

- Vite `build.lib` documentation — IIFE output format, `name` global, `fileName` option (well-established Vite feature, stable since Vite 2)
- React 19 `createRoot` API — confirmed `ReactDOM.render` removed, `createRoot` required
- pnpm workspace `packages:` configuration — standard pnpm pattern

### Tertiary (LOW confidence)

- CSS class namespace approach for widget isolation — community convention, not a spec

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already in project, patterns verified from codebase
- Architecture: HIGH — Provider interface and route patterns directly read from source
- Pitfalls: HIGH (items 1-6) / MEDIUM (item 7 re: bundle size tolerance)

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable domain — Vite, React, TanStack Router patterns don't change month-to-month)
