# Codebase Structure

**Analysis Date:** 2026-03-04

## Directory Layout

```
tanstack-ai-assistant/
├── src/                          # Main application source
│   ├── routes/                   # TanStack Router file-based routing
│   │   ├── __root.tsx            # Root layout (QueryClientProvider, devtools)
│   │   ├── index.tsx             # GET / - Chat UI entry point
│   │   ├── api/                  # API endpoints
│   │   │   ├── chat.tsx          # POST /api/chat - streaming chat
│   │   │   ├── chat-sync.tsx     # POST /api/chat-sync - sync for gateway/cron
│   │   │   ├── conversations/    # Conversation management
│   │   │   │   ├── index.tsx     # GET/POST /api/conversations
│   │   │   │   └── $id.tsx       # /api/conversations/:id routes
│   │   │   ├── jobs/             # Job management
│   │   │   │   ├── index.tsx     # GET/POST /api/jobs
│   │   │   │   ├── $id.tsx       # /api/jobs/:id routes
│   │   │   │   ├── process.tsx   # Process job endpoint
│   │   │   │   └── generate-resume.tsx
│   │   │   ├── cronjobs/         # Cronjob management
│   │   │   │   ├── index.tsx     # GET/POST /api/cronjobs
│   │   │   │   ├── $id.tsx       # /api/cronjobs/:id routes
│   │   │   │   ├── $id/logs.tsx  # /api/cronjobs/:id/logs
│   │   │   │   └── $id/test.tsx  # /api/cronjobs/:id/test
│   │   │   └── reports/
│   │   │       └── scrape-jobs.tsx
│   │   ├── conversations/        # Conversation UI pages
│   │   ├── jobs/                 # Jobs UI pages
│   │   └── cronjobs/             # Cronjobs UI pages
│   ├── components/               # React components
│   │   ├── Chat.tsx              # Main chat UI with streaming
│   │   ├── Header.tsx            # Navigation header
│   │   └── Badge.tsx             # UI badge component
│   ├── services/                 # Business logic
│   │   ├── chat.ts               # Chat options, conversation persistence
│   │   ├── process-job.ts        # Job extraction and processing
│   │   └── generate-resume.ts    # Resume generation
│   ├── tools/                    # LLM tools
│   │   ├── index.ts              # Tool exports
│   │   ├── mcp.ts                # Docker MCP gateway integration
│   │   └── crontool.ts           # Cronjob management tools
│   ├── db/                       # Database
│   │   ├── index.ts              # Drizzle client initialization
│   │   ├── schema.ts             # Table definitions
│   │   └── migrate.ts            # Migration runner
│   ├── lib/                      # Utilities
│   │   ├── conversation-sources.ts
│   │   ├── job-constants.ts
│   │   └── queryClient.ts
│   ├── collections/              # Data access/queries
│   │   └── conversations.ts
│   ├── router.tsx                # Router initialization
│   ├── routeTree.gen.ts          # Auto-generated (DO NOT EDIT)
│   └── styles.css                # Global styles
├── workers/                      # Background worker processes
│   ├── gateway/                  # Telegram gateway worker
│   │   ├── index.ts              # Entry point
│   │   ├── handler.ts            # Message handler
│   │   ├── types.ts              # Type definitions
│   │   └── providers/
│   │       └── telegram.ts       # Telegram long-polling provider
│   ├── jobs/                     # Job processing worker
│   │   └── index.ts              # Job polling and processing
│   └── cron/                     # Cronjob scheduler worker
│       └── index.ts              # Cron scheduling and execution
├── public/                       # Static assets (served by Vite)
├── files/                        # Generated files
│   └── resume/                   # Generated resume files
├── scripts/                      # Utility scripts
├── docs/                         # Documentation
├── .planning/                    # GSD planning artifacts
│   └── codebase/                 # Analysis documents
├── tsconfig.json                 # Main app TypeScript config
├── tsconfig.worker.json          # Workers TypeScript config
├── tsconfig.gateway.json         # Gateway TypeScript config
├── vite.config.ts                # Vite configuration
├── package.json                  # Dependencies and scripts
├── pnpm-lock.yaml                # Lockfile
└── .env.example                  # Environment template
```

## Directory Purposes

**src/routes/:**
- Purpose: TanStack Router file-based routing (do NOT edit `routeTree.gen.ts`)
- Contains: Route components and handlers for both UI and API
- Key files: `__root.tsx` (root layout), `index.tsx` (home), `api/` (endpoints)

**src/routes/api/:**
- Purpose: Server-side HTTP endpoint handlers
- Contains: POST/GET handlers for chat, conversations, jobs, cronjobs
- Pattern: `createFileRoute('/path')({ server: { handlers: { POST, GET } } })`

**src/components/:**
- Purpose: React UI components
- Contains: Chat UI, header, and reusable components
- Key: `Chat.tsx` - main interactive component using @tanstack/ai-react

**src/services/:**
- Purpose: Business logic isolated from routes
- Contains:
  - `chat.ts` - chat configuration, conversation persistence, conversation state queries
  - `process-job.ts` - LLM-powered job data extraction
  - `generate-resume.ts` - Resume and cover letter generation

**src/tools/:**
- Purpose: LLM-callable tools registration and management
- Contains:
  - `mcp.ts` - Dynamic MCP tool loading from Docker (converts JSON Schema to Zod)
  - `crontool.ts` - Native cronjob CRUD tools
  - `index.ts` - Exports for tool factory functions

**src/db/:**
- Purpose: Database layer
- Contains: Drizzle ORM schema, client initialization
- Tables: conversations, messages, jobs, cronjobs, cronjobLogs

**src/lib/:**
- Purpose: Shared constants and utilities
- Contains: Conversation source enum, job status enum, TanStack Query client

**src/collections/:**
- Purpose: Data access collection patterns
- Contains: Query functions for conversations (may expand for other entities)

**workers/gateway/:**
- Purpose: Telegram bot integration
- Contains: Long-polling client, message handler, provider abstraction
- Runs as: Separate Node.js process (`pnpm gateway`)

**workers/jobs/:**
- Purpose: Async job processing
- Contains: Polling loop, job processing service calls, retry logic
- Runs as: Separate Node.js process (`pnpm jobs`)

**workers/cron/:**
- Purpose: Cronjob scheduling
- Contains: DB polling, node-cron scheduling, execution handler
- Runs as: Separate Node.js process (`pnpm cron`)

## Key File Locations

**Entry Points:**

| Purpose | File | Triggers |
|---------|------|----------|
| Web app root | `src/routes/__root.tsx` | App startup |
| Chat UI home | `src/routes/index.tsx` | GET / |
| Streaming chat endpoint | `src/routes/api/chat.tsx` | POST /api/chat (browser) |
| Sync chat endpoint | `src/routes/api/chat-sync.tsx` | POST /api/chat-sync (workers) |
| Gateway worker | `workers/gateway/index.ts` | `pnpm gateway` |
| Jobs worker | `workers/jobs/index.ts` | `pnpm jobs` |
| Cron worker | `workers/cron/index.ts` | `pnpm cron` |

**Configuration:**

| File | Purpose |
|------|---------|
| `tsconfig.json` | Main app TypeScript config (path aliases @/*, #/*) |
| `tsconfig.worker.json` | Workers TypeScript config |
| `tsconfig.gateway.json` | Gateway TypeScript config |
| `vite.config.ts` | Vite/TanStack Start build config |
| `package.json` | Dependencies and dev/build scripts |
| `.env.example` | Environment template (copy to .env) |

**Core Logic:**

| Module | File | Key Functions |
|--------|------|----------------|
| Chat | `src/services/chat.ts` | `buildChatOptions()`, `saveConversationToDb()`, `getOpenConversationByChatId()`, `appendMessagesToConversation()`, `closeConversation()` |
| Job Processing | `src/services/process-job.ts` | `processNextNewJob()`, `processJobById()` |
| Resume Generation | `src/services/generate-resume.ts` | `generateResumeForNextProcessedJob()` |
| Tools | `src/tools/crontool.ts` | `getCronjobTools()` returns 4 tools |
| Tools | `src/tools/mcp.ts` | `getMcpToolDefinitions()` loads from Docker |

**Database:**

| File | Purpose |
|------|---------|
| `src/db/schema.ts` | Table definitions: conversations, messages, jobs, cronjobs, cronjobLogs |
| `src/db/index.ts` | Drizzle client initialization |
| `src/db/migrate.ts` | Migration runner |

**Testing & Type Safety:**

| File | Purpose |
|------|---------|
| `src/lib/job-constants.ts` | Job status enum and type |
| `src/lib/conversation-sources.ts` | Conversation source enum |

## Naming Conventions

**Files:**

- `[name].tsx` - React components and route handlers
- `[name].ts` - TypeScript utilities, services, types
- `[name].css` - Global or component styles
- `[name].gen.ts` - Generated files (auto-generated, never edit manually)
- `[name].example` or `.example.[ext]` - Template files for configuration

**Directories:**

- `[plural-noun]/` - Collections of related modules (e.g., `routes/`, `components/`, `services/`, `workers/`)
- `[domain]/` for nested features (e.g., `routes/api/`, `routes/conversations/`)
- `$` prefix in route paths for dynamic segments (e.g., `routes/$id.tsx` → `/conversations/:id`)

**Functions:**

- `camelCase` for all functions and variables
- `PascalCase` for React components and classes
- Prefix with action verb: `get*`, `fetch*`, `create*`, `update*`, `delete*`, `build*`, `save*`, `process*`
- Error classes: `[Noun]Error` (e.g., `JobProcessingError`, `ResumeGenerationError`)

**Types:**

- `PascalCase` for all types and interfaces
- Prefix with context when needed: `ChatOptions`, `GatewayDecision`, `MessageToSave`
- Enums: `SCREAMING_SNAKE_CASE` for values (e.g., `CONVERSATION_SOURCES.CRONJOB`)

**Route Parameters:**

- Dynamic segments use `$` prefix: `$id`, `$conversationId`
- Query params accessed via `new URL(request.url).searchParams`

## Where to Add New Code

**New Feature (Chat-Related):**

1. Create route handlers in `src/routes/api/[feature]/`
2. Create service functions in `src/services/[feature].ts` if complex logic
3. Create React component in `src/components/[Feature].tsx`
4. Create UI route in `src/routes/[feature]/index.tsx`

**New LLM Tool:**

- Native tool: Add to `src/tools/crontool.ts` using `toolDefinition()` pattern
- External tool: Define in MCP container, auto-loaded by `src/tools/mcp.ts`

**New Worker Process:**

1. Create directory under `workers/[name]/`
2. Create `index.ts` with polling/event loop logic
3. Add TypeScript config `tsconfig.[name].json`
4. Add package.json scripts for `pnpm [name]` and `pnpm [name]:dev`
5. Import services and call `/api/chat-sync` or other endpoints as needed

**New Database Table:**

1. Add table definition to `src/db/schema.ts` using `pgTable()`
2. Run `pnpm db:push` to apply schema changes
3. Export type for TypeScript: `export type [Entity] = typeof [table].$inferSelect`

**New Utility/Constant:**

- Shared constants: `src/lib/[name].ts`
- Collection/query helpers: `src/collections/[name].ts`

**Testing (when added):**

- Unit tests co-located with source: `src/services/[name].test.ts`
- Integration tests: `tests/api/[name].test.ts`
- Run with `pnpm test` or `pnpm vitest run [path]`

## Special Directories

**src/collections/:**
- Purpose: Data access patterns for queries
- Generated: No
- Committed: Yes
- Future expansion for DAL layer

**files/:**
- Purpose: Runtime-generated files (resumes, cover letters)
- Generated: Yes (by resume generation worker)
- Committed: No (.gitignore)
- Structure: `files/resume/[jobId]/...`

**public/:**
- Purpose: Static assets served by Vite dev server / production build
- Generated: No (source files)
- Committed: Yes

**.tanstack/tmp/:**
- Purpose: TanStack router build artifacts and temp files
- Generated: Yes
- Committed: No (.gitignore)

**.output/:**
- Purpose: Production build output
- Generated: Yes (from `pnpm build`)
- Committed: No (.gitignore)

**.planning/codebase/:**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by map-codebase command)
- Committed: Yes (for reference and CI)

## Path Aliases

Both `@/*` and `#/*` resolve to `./src/*` (configured in tsconfig.json):

```typescript
// Equivalent:
import { chat } from '@/services/chat'
import { chat } from '#/services/chat'
```

Use `@/` consistently for clarity.

## Important Files to Know

| File | Read/Modify? | Reason |
|------|-------------|--------|
| `src/routeTree.gen.ts` | Read only | Auto-generated from routes structure |
| `pnpm-lock.yaml` | Read only | Lockfile, managed by pnpm |
| `.env` | Modify as needed | Environment secrets (never commit) |
| `.env.example` | Modify when adding vars | Template for contributors |
| `src/routes/__root.tsx` | Modify carefully | Root layout affects entire app |
| `src/db/schema.ts` | Modify for new tables | Requires `pnpm db:push` after changes |
| `package.json` | Modify for deps/scripts | Requires `pnpm install` after changes |
