# Coding Conventions

**Analysis Date:** 2026-03-04

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `Chat.tsx`, `Badge.tsx`)
- Services: kebab-case (e.g., `chat.ts`, `process-job.ts`, `generate-resume.ts`)
- Routes: file-based routing with kebab-case or `$id` for dynamic segments (e.g., `/cronjobs/$id/logs.tsx`)
- Database: snake_case columns mapped from camelCase in ORM (e.g., `cronExpression` → `cron_expression`)
- Config files: kebab-case (e.g., `tsconfig.json`, `vite.config.ts`)

**Functions:**
- camelCase for all function names
- Async functions are named clearly with action verbs: `buildChatOptions()`, `processNextNewJob()`, `generateResumeForNextProcessedJob()`
- Helper/utility functions use descriptive names: `markdownToPdf()`, `prettifyJsonString()`, `formatToolCallState()`
- Event handlers prefixed with `handle`: `handleSubmit()`, `handleJobFailure()`

**Variables:**
- camelCase for local variables and constants
- UPPER_SNAKE_CASE for numeric constants: `POLL_INTERVAL_MS`, `MAX_RETRIES`, `CHROME_PATH`, `SYNC_INTERVAL_MS`
- `use*` prefix for React hooks: `useChat()`, `useQuery()`, `useMutation()`
- Descriptive names for collections: `scheduledTasks`, `updateFields`, `messages`

**Types:**
- PascalCase for interfaces and types: `ChatProps`, `BadgeProps`, `MessageToSave`, `JobProcessingError`
- Union types use camelCase strings: `'awaiting-input'`, `'input-streaming'`, `'input-complete'`
- Database models use `$inferSelect` for type inference: `typeof jobs.$inferSelect`

## Code Style

**Formatting:**
- No explicit formatter configured in repo (no eslint, prettier, or biome config)
- Consistent spacing: 2-space indentation observed throughout
- Import organization: framework imports at top, then local imports
- Max line length: observed ~100-110 characters
- Ternary operators preferred for simple conditionals
- Explicit boolean checks: `if (condition)` not `if (condition > 0)`

**Linting:**
- TypeScript strict mode enabled (`strict: true` in tsconfig.json)
- `noUnusedLocals: true` and `noUnusedParameters: true` enforced
- `noFallthroughCasesInSwitch: true` required
- ESLint disable comments used sparingly for specific issues:
  - `// eslint-disable-next-line @typescript-eslint/no-explicit-any` in `src/services/chat.ts:5`
  - `// eslint-disable-next-line react-hooks/exhaustive-deps` in `src/components/Chat.tsx:71`

## Import Organization

**Order:**
1. Framework/library imports (React, TanStack, external libraries)
2. Database imports (`@/db`, drizzle-orm utilities)
3. Schema/type imports (`@/db/schema`)
4. Local service imports (`@/services`, `@/tools`, `@/lib`)
5. Component imports (`@/components`)

**Example from `src/services/generate-resume.ts`:**
```typescript
import { chat } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';
import { z } from 'zod';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { marked } from 'marked';
import puppeteer from 'puppeteer-core';
import { db } from '@/db';
import { jobs } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
```

**Path Aliases:**
- `@/*` resolves to `./src/*` (TypeScript/Vite)
- `#/*` resolves to `./src/*` (package.json imports)
- Prefer `@/` for clarity in most code

## Error Handling

**Patterns:**
- Custom Error classes extend Error with public properties for context:
  ```typescript
  export class JobProcessingError extends Error {
    constructor(public readonly jobId: string, cause: unknown) {
      super(`Job ${jobId} processing failed`);
      this.cause = cause;
    }
  }
  ```
- Instanceof checks to handle specific error types: `if (err instanceof JobProcessingError)`
- Fallback error messages: `err instanceof Error ? err.message : String(err)`
- Error logging includes context: `[module-name] message`

**Error Response Pattern (Routes):**
```typescript
return new Response(
  JSON.stringify({ error: 'Message' }),
  { status: 500, headers: { 'Content-Type': 'application/json' } }
);
```

## Logging

**Framework:** console (no dedicated logger library)

**Patterns:**
- Console methods used: `console.log()`, `console.error()`, `console.warn()`
- Namespace prefix in brackets: `[service-name]` or `[worker]`
- Examples from codebase:
  - `console.log('[worker] Processed job ${job.id} → status: ${job.status}')`
  - `console.error('[process-job] Error:', err)`
  - `console.log('[generate-resume] Reading resume from', resumeFilePath)`
  - `console.log('[cron] Firing job "${job.name}" (${job.id})')`
  - `console.log('Recieved Request', messages, title)` (non-prefixed, informal)

**Logging Guidelines:**
- Use in workers and background processes (jobs, cron, gateway)
- Include timestamp context when relevant (e.g., `durationMs`, `startTime`)
- Log state transitions: `status: 'new'` → `status: 'processed'`
- Log errors with full context (jobId, cronjobId, etc.)

## Comments

**When to Comment:**
- Algorithm explanation: "When stream completes, parse the last assistant message as a JSON array"
- Workflow steps: "// Phase 1: process a 'new' job"
- Section headers: "// ─── Dynamic imports AFTER env vars are set ───────────────────"
- Clarify non-obvious decisions: "// Strip markdown code fences if present"
- Minimal inline comments; code should be self-documenting

**JSDoc/TSDoc:**
- Not observed in codebase; limited to function parameter descriptions in Zod schemas
- Zod descriptions used extensively: `.describe('Human-readable description')`

## Function Design

**Size:**
- Functions kept reasonably small (10-40 lines typical)
- Complex operations broken into async phases (e.g., `extractJobData()` → `saveJobToDb()` → `processJob()`)

**Parameters:**
- Destructuring used for config objects: `{ request }` in route handlers
- Optional parameters with defaults: `source: string | null = null`
- Zod for runtime validation of API inputs

**Return Values:**
- Explicit return types in async functions
- Promise<void> for side-effect-only operations
- Null coalescing for fallbacks: `rows[0] ?? null`
- Map/filter patterns for transformations

## Module Design

**Exports:**
- Named exports preferred: `export function buildChatOptions()`, `export class JobProcessingError`
- Barrel file pattern in `src/tools/index.ts`:
  ```typescript
  export { getMcpToolDefinitions } from './mcp';
  export { getCronjobTools } from './crontool';
  ```

**Barrel Files:**
- Used in `src/tools/index.ts` to simplify imports
- Reduces circular dependency risk
- Clear public API

## Async/Await Patterns

- Top-level await used in workers: `const { db } = await import('@/db')`
- Dynamic imports to control initialization order (especially in workers before env setup)
- Promise.all() for parallel operations: `await Promise.all([getMcpToolDefinitions(), Promise.resolve(getCronjobTools())])`
- Error handling with try-catch or instanceof checks

## TypeScript Conventions

- Explicit type annotations for function parameters and return types
- Inline union types for simple variants: `type GatewayAction = 'continue' | 'new_conversation' | 'close_conversation'`
- Database type inference: `job: typeof jobs.$inferSelect`
- React component props as interface: `interface ChatProps { conversationId?: string; initialMessages?: Array<UIMessage>; }`

---

*Convention analysis: 2026-03-04*
