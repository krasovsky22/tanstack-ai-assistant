# Testing Patterns

**Analysis Date:** 2026-03-04

## Test Framework

**Runner:**
- Vitest 3.0.5
- Config: Not explicitly present; uses Vite config with implicit Vitest defaults
- Command: `pnpm test` (runs `vitest run`)

**Assertion Library:**
- Testing Library DOM (`@testing-library/dom`)
- Testing Library React (`@testing-library/react`)
- Vitest assertions (built-in expect)

**Run Commands:**
```bash
pnpm test              # Run all tests once
pnpm vitest run <path> # Run single test file
```

## Test File Organization

**Current State:**
- **No test files found in src/** — codebase has zero test coverage
- Tests would be organized in the same directory structure as source if added
- Test files would use `.test.ts` or `.test.tsx` extension based on Vitest convention

**Location Strategy (Recommended):**
- Co-located with source files: `src/services/chat.test.ts` next to `src/services/chat.ts`
- Routes: `src/routes/api/chat.test.tsx` next to `src/routes/api/chat.tsx`
- Components: `src/components/Chat.test.tsx` next to `src/components/Chat.tsx`
- Utilities: `src/lib/job-constants.test.ts` next to `src/lib/job-constants.ts`

**Naming:**
- `*.test.ts` for services and utilities
- `*.test.tsx` for React components
- Descriptive test names: `chat.test.ts`, `process-job.test.ts`, `Chat.test.tsx`

## Test Framework Configuration

**Vitest Setup:**
```bash
# Installed dependencies for testing
- vitest@3.0.5
- @testing-library/react@16.2.0
- @testing-library/dom@10.4.0
- jsdom@27.0.0
```

**Environment:**
- jsdom used as test environment (for DOM simulation)
- React 19.2.0 available for testing
- No test setup files configured (none found in codebase)

## Testing Priority Areas

Based on codebase structure, these areas should be prioritized for test coverage:

### High Priority

**Service Layer (`src/services/`):**
- `chat.ts` — Core functions: `buildChatOptions()`, `saveConversationToDb()`, `appendMessagesToConversation()`, `getOpenConversationByChatId()`, `closeConversation()`
- `process-job.ts` — Job extraction and processing logic; custom `JobProcessingError` class
- `generate-resume.ts` — Resume generation pipeline; custom `ResumeGenerationError` class

**API Routes (`src/routes/api/`):**
- `chat.tsx` — POST handler for streaming chat
- `chat-sync.tsx` — Synchronous JSON POST; conversation state management logic (complex flow)
- `conversations/index.tsx` — Conversation CRUD operations
- `jobs/process.tsx`, `jobs/generate-resume.tsx` — Job processing endpoints

### Medium Priority

**Tools (`src/tools/`):**
- `crontool.ts` — 4 LLM-callable tool definitions; input schemas with Zod
- `mcp.ts` — Docker MCP Gateway integration; dynamic tool loading

**Components (`src/components/`):**
- `Chat.tsx` — Complex state management with useChat hook; message rendering and formatting
- `Header.tsx`, `Badge.tsx` — Simple components with UI logic

### Lower Priority

**Database/Config:**
- `src/db/schema.ts` — Schema definitions (tested implicitly through integration tests)
- `src/lib/job-constants.ts` — Constants (low risk)
- Routes (pages) — UI-heavy, lower priority unless critical workflows

## Recommended Test Patterns

### Unit Test Pattern

For services with side effects (DB, LLM calls):
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveConversationToDb, buildChatOptions } from '@/services/chat';

describe('chat service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should build chat options with all tools', async () => {
    const messages = [{ role: 'user', content: 'Hello' }];
    const options = await buildChatOptions(messages);

    expect(options).toHaveProperty('adapter');
    expect(options).toHaveProperty('tools');
    expect(options.agentLoopStrategy).toBeDefined();
  });

  it('should handle missing OPENAI_API_KEY gracefully', async () => {
    // Mock environment
    // Test error handling
  });
});
```

### Mocking Pattern

**What to Mock:**
- Database calls (`@/db`)
- LLM calls (`@tanstack/ai`)
- External APIs (MCP Gateway, file system)
- Environment variables

**What NOT to Mock:**
- Zod validation (test actual validation)
- Error classes (test instanceof checks)
- Local business logic

**Example Mock Setup:**
```typescript
import { vi } from 'vitest';

// Mock the db module
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  }
}));

// Mock environment
process.env.OPENAI_API_KEY = 'test-key';
```

## Fixtures and Factories

**Test Data Patterns (Recommended):**

Create `src/__fixtures__/` directory with factory functions:
```typescript
// src/__fixtures__/jobs.ts
export function createTestJob(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    title: 'Test Job',
    company: 'Test Corp',
    description: 'Test description',
    status: 'new',
    ...overrides,
  };
}

// src/__fixtures__/conversations.ts
export function createTestConversation(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    title: 'Test Conversation',
    source: null,
    chatId: 'test-chat-123',
    ...overrides,
  };
}
```

**Location:** `src/__fixtures__/` or co-located as `chat.fixtures.ts`

## Common Testing Patterns to Implement

### Async Testing
```typescript
it('should fetch and save conversation', async () => {
  const result = await getOpenConversationByChatId('test-chat');
  expect(result).toBeDefined();
});
```

### Error Testing
```typescript
it('should throw JobProcessingError with jobId', async () => {
  try {
    await processNextNewJob();
    expect.fail('Should have thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(JobProcessingError);
    expect(err.jobId).toBe('test-id');
  }
});
```

### React Component Testing
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should render chat and handle submit', async () => {
  const user = userEvent.setup();
  render(<Chat conversationId="test" />);

  const input = screen.getByPlaceholderText('Type a message...');
  await user.type(input, 'Hello');
  await user.click(screen.getByRole('button', { name: /send/i }));

  expect(input).toHaveValue('');
});
```

### Tool Definition Testing
```typescript
import { getCronjobTools } from '@/tools/crontool';

it('should define all cronjob tools', async () => {
  const tools = getCronjobTools();
  const names = tools.map(t => t.name);

  expect(names).toContain('list_cronjobs');
  expect(names).toContain('create_cronjob');
  expect(names).toContain('update_cronjob');
  expect(names).toContain('delete_cronjob');
});
```

## Coverage

**Requirements:** None enforced (no coverage threshold in place)

**View Coverage (Recommended Setup):**
```bash
vitest run --coverage
```

**Coverage Config (to add to vite.config.ts):**
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/routeTree.gen.ts']
    }
  }
});
```

**Current Gaps:**
- All services and utilities have zero coverage
- API routes untested (critical for data flow)
- No integration tests for DB operations
- Component rendering untested

## Test Types

**Unit Tests:**
- Scope: Individual functions and error handling
- Approach: Mock DB, LLM, environment
- Examples: `buildChatOptions()`, `extractJobData()`, tool definitions
- Isolated logic testing without side effects

**Integration Tests:**
- Scope: Service-to-DB interactions, tool execution
- Approach: Real database (or in-memory), mock LLM
- Examples: `saveConversationToDb()` → query to verify, error handling in jobs
- Test data flow between layers

**E2E Tests:**
- Framework: Not currently in use
- Would test: Full chat flow, job processing pipeline, cronjob execution
- Setup: Playwright or Cypress (not in package.json)
- Status: Not implemented

## Test Execution in CI/CD

**Current Setup:**
- Tests can be run with `pnpm test`
- No CI pipeline configured (no .github/workflows)
- Database tests would need PostgreSQL running

**Recommended CI Setup:**
```yaml
# .github/workflows/test.yml
- name: Run tests
  run: pnpm test

- name: Generate coverage
  run: pnpm test -- --coverage
```

---

*Testing analysis: 2026-03-04*
