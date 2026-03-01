# Communication Gateway

The Communication Gateway is a standalone process that connects external chat platforms to the AI assistant. It polls platforms for new messages, forwards them to the web app's `/api/chat-sync` endpoint for an LLM response, and sends the reply back to the originating platform.

The gateway is provider-agnostic. Adding a new platform (WhatsApp, Slack, etc.) means adding one file under `gateway/providers/`.

---

## Architecture

```
Platform (e.g. Telegram)
        ↓  poll for messages
workers/gateway/providers/telegram.ts
        ↓  IncomingMessage
workers/gateway/handler.ts
        ↓  POST /api/chat-sync  { messages, title }
Web app (src/routes/api/chat-sync.tsx)
        ↓  LLM call + DB writes
        ↑  { text }
workers/gateway/handler.ts
        ↓  provider.send(chatId, text)
Platform
```

The gateway has **no direct database access**. All persistence (conversations, messages) is handled by the web app inside `/api/chat-sync`.

---

## Running the gateway

### Development

```bash
pnpm gateway:dev
```

Starts the gateway with file-watching (restarts on changes). Requires the web app to also be running:

```bash
pnpm dev          # terminal 1 — web app on port 3000
pnpm gateway:dev  # terminal 2 — gateway
```

### Production

```bash
pnpm gateway
```

### Docker

```bash
docker compose up gateway --build
```

The `gateway` service in `docker-compose.yml` depends on `postgres` and connects to the web app via `APP_URL` (defaults to `http://host.docker.internal:3000`).

> **File location:** `workers/gateway/` — the gateway lives inside the shared `workers/` directory alongside the job polling worker and cron worker.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `APP_URL` | Yes | Base URL of the web app. Gateway posts to `$APP_URL/api/chat-sync`. |
| `TELEGRAM_BOT_TOKEN` | Telegram only | Bot token from [@BotFather](https://t.me/BotFather). |
| `TELEGRAM_BOT_USERNAME` | Telegram only | Bot username without the leading `@`. |

Set these in `.env` for local development. In Docker they are injected via the `environment:` block in `docker-compose.yml`.

---

## Providers

### Telegram

Uses Telegram's [long-polling](https://core.telegram.org/bots/api#getupdates) API — no public webhook URL required.

**How it works:**

1. Calls `GET /bot{TOKEN}/getUpdates?offset={offset}&timeout=30` in a loop.
2. Filters `channel_post` updates that mention `@{TELEGRAM_BOT_USERNAME}` in their text.
3. Forwards matching messages to `handleMessage`.
4. Sends the reply via `POST /bot{TOKEN}/sendMessage`.

**Setup:**

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Add the bot to your Telegram channel as an administrator.
3. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` in `.env`.
4. Start the gateway — no webhook registration needed.

**Trigger:** Any `channel_post` whose text contains `@yourbotname`.

---

## Adding a new provider

1. Create `workers/gateway/providers/<name>.ts` implementing the `Provider` interface:

```typescript
import type { IncomingMessage, Provider } from '../types.js';

export class MyProvider implements Provider {
  readonly name = 'MyPlatform';

  async start(onMessage: (msg: IncomingMessage) => Promise<void>): Promise<void> {
    // poll or subscribe to messages, call onMessage() for each
  }

  stop(): void {
    // signal the loop to exit
  }

  async send(chatId: number | string, text: string): Promise<void> {
    // post the reply back to the platform
  }
}
```

2. Register it in `workers/gateway/index.ts`:

```typescript
const { MyProvider } = await import('./providers/my-provider.js');

const providers: Provider[] = [
  new TelegramProvider(),
  new MyProvider(),        // add here
];
```

That's all — `handleMessage` is shared across all providers.

---

## `/api/chat-sync` endpoint

The internal HTTP endpoint the gateway calls.

**`POST /api/chat-sync`**

Request body:
```json
{
  "messages": [{ "role": "user", "content": "Hello @bot" }],
  "title": "Telegram: Hello @bot"
}
```

| Field | Description |
|---|---|
| `messages` | Array of `{ role, content }` objects passed to the LLM. |
| `title` | Used as the conversation title stored in the database. |

Response:
```json
{ "text": "Hi! How can I help you?" }
```

The endpoint creates a conversation record, persists both the user and assistant messages, runs the LLM, and returns the reply text.
