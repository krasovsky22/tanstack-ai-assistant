# External Integrations

**Analysis Date:** 2026-03-04

## APIs & External Services

**OpenAI (LLM):**
- Service: OpenAI GPT API (model: `gpt-5.2`)
- What it's used for: Core language model for chat, job processing, resume generation, and cronjob execution
- SDK/Client: `@tanstack/ai-openai` (TanStack AI adapter)
- Auth: Environment variable `OPENAI_API_KEY`
- Endpoints:
  - Chat completion API (streaming) - `src/routes/api/chat.tsx`
  - Chat completion API (synchronous) - `src/routes/api/chat-sync.tsx`
  - Job scraping and description analysis - `src/routes/api/reports/scrape-jobs.tsx`
  - Resume generation - `src/services/generate-resume.ts`
  - Job processing - `src/services/process-job.ts`

**Model Context Protocol (MCP) Gateway:**
- Service: Docker-based MCP Gateway (external tool execution)
- What it's used for: Dynamic tool integration via MCP protocol (e.g., web scraping, browser automation)
- SDK/Client: `@modelcontextprotocol/sdk` (StdioClientTransport)
- Communication: stdio-based IPC (`docker.exe mcp gateway run`)
- Tools loaded: `getMcpToolDefinitions()` in `src/tools/mcp.ts` dynamically loads tools from gateway
- Auth: None (local Docker communication)

**Telegram Bot API:**
- Service: Telegram Bot API (messaging platform)
- What it's used for: Gateway for conversational AI access via Telegram messages
- SDK/Client: Native fetch HTTP calls to `https://api.telegram.org/bot{token}/` endpoints
- Auth: Environment variables `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`
- Endpoints used:
  - `getMe` - Verify bot connection (`src/workers/gateway/providers/telegram.ts:34-60`)
  - `getUpdates` - Long-polling for incoming messages (30s timeout)
  - `sendMessage` - Reply to messages
  - `sendChatAction` - Send typing indicator
- Implementation: `src/workers/gateway/providers/telegram.ts`
- Optional: `TELEGRAM_ADMIN_CHAT_ID` for startup notifications

**OpenWeather API:**
- Service: OpenWeather weather data API
- What it's used for: Legacy weather tool (if referenced)
- Auth: Environment variable `OPEN_WEATHER_API`
- Status: Optional, may be exposed via MCP tools

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: `DATABASE_URL` environment variable (format: `postgresql://user:password@host:port/dbname`)
  - Client: `postgres` (js-postgres) + Drizzle ORM
  - ORM: Drizzle ORM v0.45.1
  - Schema location: `src/db/schema.ts`
  - Migrations: `src/db/migrations/` (Drizzle Kit)
  - Tables:
    - `conversations` - Chat sessions with source tracking (Telegram, web, cronjob)
    - `messages` - Chat messages with JSONB parts
    - `jobs` - Job listings for processing (status: new/processed/failed)
    - `cronjobs` - Scheduled prompts (name, cron expression, active status)
    - `cronjobLogs` - Execution logs for cronjobs (status, result, error, duration)

**File Storage:**
- Local filesystem only
  - Resume markdown: `resumePath` field in `jobs` table
  - Resume PDF: `resumePdfPath` field in `jobs` table
  - Cover letter: `coverLetterPath` field in `jobs` table
  - Output directory: Dynamic based on `mkdir` calls in `src/services/generate-resume.ts`

**Caching:**
- TanStack Query (in-memory client-side caching for API responses)
- No server-side caching system detected

## Authentication & Identity

**Auth Provider:**
- Custom implementation (no third-party auth service)
- Gateway pattern: `chatId` and `userId` stored in conversations table for multi-provider support
- Sources tracked: `CONVERSATION_SOURCES` in `src/lib/conversation-sources`
- Each conversation scoped to: source, chatId (provider-specific ID), userId (optional)

**Bot Authentication:**
- Telegram bot token-based (stored in `TELEGRAM_BOT_TOKEN`)
- MCP Gateway: stdio-based (no authentication)

## Monitoring & Observability

**Error Tracking:**
- Not detected
- External reference in vite.config.ts (`/^@sentry\/` excluded from nitro bundle) suggests Sentry might be intended but not currently implemented

**Logs:**
- Console logging throughout:
  - Chat service: message flow, conversation persistence
  - Workers: job processing, cron execution, Telegram polling
  - Tools: MCP tool calls, cronjob CRUD
- Cronjob execution: `cronjobLogs` table captures status, result, error, and duration
- Telegram: detailed logging of updates and connection state
- No persistent log aggregation system

**Metrics:**
- Cronjob logs track: `durationMs` (execution time), `status` (success/error)
- Job processing tracks: `retryCount`, `failedAt`, `errorMessage`

## CI/CD & Deployment

**Hosting:**
- Not configured; application is full-stack Node.js
- Expects deployment to: Linux server, Docker, or cloud VM supporting Node.js
- Dev: `pnpm dev` on port 3000, `pnpm jobs:dev`, `pnpm gateway:dev`, `pnpm cron:dev` run as separate processes

**CI Pipeline:**
- Not detected in codebase
- Docker support present: `docker compose`, `docker.exe mcp gateway run`
- Docker Compose files: `docker-compose.override.example.yml`, `docker-compose.yml` (inferred)

**Build Commands:**
- `pnpm build` - Production build (Vite + TanStack Start)
- `pnpm dev` - Development server (Vite dev server, port 3000)
- `pnpm dev:all` - Dev server + jobs worker (parallel)
- Workers as separate processes: `pnpm jobs`, `pnpm jobs:dev`, `pnpm gateway`, `pnpm gateway:dev`, `pnpm cron`, `pnpm cron:dev`

## Environment Configuration

**Required env vars:**
- `OPENAI_API_KEY` - OpenAI API key (blocking if missing; returns 500 error)
- `DATABASE_URL` - PostgreSQL connection string (blocking if missing)
- `APP_URL` - Base URL for internal API calls (used by gateway/cron workers; default: `http://localhost:3000`)

**Optional env vars:**
- `TELEGRAM_BOT_TOKEN` - Telegram bot token (required if running gateway worker)
- `TELEGRAM_BOT_USERNAME` - Telegram bot username without @ (required if running gateway worker)
- `TELEGRAM_ADMIN_CHAT_ID` - Optional admin chat ID for startup notifications
- `OPEN_WEATHER_API` - OpenWeather API key (if weather tool is exposed)
- `CHROME_EXECUTABLE_PATH` - Path to Chrome binary for puppeteer (default: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` on macOS)

**Secrets location:**
- `.env` file (never committed; use `.env.example` as template)
- Runtime loading via `dotenv` in worker processes: `import 'dotenv/config';`
- Server-side access via `process.env`

## Webhooks & Callbacks

**Incoming:**
- `POST /api/chat` - Browser UI streaming chat endpoint (accepts messages, returns server-sent events stream)
- `POST /api/chat-sync` - Gateway/cron synchronous chat endpoint (returns JSON with action and response)
  - Called by: Telegram gateway worker, Cronjob scheduler
  - Payload: `{ messages: Message[], title?: string, source: string, chatId?: string, userId?: string }`
- `POST /api/jobs` - Create job listing
- `POST /api/jobs/process` - Process a specific job
- `POST /api/cronjobs` - Create cronjob
- `POST /api/cronjobs/:id/test` - Test a cronjob
- Telegram gateway provides: message text, chat ID, provider name

**Outgoing:**
- Telegram gateway sends replies via `sendMessage` API (internal to gateway)
- Cronjob scheduler calls `/api/chat-sync` (internal HTTP call) with job prompt
- MCP tools make external calls (e.g., browser automation) via Docker gateway
- Resume/cover letter generation may write to filesystem (local only)

---

*Integration audit: 2026-03-04*
