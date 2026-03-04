# Architecture

**Analysis Date:** 2026-03-04

## Pattern Overview

**Overall:** Multi-process distributed system with a central TanStack Start web server, external worker processes, and dual chat endpoint architecture for streaming UI and synchronous gateway/automation flows.

**Key Characteristics:**
- Full-stack React framework (TanStack Start) with file-based routing
- Dual chat APIs: streaming HTTP (`/api/chat`) for UI, synchronous JSON (`/api/chat-sync`) for workers
- Three independent worker processes (gateway, cron, jobs) communicating via HTTP to main app
- Tool-calling agent loop via @tanstack/ai with LLM-managed conversation state
- PostgreSQL persistence for conversations, jobs, and cronjobs via Drizzle ORM
- Dynamic MCP (Model Context Protocol) tool loading from Docker container

## Layers

**Presentation Layer:**
- Purpose: React UI components for chat, conversations, jobs, and cronjobs management
- Location: `src/components/`, `src/routes/` (non-API routes)
- Contains: React components, TanStack Router file-based route definitions, Chat UI with streaming
- Depends on: TanStack Query for data fetching, @tanstack/ai-react for chat hooks
- Used by: Browser clients

**API/Route Layer (Server-Side):**
- Purpose: HTTP endpoints for chat, data persistence, and worker communication
- Location: `src/routes/api/`
- Contains: Route handlers using TanStack Router with `server: { handlers: { GET/POST } }`
- Depends on: Database layer, services layer, @tanstack/ai core
- Used by: Frontend, workers, external systems

**Service Layer:**
- Purpose: Business logic isolated from route handlers
- Location: `src/services/`
- Key services:
  - `chat.ts`: Builds chat options (`buildChatOptions`), manages conversation persistence and state (`saveConversationToDb`, `appendMessagesToConversation`, `getOpenConversationByChatId`, `closeConversation`)
  - `process-job.ts`: Job extraction via LLM, transitions jobs from `new` → `processed` status
  - `generate-resume.ts`: Resume generation for processed jobs, transitions to `resume_generated` status
- Depends on: Database layer, LLM integration (@tanstack/ai)
- Used by: Route handlers, workers

**Tools Layer:**
- Purpose: LLM-callable tools and tool loading
- Location: `src/tools/`
- Contains:
  - `mcp.ts`: Connects via stdio to Docker MCP Gateway, dynamically converts MCP tools to Zod-validated TanStack AI tools
  - `crontool.ts`: Four native cronjob management tools (`list_cronjobs`, `create_cronjob`, `update_cronjob`, `delete_cronjob`)
  - `index.ts`: Exports factory functions
- Depends on: @modelcontextprotocol/sdk, @tanstack/ai, Zod
- Used by: Chat service (agent loop)

**Data/Database Layer:**
- Purpose: Persistent storage of conversations, messages, jobs, cronjobs, and logs
- Location: `src/db/`
- Contains: Drizzle ORM schema (`schema.ts`), database client initialization (`index.ts`)
- Tables:
  - `conversations`: Chat sessions with source tracking (telegram, cronjob, etc.)
  - `messages`: Conversation message history with JSONB parts
  - `jobs`: Job records with status lifecycle, skills, match scores, resume paths
  - `cronjobs`: Scheduled AI tasks with cron expressions and prompt templates
  - `cronjobLogs`: Execution logs for auditing and result tracking
- Depends on: PostgreSQL, postgres-js driver
- Used by: Services and routes

**Worker Processes:**
- Purpose: Long-running background jobs and external communication
- Location: `workers/`
- Types:
  - **Gateway Worker** (`workers/gateway/`): Listens to Telegram (long-polling), routes messages to `/api/chat-sync`, sends responses back to chat
  - **Jobs Worker** (`workers/jobs/`): Polls DB every 30s for `new` jobs, processes them, generates resumes with retry logic (max 3 retries)
  - **Cron Worker** (`workers/cron/`): Polls DB every 5 minutes for active cronjobs, schedules with node-cron, fires prompt to `/api/chat-sync` on schedule
- Communication: HTTP POST to main app endpoints
- Depends on: Main app HTTP server, Database layer
- Used by: External systems (Telegram), scheduler

**Library/Utility Layer:**
- Purpose: Shared constants and query client setup
- Location: `src/lib/`
- Contains:
  - `conversation-sources.ts`: Source enum (CRONJOB, TELEGRAM)
  - `job-constants.ts`: Job status enum and types
  - `queryClient.ts`: TanStack Query client configuration
- Used by: Services, routes, components

## Data Flow

**Chat Flow (Browser UI):**

1. User types message in `Chat.tsx`
2. `useChat()` from `@tanstack/ai-react` sends POST to `/api/chat` with `{ messages, conversationId }`
3. `/api/chat` handler calls `buildChatOptions()` to configure agent with all tools
4. `chat()` function executes agent loop (max 10 iterations) with streaming response
5. `toHttpResponse()` converts stream to HTTP response
6. Chat component displays streamed response with thinking/tool-call/tool-result parts
7. On status change to `ready`, `saveConversation()` POST to `/api/conversations` for persistence

**Gateway Flow (Telegram):**

1. Telegram provider polls `getUpdates()` and filters for bot mentions
2. Routes message to `handleMessage()` in gateway/handler
3. Sends POST to `/api/chat-sync` with `{ messages, source: 'telegram', chatId, userId }`
4. `/api/chat-sync` handler:
   - Retrieves open conversation by `chatId` from DB
   - Merges previous messages from DB with incoming message
   - Calls LLM with `GATEWAY_SYSTEM_PROMPT` to decide action (`continue` | `new_conversation` | `close_conversation`)
   - Parses JSON response from LLM
   - Updates/creates/closes conversation based on action
   - Returns response text to gateway worker
5. Gateway sends response back to Telegram chat

**Cronjob Flow:**

1. Cron worker polls DB every 5 minutes, loads active cronjobs
2. Uses `node-cron` to schedule based on `cronExpression`
3. When scheduled time fires, calls `runCronjob()`
4. POSTs to `/api/chat-sync` with `{ messages: [prompt], source: 'cronjob' }`
5. `/api/chat-sync` processes without persisting conversation (skips `saveConversationToDb` for CRONJOB source)
6. Result inserted into `cronjobLogs`, `cronjobs.lastRunAt` and `lastResult` updated

**Jobs Processing Flow:**

1. Jobs worker polls every 30s for `new` status jobs
2. Calls `processNextNewJob()` from `process-job.ts`:
   - Transactional claim (FOR UPDATE SKIP LOCKED) to prevent duplicate processing
   - Extracts job data via LLM using `ExtractionSchema`
   - Updates job to `processed` status with extracted fields
3. Next tick processes `processed` jobs via `generateResumeForNextProcessedJob()`:
   - Transitions to `resume_generated`
   - Generates resume/cover letter files
4. Failure handling: increments `retryCount`, resets status to original, marks `failed` after 3 retries

**State Management:**

- Conversations: LLM decides flow via `GATEWAY_SYSTEM_PROMPT` for gateways; browser manages via react state
- Jobs: Worker-managed state machine (new → processed → resume_generated → applied/rejected/etc)
- Cronjobs: Always-running scheduled tasks managed by node-cron in memory; DB source of truth for state/config

## Key Abstractions

**Chat Message Model:**

```typescript
// src/routes/api/chat.tsx, src/routes/api/chat-sync.tsx
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Stored in DB with JSONB parts
interface MessagePart {
  type: 'text' | 'thinking' | 'tool-call' | 'tool-result';
  content: string;
  [key: string]: unknown;
}
```

**Tool Definition:**

```typescript
// src/tools/crontool.ts, src/tools/mcp.ts
toolDefinition({
  name: string;
  description: string;
  inputSchema: z.ZodObject;
}).server(async (input: unknown) => Result)
```

**Cronjob Execution Log:**

```typescript
// src/db/schema.ts
cronjobLogs: {
  cronjobId, status, result, error, durationMs, ranAt
}
```

**Job Status Lifecycle:**

```typescript
// src/lib/job-constants.ts
'new' → 'processed' → 'resume_generated' → 'applied' | 'rejected' | ... | 'failed'
```

## Entry Points

**Web Server:**
- Location: `src/routes/__root.tsx` + `src/router.tsx`
- Triggers: `pnpm dev` (dev) or production deployment
- Responsibilities: Initialize React root, TanStack Router, QueryClientProvider, DevTools

**Chat UI:**
- Location: `src/routes/index.tsx`
- Triggers: GET `/`
- Responsibilities: Render Chat component

**Streaming Chat API:**
- Location: `src/routes/api/chat.tsx`
- Triggers: POST `/api/chat` with `{ messages, conversationId }`
- Responsibilities: Build chat options, execute agent loop with streaming, return HTTP stream

**Sync Chat API (Gateway/Cron):**
- Location: `src/routes/api/chat-sync.tsx`
- Triggers: POST `/api/chat-sync` from workers or cron
- Responsibilities: Handle two flows (gateway with conversation state, non-gateway with optional persistence)

**Gateway Worker:**
- Location: `workers/gateway/index.ts`
- Triggers: `pnpm gateway` or `pnpm gateway:dev`
- Responsibilities: Initialize provider(s), listen for messages, call API, send responses

**Jobs Worker:**
- Location: `workers/jobs/index.ts`
- Triggers: `pnpm jobs` or `pnpm jobs:dev`
- Responsibilities: Polling loop, claim and process jobs, manage retries, exit on SIGTERM

**Cron Worker:**
- Location: `workers/cron/index.ts`
- Triggers: `pnpm cron` or `pnpm cron:dev`
- Responsibilities: Sync cronjobs from DB, schedule with node-cron, fire on schedule

**Conversation Collection API:**
- Location: `src/routes/api/conversations/index.tsx`
- Triggers: GET/POST `/api/conversations`
- Responsibilities: List all conversations, POST to save/upsert conversation with messages

**Jobs Collection API:**
- Location: `src/routes/api/jobs/index.tsx`
- Triggers: GET/POST `/api/jobs`
- Responsibilities: List/filter jobs by status or search, POST to create new job

## Error Handling

**Strategy:** Layered error handling with specific error classes and retry logic

**Patterns:**

1. **Job Processing Errors** (`src/services/process-job.ts`):
   ```typescript
   class JobProcessingError extends Error {
     constructor(public jobId: string, cause: unknown) { ... }
   }
   ```
   - Caught in worker, increments retryCount
   - After 3 retries, status set to `failed` with errorMessage

2. **Resume Generation Errors** (`src/services/generate-resume.ts`):
   - Similar pattern with `ResumeGenerationError`
   - Resets status to `processed`, logs error

3. **API Route Errors** (`src/routes/api/chat.tsx`, `src/routes/api/chat-sync.tsx`):
   ```typescript
   try {
     // operation
   } catch (error) {
     return new Response(JSON.stringify({ error: message }), { status: 500 })
   }
   ```

4. **Tool Execution Errors** (`src/tools/mcp.ts`, `src/tools/crontool.ts`):
   - MCP tool errors logged, empty array returned on client connection failure
   - Crontool errors propagate to agent loop for handling

5. **Worker Graceful Shutdown**:
   - SIGINT/SIGTERM handlers set flags to stop accepting work
   - Jobs worker finishes current job before exit
   - Cron worker stops all scheduled tasks

## Cross-Cutting Concerns

**Logging:**
- Approach: Console-based with `console.log()` and `console.error()`
- Prefixes: `[chat-sync]`, `[cron]`, `[worker]`, `[gateway]`, `[MCP]` for context
- No centralized logging framework; suitable for development and containerized environments

**Validation:**
- Request/response validation via Zod schemas
- Example: `ExtractionSchema` in `process-job.ts` ensures structured LLM output
- Tool inputs validated by TanStack AI before tool execution

**Authentication:**
- No application-level auth (assumed to run in trusted environment or behind proxy)
- Telegram gateway validates messages via `TELEGRAM_BOT_TOKEN` (handled by provider)
- Internal APIs unprotected; worker communication via localhost/internal network

**Conversation Source Tracking:**
- All conversations tagged with `source` (e.g., 'telegram', 'cronjob', browser UI defaults to null)
- Used to determine persistence behavior (cronjobs not persisted unless explicitly saved)
- Enables filtering and analytics across different interaction channels

**Transaction Safety:**
- Jobs worker uses `db.transaction()` with `FOR UPDATE SKIP LOCKED` to prevent race conditions
- Conversation API uses `db.transaction()` for atomic upsert and message delete/insert
- Ensures worker multi-process safety and conversation consistency
