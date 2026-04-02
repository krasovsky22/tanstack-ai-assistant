# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack AI assistant platform built with TanStack Start, TanStack Router (file-based routing), and TanStack AI. Uses OpenAI (GPT-5.2) with streaming responses, a tool-calling system, PostgreSQL persistence, a Telegram gateway, and a cronjob automation system.

## Commands

- **Dev server**: `pnpm dev` (port 3000)
- **Dev server + jobs worker**: `pnpm dev:all`
- **Build**: `pnpm build`
- **Test**: `pnpm test` (vitest)
- **Run single test**: `pnpm vitest run <path>`

**Database:**

- `pnpm db:migrate` — run Drizzle migrations
- `pnpm db:push` — push schema changes directly

**Workers (each runs as a separate process):**

- `pnpm jobs` / `pnpm jobs:dev` — job processing worker
- `pnpm gateway` / `pnpm gateway:dev` — Telegram gateway worker
- `pnpm cron` / `pnpm cron:dev` — cronjob scheduler worker

Package manager is **pnpm**.

## Architecture

**Routing**: File-based via TanStack Router. Route files in `src/routes/`. Do not edit `src/routeTree.gen.ts` (auto-generated).

**Two chat endpoints:**

- `src/routes/api/chat.tsx` — streaming POST for the browser UI (`toHttpResponse()`)
- `src/routes/api/chat-sync.tsx` — synchronous JSON POST used by gateway and cron workers; LLM decides conversation action (`continue` | `new_conversation` | `close_conversation`)

**Chat service**: `src/services/chat.ts` — `buildChatOptions()` loads all tools (MCP + cronjob tools), configures the agent loop (`maxIterations: 10`). Also handles conversation persistence: `saveConversationToDb()`, `appendMessagesToConversation()`, `getOpenConversationByChatId()`, `closeConversation()`.

**Chat UI**: `src/components/Chat.tsx` — `useChat` hook from `@tanstack/ai-react` with `fetchHttpStream('/api/chat')`.

**Tools system**: `src/tools/`

- `crontool.ts` — 4 LLM-callable tools: `list_cronjobs`, `create_cronjob`, `update_cronjob`, `delete_cronjob`
- `zapier-mcp.ts` — connects to Zapier MCP server via streamable HTTP, dynamically loads tools as Zod-validated tools
- `index.ts` — exports tool factory functions; both are registered in `buildChatOptions()`

**Workers**: `workers/`

- `gateway/` — Telegram long-polling (`getUpdates`), routes messages to `/api/chat-sync`, sends replies; filters for bot mentions; also starts `WebWidgetProvider` (HTTP server on port 3001) when `WIDGET_API_KEY` is set
- `cron/` — polls DB every 5 minutes for active cronjobs, schedules them with `node-cron`, calls `/api/chat-sync` with the cronjob's prompt, logs results to `cronjobLogs`
- `jobs/` — polls every 30s for `new` jobs, processes them, then generates resumes for `processed` jobs (up to 3 retries)

**Database**: PostgreSQL via Drizzle ORM (`src/db/`). Schema in `src/db/schema.ts`:

- `conversations` — id (UUID), title, source, chatId, userId, isClosed
- `messages` — id, conversationId (FK), role, parts (JSONB)
- `jobs` — id, title, company, description, status, skills (JSONB), resumePath, matchScore, retryCount
- `cronjobs` — id, name, cronExpression, prompt, isActive, lastRunAt, lastResult
- `cronjobLogs` — id, cronjobId (FK), status, result, error, durationMs, ranAt

**Path aliases**: `@/*` and `#/*` both resolve to `./src/*`.

**TypeScript configs**: `tsconfig.json` (app), `tsconfig.worker.json` (jobs/cron), `tsconfig.gateway.json` (gateway).

## Environment Variables

- `OPENAI_API_KEY` — required for LLM calls
- `DATABASE_URL` — PostgreSQL connection string
- `APP_URL` — base URL used by workers to call `/api/chat-sync` (e.g. `http://localhost:3000`)
- `TELEGRAM_BOT_TOKEN` — from @BotFather
- `TELEGRAM_BOT_USERNAME` — bot username without @
- `TELEGRAM_ADMIN_CHAT_ID` — (optional) chat ID to receive bot startup notifications
- `OPEN_WEATHER_API` — for the legacy weather tool
- `NEWS_API_TOKEN` — (optional) required to use the News API tool
- `DISABLE_SECTIONS` — (optional) comma-separated UI sections to hide/disable. Valid keys: `ai`, `jobs`, `mail`, `knowledge-base`, `cronjobs`
- `ZAPIER_MCP_URL` — Zapier MCP server URL (required when mcp tool group is enabled)
- `ZAPIER_MCP_TOKEN` — Zapier MCP bearer token (required when mcp tool group is enabled)
- `JIRA_BASE_URL` — (optional) Jira instance base URL; used as system-level fallback for bug/feature reports when no user has Jira configured
- `JIRA_EMAIL` — (optional) Atlassian account email for the system Jira PAT
- `JIRA_PAT` — (optional) Jira Personal Access Token for system-level ticket creation
- `JIRA_DEFAULT_PROJECT` — (optional) default Jira project key for new tickets (e.g. `KAN`)
- `WIDGET_API_KEY` — shared secret for the embeddable chat widget; widget passes this as `x-widget-api-key` header; when set, gateway worker starts the `WebWidgetProvider` HTTP server
- `WIDGET_GATEWAY_URL` — internal URL of the WebWidgetProvider HTTP server (default: `http://localhost:3001`)
- `WIDGET_INTERNAL_PORT` — port the gateway's WebWidgetProvider HTTP server listens on (default: `3001`)

## Workflow Rules

When adding new environment variables:

1. Add the variable to `.env.example` with a descriptive comment
2. Document it in the "Environment Variables" section above
3. Mark as "(optional)" or "required" as appropriate

**UI Target**: Desktop/laptop screens only. No mobile or responsive design required.

**UI Components**: Always use Chakra UI components when writing UI code. Prefer Chakra UI primitives (`Box`, `Stack`, `Button`, `Input`, `Text`, `Heading`, `Flex`, `Grid`, etc.) over raw HTML elements or custom CSS. Use Chakra's theming system for colors, spacing, and typography. Only reach for plain HTML or custom styles when Chakra UI has no suitable component.

**UI Agent**: For any task that involves creating, modifying, or refactoring UI components, pages, or visual features, always delegate to the `ui-developer` agent via the Agent tool. This includes new routes, forms, modals, layouts, navigation, and any browser-visible functionality.

When adding new UI functionality:

After implementing a new UI feature or modifying existing UI components, proactively invoke the `playwright-qa-tester` agent to write and execute Playwright tests against the running dev server (port 3000). The agent will validate the feature works correctly using real browser interactions. This applies to:

- New pages or route components
- New UI components with user interactions (forms, modals, buttons)
- Modified existing UI flows
- Any feature visible in the browser
