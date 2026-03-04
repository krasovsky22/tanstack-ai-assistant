# Phase 1: Yahoo Mail Ingestion & Job Email Tracking - Research

**Researched:** 2026-03-04 (refreshed 2026-03-04)
**Domain:** IMAP email ingestion, LLM classification/extraction, Drizzle schema, TanStack Start API routes, React Query UI
**Confidence:** HIGH

## Summary

This phase adds Yahoo Mail IMAP ingestion to an existing TanStack Start + Drizzle ORM + OpenAI stack. The core work is: (1) a new `imapflow` + `mailparser` service that fetches unread emails from configurable folders, (2) LLM classification using the existing `chat()` + Zod pattern from `process-job.ts`, (3) job matching via Drizzle `ilike` queries + auto-creation of `'generated-from-email'` jobs, (4) a new `job_emails` Drizzle table (migration 0008), and (5) UI additions — a mail count badge on `JobCard` and a collapsible email thread on the job detail page.

**Current codebase state (confirmed 2026-03-04):** The `job_emails` table does not yet exist in `src/db/schema.ts`. The `imapflow` and `mailparser` packages are not yet installed. No `src/routes/api/mail/` directory exists. No `src/services/mail-ingestion.ts` exists. The last migration is `0007_add_cronjob_logs_table.sql`. The next migration is `0008_add_job_emails_table.sql`. The `JOB_STATUSES` constant in `src/lib/job-constants.ts` does not yet include `'generated-from-email'`. Neither `STATUS_LABELS` in `index.tsx` nor `STATUS_LABELS` in `$id.tsx` includes it. The project already has every infrastructure building block needed: the API route pattern (`createFileRoute` with `server.handlers`), the LLM extraction pattern (Zod schema + `chat()` from `@tanstack/ai`), the React Query data-fetching pattern (`useQuery`), the collapsible UI pattern (ChevronDown/Up toggle), and the migration pattern (hand-written SQL + Drizzle schema). No new architectural concepts are introduced.

**Primary recommendation:** Use `imapflow@^1.2.9` for IMAP and `mailparser` (from `nodemailer` ecosystem) for decoding raw RFC822 streams. Follow the `process-job.ts` pattern for LLM calls.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Email ingestion trigger**
- Manual API endpoint: `POST /api/mail/ingest` — no background worker, called on demand
- Separate read-only endpoint: `GET /api/mail/emails` — returns raw Yahoo emails without any processing or DB writes
- Only fetch emails received in the last 10 days (hardcoded lookback window, do not go further back)
- Max emails per call configurable via `YAHOO_MAIL_MAX_EMAILS` env var
- Folders to poll configurable via `YAHOO_MAIL_FOLDERS` env var (comma-separated, e.g. `"INBOX,Jobs,Recruiters"`)
- After processing, mark emails as read on Yahoo to prevent re-processing

**Ingestion response**
- `POST /api/mail/ingest` returns a detailed JSON summary: emails fetched, how many were job-related, how many matched existing jobs, how many new jobs were auto-created

**Job matching strategy**
- LLM extracts company name + job title from email body/subject
- DB text search for matching job by company + title
- Multiple matches → pick the most recently created job
- Non-job emails (LLM determines not job-related) → skip entirely, still mark as read on Yahoo, nothing stored in DB

**Auto-created jobs (no match found)**
- Status: `'generated-from-email'`
- LLM does full extraction: title, company, description, skills, job location
- Source: `'email'`

**job_emails table columns**
- `id` (uuid, PK)
- `job_id` (uuid, FK → jobs, nullable for edge cases)
- `source` (text) — e.g. `'yahoo'`, `'gmail'`
- `email_content` (text) — raw email body
- `email_llm_summarized` (text) — LLM-generated summary
- `subject` (text)
- `sender` (text)
- `received_at` (timestamp)
- `created_at` (timestamp)

**Dashboard mail badge**
- Shown on each `JobCard` next to the job title/company name (inline with header)
- Displays email count with mail icon: ✉ 3
- Email count fetched via a separate API call per job (not included in the `/api/jobs` list response)
- Badge only appears if count > 0

**Mail conversation box (job detail page)**
- Collapsible section at the bottom of the job detail/edit page
- Emails threaded by subject, sorted by `received_at` desc
- Default view: shows `email_llm_summarized` for each email
- "Show full email" toggle per email to expand and load raw `email_content` on demand
- View only — no reply capability in this phase

### Claude's Discretion
- IMAP library choice (e.g. `imapflow`, `node-imap`, `imap-simple`)
- Exact LLM prompt design for classification and extraction
- Threading logic implementation (group by subject normalization — strip Re:/Fwd: prefixes)
- Loading state while fetching email count per job card

### Deferred Ideas (OUT OF SCOPE)
- Gmail and other email provider integrations — future phases (schema already supports via `source` column)
- Reply/send email from within the app — future phase
- Email notification/alert when new job email arrives — future phase
</user_constraints>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `imapflow` | ^1.2.9 | IMAP client — connect, search, fetch, mark-as-read | Modern async/await API; actively maintained (~42k weekly downloads); used by EmailEngine in production; ships its own TypeScript definitions |
| `mailparser` | latest (part of `nodemailer` ecosystem) | Parse RFC822 email stream into structured object (text, html, from, subject, date) | Official nodemailer extra; `simpleParser` accepts imapflow download stream directly; handles MIME, encodings, attachments automatically |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `drizzle-orm` (already installed) | ^0.45.1 | `ilike` for company+title fuzzy match; insert `job_emails`; FK to `jobs` | All DB work |
| `@tanstack/ai` + `@tanstack/ai-openai` (already installed) | ^0.5.x | LLM classification and extraction via `chat()` + Zod schema | Classification step and email summarization |
| `zod` (already installed) | ^4.3.6 | Output schema for LLM calls | Same pattern as `process-job.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `imapflow` | `node-imap` (mscdex) | `node-imap` is callback-based, unmaintained since 2019, requires manual MIME parsing. `imapflow` is async/await native and actively maintained. |
| `imapflow` | `imap-simple` | Thin wrapper around `node-imap`; same underlying problems. |
| `mailparser` | Manual `bodyParts` fetch + charset decode | `imapflow`'s `download(uid, null)` + `simpleParser(stream)` is 2 lines vs. complex MIME tree walking. |

**Installation:**
```bash
pnpm add imapflow mailparser
pnpm add -D @types/mailparser
```

Note: `imapflow` ships its own TypeScript definitions; `@types/mailparser` provides types for the `mailparser` package.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   └── mail-ingestion.ts     # IMAP connect/fetch/classify/persist — all business logic here
├── routes/api/mail/
│   ├── ingest.tsx             # POST /api/mail/ingest — triggers ingestion, returns summary
│   ├── emails.tsx             # GET /api/mail/emails — returns raw Yahoo emails (no DB)
│   ├── email-count.tsx        # GET /api/mail/email-count?jobId=... — returns {count: N}
│   └── emails-by-job.tsx      # GET /api/mail/emails-by-job?jobId=... — email thread for detail page
├── db/
│   ├── schema.ts              # Add jobEmails table (after cronjobLogs)
│   └── migrations/
│       └── 0008_add_job_emails_table.sql
└── .env.example               # Add YAHOO_IMAP_* vars after the Telegram section
```

### Pattern 1: IMAP Connect → Search → Fetch → Parse → Disconnect
**What:** Open a single `ImapFlow` client per ingestion call, lock the mailbox, do all operations, then logout. Never keep a persistent connection — this is an on-demand endpoint.
**When to use:** Every call to `POST /api/mail/ingest`

```typescript
// Source: https://imapflow.com/docs/getting-started/quick-start/
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const client = new ImapFlow({
  host: 'imap.mail.yahoo.com',
  port: 993,
  secure: true,
  auth: {
    user: process.env.YAHOO_IMAP_USER!,
    pass: process.env.YAHOO_IMAP_PASSWORD!,
  },
  logger: false, // suppress verbose IMAP logging
});

await client.connect();
const lock = await client.getMailboxLock('INBOX');
try {
  const since = new Date();
  since.setDate(since.getDate() - 10);

  // Search for unseen messages in last 10 days
  const uids = await client.search({ seen: false, since }, { uid: true });

  for (const uid of uids) {
    const { content } = await client.download(String(uid), null, { uid: true });
    const parsed = await simpleParser(content);
    // parsed.subject, parsed.from?.text, parsed.text, parsed.html, parsed.date
  }

  // Mark all fetched uids as seen
  if (uids.length > 0) {
    await client.messageFlagsAdd(uids, ['\\Seen'], { uid: true });
  }
} finally {
  lock.release();
  await client.logout();
}
```

### Pattern 2: Multi-Folder Iteration
**What:** Parse `YAHOO_MAIL_FOLDERS` env var, iterate each folder with its own lock.
**When to use:** When `YAHOO_MAIL_FOLDERS=INBOX,Jobs,Recruiters`

```typescript
// Source: verified with imapflow docs
const folders = (process.env.YAHOO_MAIL_FOLDERS ?? 'INBOX').split(',').map(f => f.trim());
for (const folder of folders) {
  const lock = await client.getMailboxLock(folder);
  try {
    // ... search + fetch + mark-as-read per folder
  } finally {
    lock.release();
  }
}
```

### Pattern 3: LLM Classification (follows existing process-job.ts pattern)
**What:** Two separate LLM calls — (1) classify + extract company/title/summary, (2) full job data extraction for auto-create. Use `chat()` with Zod output schema.
**When to use:** After parsing each email

```typescript
// Source: follows src/services/process-job.ts pattern exactly
import { chat } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';
import { z } from 'zod';

const EmailClassificationSchema = z.object({
  isJobRelated: z.boolean().describe('Is this email job-related (recruiter outreach, job application update, interview invite, offer, rejection)?'),
  company: z.string().nullable().describe('Company name if detectable'),
  jobTitle: z.string().nullable().describe('Job title if detectable'),
  summary: z.string().describe('1-3 sentence summary of the email content'),
});

const result = await chat({
  adapter: openaiText('gpt-5.2'),
  messages: [{ role: 'user', content: `Subject: ${subject}\n\n${bodyText}` }],
  systemPrompts: ['You are an email classifier for a job search assistant. Classify emails and extract structured information.'],
  outputSchema: EmailClassificationSchema,
});
```

### Pattern 4: Job Matching with ilike
**What:** Search jobs table by company + title using `ilike`, pick most recent if multiple matches.
**When to use:** After LLM extraction confirms `isJobRelated: true` and extracts company + title

```typescript
// Source: existing pattern from src/routes/api/jobs/index.tsx
import { ilike, and, desc } from 'drizzle-orm';

const matches = await db
  .select()
  .from(jobs)
  .where(
    and(
      ilike(jobs.company, `%${company}%`),
      ilike(jobs.title, `%${title}%`)
    )
  )
  .orderBy(desc(jobs.createdAt))
  .limit(1);

const matchedJob = matches[0] ?? null;
```

### Pattern 5: API Route Handler (TanStack Start)
**What:** Use `createFileRoute` with `server.handlers` — the established pattern in this codebase.
**When to use:** Both `/api/mail/ingest` (POST) and `/api/mail/emails` (GET)

```typescript
// Source: src/routes/api/jobs/process.tsx — established project pattern
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/mail/ingest')({
  server: {
    handlers: {
      POST: async ({ request: _request }) => {
        const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;
        try {
          const summary = await runIngestion(); // from mail-ingestion.ts
          return new Response(JSON.stringify(summary), { headers: JSON_HEADERS });
        } catch (err) {
          console.error('[mail-ingest] Error:', err);
          const error = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ error }), { status: 500, headers: JSON_HEADERS });
        }
      },
    },
  },
});
```

### Pattern 6: Drizzle Schema for job_emails
**What:** Follow the same `pgTable()` pattern with uuid PK, FK to jobs, text columns, timestamp.
**When to use:** Appended after `cronjobLogs` table in `src/db/schema.ts` (migration 0008)

```typescript
// Source: follows src/db/schema.ts existing pattern
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { jobs } from './schema';

export const jobEmails = pgTable('job_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  source: text('source').notNull(), // 'yahoo', 'gmail', etc.
  emailContent: text('email_content').notNull(),
  emailLlmSummarized: text('email_llm_summarized').notNull(),
  subject: text('subject').notNull(),
  sender: text('sender').notNull(),
  receivedAt: timestamp('received_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

Note: The `pgTable` import is already present in `src/db/schema.ts` — no new imports needed beyond the column types already imported (`uuid`, `text`, `timestamp` are all already there).

### Pattern 7: Mail Badge on JobCard (React Query per-job)
**What:** `useQuery` per job card fetching `GET /api/mail/email-count?jobId=xxx`, show `Mail` icon + count inline only if count > 0.
**When to use:** Inside `JobCard` component in `src/routes/jobs/index.tsx`

Confirmed from codebase inspection:
- `useQuery` is already imported from `@tanstack/react-query` in `index.tsx`
- `Mail` icon needs to be added to the existing lucide-react import line (currently: `Trash2, ChevronDown, ChevronUp, Plus, Pencil, Zap, X, FileText`)
- `STATUS_LABELS` and `STATUS_COLORS` are plain `Record<string, string>` objects (not typed enums) — easy to extend

```typescript
// Source: follows useQuery pattern in src/routes/jobs/index.tsx
import { useQuery } from '@tanstack/react-query';
import { Mail } from 'lucide-react';

// Inside JobCard:
const { data: emailCountData } = useQuery({
  queryKey: ['email-count', job.id],
  queryFn: async () => {
    const res = await fetch(`/api/mail/email-count?jobId=${job.id}`);
    return res.json() as Promise<{ count: number }>;
  },
  staleTime: 60_000,
  initialData: { count: 0 },
});
const emailCount = emailCountData?.count ?? 0;

// In JSX, inside the title area flex row (after <StatusBadge status={job.status} />):
{emailCount > 0 && (
  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
    <Mail size={12} />
    {emailCount}
  </span>
)}
```

### Pattern 8: Collapsible Email Thread on Detail Page
**What:** A `border-t` section at the bottom of `EditJobPage`, same ChevronDown/Up toggle as the `JobCard` Job Description section. Threads by normalized subject (strip `Re:`, `Fwd:` prefixes). Each email defaults to showing `email_llm_summarized`; "Show full email" toggle reveals `email_content`.
**When to use:** In `src/routes/jobs/$id.tsx`

Confirmed from codebase inspection:
- `src/routes/jobs/$id.tsx` currently only imports `X` from `lucide-react` — needs `ChevronDown`, `ChevronUp`, `Mail` added
- `useQuery` is NOT currently imported in `$id.tsx` — needs to be added from `@tanstack/react-query`
- `useState` IS imported (`useState, useRef` from `react`)
- `STATUS_LABELS` in `$id.tsx` is a plain `Record<string, string>` — does not include `resume_generated` or `failed` (different subset than `index.tsx`) — add `'generated-from-email': 'From Email'` only

**Subject normalization for threading:**
```typescript
// Strip Re: / Fwd: prefixes for grouping (handles chained prefixes)
export function normalizeSubject(subject: string): string {
  let s = subject;
  let prev: string;
  do {
    prev = s;
    s = s.replace(/^(re|fwd|fw)\s*:\s*/i, '').trim();
  } while (s !== prev);
  return s.toLowerCase();
}
```

### Pattern 9: STATUS_LABELS / STATUS_COLORS Extensions
**What:** Both `index.tsx` and `$id.tsx` maintain their own `STATUS_LABELS` records. Auto-created email jobs need `'generated-from-email'` to display as `'From Email'`.

From `index.tsx` inspection — current STATUS_COLORS does NOT include `failed` (despite `JOB_STATUSES` having it). The fallback `bg-gray-100 text-gray-700` handles unknown statuses. Still, add both label and color for `generated-from-email`:

```typescript
// In index.tsx STATUS_LABELS — add:
'generated-from-email': 'From Email',

// In index.tsx STATUS_COLORS — add:
'generated-from-email': 'bg-orange-100 text-orange-700',

// In $id.tsx STATUS_LABELS — add:
'generated-from-email': 'From Email',
```

### Anti-Patterns to Avoid
- **Keeping IMAP connection open between requests:** This is on-demand ingestion — open, operate, close per call. Persistent connections cause Yahoo IMAP timeouts.
- **Fetching emails without the 10-day `since` filter:** Could pull months of old mail; the CONTEXT.md hard-codes the 10-day window.
- **Including email count in the jobs list API response:** Decision: separate per-job API call, not bundled in `/api/jobs` response. This keeps the jobs endpoint fast.
- **Using `node-imap` (the old `imap` npm package):** Callback-based, unmaintained, requires separate MIME parser wiring.
- **Storing non-job emails:** LLM says not job-related → skip + mark as read → nothing in DB.
- **Hand-rolling MIME decoding:** `mailparser` handles charset, quoted-printable, base64, multipart automatically.
- **Marking emails as read before DB write:** If DB insert fails after marking read, the email is permanently lost (not in DB, won't be re-fetched). DB write first, mark-as-read second.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IMAP protocol | Custom TCP IMAP parser | `imapflow` | IMAP has dozens of extensions (CONDSTORE, QRESYNC, IDLE, etc.), charset negotiation, SASL auth |
| MIME email decoding | Manual bodyParts parsing | `mailparser` `simpleParser` | MIME has multipart trees, quoted-printable, base64, charset encoding — 100s of edge cases |
| Email threading | Complex message-ID tracking | Simple subject normalization (strip Re:/Fwd:) | For this use case, subject-based grouping is sufficient per CONTEXT.md |
| Job text matching | Embedding-based semantic search | `ilike` with `%term%` | The job title+company matching is fuzzy enough with ilike; full-text or vector search is overkill at this scale |

**Key insight:** The `imapflow` + `mailparser` combo is a well-known production pairing (imapflow is the IMAP transport for EmailEngine). The `download(uid, null)` + `simpleParser(stream)` pattern gives you fully decoded email text in 2 lines.

---

## Common Pitfalls

### Pitfall 1: Yahoo IMAP Requires App Password, Not Account Password
**What goes wrong:** Connecting with the regular Yahoo account password fails with authentication error if 2FA is enabled (which Yahoo increasingly requires).
**Why it happens:** Yahoo mandates App Passwords for third-party IMAP access.
**How to avoid:** Document in `.env.example` that `YAHOO_IMAP_PASSWORD` must be a 16-character App Password generated at `myaccount.yahoo.com` → Security → App passwords. Not the login password.
**Warning signs:** `ImapFlow` throws auth error on connect despite correct credentials.

### Pitfall 2: Forgetting `lock.release()` in Finally Block
**What goes wrong:** If an exception occurs inside the mailbox lock, the IMAP session can stall or fail to close properly.
**Why it happens:** `getMailboxLock()` holds exclusive access; not releasing it blocks the connection.
**How to avoid:** Always use `try { ... } finally { lock.release(); await client.logout(); }` pattern.
**Warning signs:** Subsequent calls hang waiting for a lock that was never released.

### Pitfall 3: Marking Emails as Read Before Confirming DB Write
**What goes wrong:** If the DB insert fails after marking the email as read, the email is lost — not stored in DB, and won't be fetched again on next run.
**Why it happens:** `messageFlagsAdd` is not transactional with the PostgreSQL insert.
**How to avoid:** Do the DB insert first. Mark as read only after successful DB write. For non-job emails: mark as read immediately since there's nothing to store.
**Warning signs:** Missing emails in `job_emails` table despite them disappearing from Yahoo inbox.

### Pitfall 4: imapflow `download()` Part Parameter
**What goes wrong:** Passing wrong part identifier to `download()` returns an empty or partial body.
**Why it happens:** For the full RFC822 message (what `mailparser` needs), the second argument must be `null` (not `'TEXT'` or `'1'`).
**How to avoid:** Use `client.download(uid, null, { uid: true })` — the `null` part fetches the entire raw message. Then pipe to `simpleParser`.
**Warning signs:** `parsed.text` is empty or undefined even though the email has content.

### Pitfall 5: N+1 API Calls for Email Count Badges
**What goes wrong:** Rendering 50 job cards each triggering an immediate `/api/mail/email-count` fetch causes 50 simultaneous DB queries.
**Why it happens:** Per the decision, count is fetched per job card via separate API call.
**How to avoid:** Set `staleTime: 60_000` on the `useQuery` so counts are cached for 60 seconds. Add `initialData: { count: 0 }` to avoid loading state flicker.
**Warning signs:** 50 simultaneous network requests on page load, DB load spikes on the jobs dashboard.

### Pitfall 6: LLM Hallucinating Company/Title for Ambiguous Emails
**What goes wrong:** LLM extracts "Unknown" or a generic company name, causing a false match or spurious job creation.
**Why it happens:** Some recruiting emails are vague (e.g., "A great opportunity awaits").
**How to avoid:** Require both `company` and `jobTitle` to be non-null and non-`'Unknown'` for matching. If either is null → create new job with `'generated-from-email'` status.
**Warning signs:** Jobs table filling up with `company: "Unknown"` entries.

### Pitfall 7: `YAHOO_MAIL_FOLDERS` With Invalid Folder Names
**What goes wrong:** imapflow throws if you try to `getMailboxLock()` on a non-existent folder.
**Why it happens:** Yahoo folder names are case-sensitive and may differ from expectations (e.g., `"Bulk Mail"` not `"Spam"`).
**How to avoid:** Wrap each folder's lock attempt in try/catch and log a warning if the folder doesn't exist. Continue with other folders.
**Warning signs:** Full ingestion fails when one configured folder name is wrong.

### Pitfall 8: `$id.tsx` Missing `useQuery` and Lucide Imports
**What goes wrong:** TypeScript compilation errors when adding the email thread component.
**Why it happens:** `src/routes/jobs/$id.tsx` currently only imports `X` from lucide-react and does not import `useQuery` from `@tanstack/react-query`.
**How to avoid:** Add `useQuery` import from `@tanstack/react-query`. Add `ChevronDown, ChevronUp, Mail` to the lucide-react import. Both must be done before adding the EmailThreadSection component.
**Warning signs:** TypeScript errors like "Cannot find name 'useQuery'" or "Module '...' has no exported member 'ChevronDown'".

---

## Code Examples

Verified patterns from official sources and project conventions:

### Complete IMAP Ingestion Service Skeleton
```typescript
// src/services/mail-ingestion.ts
// Source: imapflow docs (https://imapflow.com/), process-job.ts pattern
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { chat } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';
import { z } from 'zod';
import { db } from '@/db';
import { jobs, jobEmails } from '@/db/schema';
import { ilike, and, desc } from 'drizzle-orm';

export function normalizeSubject(subject: string): string {
  let s = subject;
  let prev: string;
  do {
    prev = s;
    s = s.replace(/^(re|fwd|fw)\s*:\s*/i, '').trim();
  } while (s !== prev);
  return s.toLowerCase();
}

export function getSearchSince(): Date {
  const since = new Date();
  since.setDate(since.getDate() - 10);
  return since;
}

function createImapClient() {
  return new ImapFlow({
    host: 'imap.mail.yahoo.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.YAHOO_IMAP_USER!,
      pass: process.env.YAHOO_IMAP_PASSWORD!, // App Password from Yahoo Account Security
    },
    logger: false,
  });
}

const EmailClassificationSchema = z.object({
  isJobRelated: z.boolean(),
  company: z.string().nullable(),
  jobTitle: z.string().nullable(),
  summary: z.string(),
});

const JobExtractionSchema = z.object({
  title: z.string().nullable().default('Unknown'),
  company: z.string().nullable().default('Unknown'),
  description: z.string().nullable().default(''),
  skills: z.array(z.string()).default([]),
  jobLocation: z.string().nullable().default(null),
});

export async function runIngestion(): Promise<{
  fetched: number;
  jobRelated: number;
  matched: number;
  created: number;
}> {
  const folders = (process.env.YAHOO_MAIL_FOLDERS ?? 'INBOX')
    .split(',')
    .map((f) => f.trim());
  const maxEmails = parseInt(process.env.YAHOO_MAIL_MAX_EMAILS ?? '50', 10);
  const since = getSearchSince();

  const summary = { fetched: 0, jobRelated: 0, matched: 0, created: 0 };
  const client = createImapClient();
  await client.connect();

  try {
    for (const folder of folders) {
      let lock;
      try {
        lock = await client.getMailboxLock(folder);
      } catch (err) {
        console.warn(`[mail-ingestion] Folder not found: ${folder}`);
        continue;
      }

      try {
        const uids = await client.search({ seen: false, since }, { uid: true });
        const batch = uids.slice(0, maxEmails - summary.fetched);
        const seenUids: number[] = [];

        for (const uid of batch) {
          const { content } = await client.download(String(uid), null, { uid: true });
          const parsed = await simpleParser(content);

          const subject = parsed.subject ?? '';
          const sender = parsed.from?.text ?? '';
          const bodyText = parsed.text ?? parsed.html ?? '';
          const receivedAt = parsed.date ?? new Date();

          summary.fetched++;

          const classification = await chat({
            adapter: openaiText('gpt-5.2'),
            messages: [{ role: 'user', content: `Subject: ${subject}\n\nFrom: ${sender}\n\n${bodyText.slice(0, 3000)}` }],
            systemPrompts: ['You are an email classifier for a job search assistant. Classify whether this email is job-related (recruiter outreach, job application update, interview invite, offer, rejection). Extract company and job title if present.'],
            outputSchema: EmailClassificationSchema,
          });

          // Non-job emails: mark as read but don't store
          seenUids.push(uid as number);

          if (!classification.isJobRelated) continue;
          summary.jobRelated++;

          const company = classification.company;
          const title = classification.jobTitle;
          let matchedJobId: string | null = null;

          if (company && title && company !== 'Unknown' && title !== 'Unknown') {
            const [match] = await db
              .select({ id: jobs.id })
              .from(jobs)
              .where(and(ilike(jobs.company, `%${company}%`), ilike(jobs.title, `%${title}%`)))
              .orderBy(desc(jobs.createdAt))
              .limit(1);
            matchedJobId = match?.id ?? null;
          }

          if (matchedJobId) {
            summary.matched++;
          } else {
            const extraction = await chat({
              adapter: openaiText('gpt-5.2'),
              messages: [{ role: 'user', content: bodyText.slice(0, 4000) }],
              systemPrompts: ['You are a job data extractor. Extract structured job information from this email for a job search tracker.'],
              outputSchema: JobExtractionSchema,
            });
            const [newJob] = await db
              .insert(jobs)
              .values({
                title: extraction.title ?? 'Unknown',
                company: extraction.company ?? 'Unknown',
                description: extraction.description ?? bodyText.slice(0, 2000),
                source: 'email',
                status: 'generated-from-email',
                skills: extraction.skills,
                jobLocation: extraction.jobLocation,
              })
              .returning();
            matchedJobId = newJob.id;
            summary.created++;
          }

          // DB write BEFORE mark-as-read (pitfall 3)
          await db.insert(jobEmails).values({
            jobId: matchedJobId,
            source: 'yahoo',
            emailContent: bodyText,
            emailLlmSummarized: classification.summary,
            subject,
            sender,
            receivedAt,
          });
        }

        // Mark all processed emails as read after DB writes
        if (seenUids.length > 0) {
          await client.messageFlagsAdd(seenUids, ['\\Seen'], { uid: true });
        }
      } finally {
        lock.release();
      }
    }
  } finally {
    await client.logout();
  }

  console.log('[mail-ingestion] Summary:', summary);
  return summary;
}

export async function fetchRawEmails(): Promise<Array<{
  subject: string;
  sender: string;
  receivedAt: Date;
  bodyText: string;
}>> {
  const folders = (process.env.YAHOO_MAIL_FOLDERS ?? 'INBOX')
    .split(',')
    .map((f) => f.trim());
  const since = getSearchSince();
  const results: Array<{ subject: string; sender: string; receivedAt: Date; bodyText: string }> = [];
  const client = createImapClient();
  await client.connect();
  try {
    for (const folder of folders) {
      let lock;
      try {
        lock = await client.getMailboxLock(folder);
      } catch {
        console.warn(`[mail-ingestion] Folder not found: ${folder}`);
        continue;
      }
      try {
        const uids = await client.search({ seen: false, since }, { uid: true });
        for (const uid of uids) {
          const { content } = await client.download(String(uid), null, { uid: true });
          const parsed = await simpleParser(content);
          results.push({
            subject: parsed.subject ?? '',
            sender: parsed.from?.text ?? '',
            receivedAt: parsed.date ?? new Date(),
            bodyText: parsed.text ?? parsed.html ?? '',
          });
        }
      } finally {
        lock.release();
      }
    }
  } finally {
    await client.logout();
  }
  return results;
}
```

### SQL Migration for job_emails
```sql
-- src/db/migrations/0008_add_job_emails_table.sql
CREATE TABLE "job_emails" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid REFERENCES "jobs"("id") ON DELETE SET NULL,
  "source" text NOT NULL,
  "email_content" text NOT NULL,
  "email_llm_summarized" text NOT NULL,
  "subject" text NOT NULL,
  "sender" text NOT NULL,
  "received_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "job_emails_job_id_idx" ON "job_emails"("job_id");
```

### Email Count API Route
```typescript
// src/routes/api/mail/email-count.tsx
import { createFileRoute } from '@tanstack/react-router';
import { db } from '@/db';
import { jobEmails } from '@/db/schema';
import { eq, count } from 'drizzle-orm';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const Route = createFileRoute('/api/mail/email-count')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const jobId = new URL(request.url).searchParams.get('jobId');
          if (!jobId) {
            return new Response(JSON.stringify({ count: 0 }), { headers: JSON_HEADERS });
          }
          const [result] = await db
            .select({ value: count() })
            .from(jobEmails)
            .where(eq(jobEmails.jobId, jobId));
          return new Response(
            JSON.stringify({ count: Number(result?.value ?? 0) }),
            { headers: JSON_HEADERS },
          );
        } catch (err) {
          console.error('[mail-email-count] Error:', err);
          const error = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ error }), { status: 500, headers: JSON_HEADERS });
        }
      },
    },
  },
});
```

### Yahoo IMAP Connection Settings
```
Host:     imap.mail.yahoo.com
Port:     993
Secure:   true (SSL/TLS)
Auth:     Full Yahoo email address + App Password (NOT account password)
App PW:   16-character code from myaccount.yahoo.com → Security → App passwords
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `imap` npm package (mscdex/node-imap) | `imapflow` | ~2020 onwards | Async/await, no callback hell, built-in extension support |
| Manual MIME parsing after IMAP fetch | `mailparser` `simpleParser(stream)` | Well-established | 2 lines to get fully decoded text/html/from/subject |
| Persistent IMAP connections | Per-request connect/disconnect for on-demand endpoints | Best practice | Avoids Yahoo timeout issues, simpler state management |

**Deprecated/outdated:**
- `node-imap` (`imap` npm package): Last meaningful update 2019. Callback-based, no TypeScript. Do not use.
- `imap-simple`: Thin wrapper over `node-imap`, same issues.

---

## Open Questions

1. **`generated-from-email` job status in `JOB_STATUSES` constant**
   - What we know: `JOB_STATUSES` is exported from `src/lib/job-constants.ts`; `STATUS_LABELS` in both `index.tsx` and `$id.tsx` already map known statuses but as plain `Record<string, string>` (not typed against `JOB_STATUSES`)
   - What's unclear: The `$id.tsx` `STATUS_LABELS` omits `resume_generated` and `failed` — it's a curated subset. `generated-from-email` needs to be added to both.
   - Recommendation: Add `'generated-from-email'` to `JOB_STATUSES` array in `job-constants.ts` AND add label entries in both `index.tsx` and `$id.tsx` `STATUS_LABELS`. Add orange color entry in `index.tsx` `STATUS_COLORS`.

2. **Email deduplication on repeated ingest calls**
   - What we know: Emails are marked as read on Yahoo after processing, which prevents re-fetching on next call
   - What's unclear: If Yahoo marks-as-read fails (network error), the email could be processed twice on retry
   - Recommendation: Accept the current approach for this phase. Optionally add a `message_id` uniqueness constraint on `job_emails` as a future dedup layer — `parsed.messageId` is available from mailparser.

3. **LLM cost per ingestion run**
   - What we know: Each email requires at least 1 LLM call (classification); non-matched emails require 2 (classification + extraction)
   - What's unclear: At 50 emails per call, cost could be non-trivial with GPT-5.2
   - Recommendation: Document in the service. Future optimization: cheaper classification model (GPT-4o-mini) — out of scope for this phase.

---

## Validation Architecture

> `.planning/config.json` not found — nyquist_validation defaults to enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.5 |
| Config file | none — uses vitest defaults |
| Quick run command | `pnpm vitest run src/services/mail-ingestion.test.ts` |
| Full suite command | `pnpm test` |

No existing test files were found in the project. Test infrastructure exists (vitest + @testing-library/react + jsdom are installed) but no tests have been written yet.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| — | IMAP search criteria (10-day window, seen:false) | unit | `pnpm vitest run src/services/mail-ingestion.test.ts` | Wave 0 |
| — | Subject normalization strips Re:/Fwd: | unit | `pnpm vitest run src/services/mail-ingestion.test.ts` | Wave 0 |
| — | Job matching with company+title returns most recent | unit | `pnpm vitest run src/services/mail-ingestion.test.ts` | Wave 0 |
| — | Email count API returns 0 for job with no emails | integration | `pnpm vitest run src/routes/api/mail/email-count.test.ts` | Wave 0 |
| — | runIngestion summary counts (fetched/jobRelated/matched/created) | unit | `pnpm vitest run src/services/mail-ingestion.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run src/services/mail-ingestion.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/services/mail-ingestion.test.ts` — unit tests for subject normalization, job matching logic, search date calculation
- [ ] Mocking strategy for `ImapFlow` (mock the class entirely — avoid real IMAP connections in tests)
- [ ] Mocking strategy for `chat()` from `@tanstack/ai` (mock to return fixed Zod-shaped objects)

---

## Sources

### Primary (HIGH confidence)
- [imapflow.com/docs/guides/searching/](https://imapflow.com/docs/guides/searching/) — search method, `seen: false`, `since` date criteria
- [imapflow.com/docs/api/imapflow-client/](https://imapflow.com/docs/api/imapflow-client/) — `messageFlagsAdd`, `download`, `fetchAll` signatures
- [imapflow.com/docs/getting-started/quick-start/](https://imapflow.com/docs/getting-started/quick-start/) — connect, mailbox lock, logout pattern
- [nodemailer.com/extras/mailparser](https://nodemailer.com/extras/mailparser) — `simpleParser` signature and result properties
- Project source: `src/services/process-job.ts` — LLM extraction pattern with `chat()` + Zod
- Project source: `src/routes/api/jobs/index.tsx` + `process.tsx` — API route handler pattern
- Project source: `src/db/schema.ts` — Drizzle table definition pattern (confirmed current state)
- Project source: `src/routes/jobs/index.tsx` — confirmed imports, STATUS_LABELS, STATUS_COLORS structure
- Project source: `src/routes/jobs/$id.tsx` — confirmed lucide import scope (X only), missing useQuery

### Secondary (MEDIUM confidence)
- [Yahoo Help: IMAP server settings](https://help.yahoo.com/kb/SLN4075.html) — `imap.mail.yahoo.com:993`, SSL required, App Password required
- npm registry: imapflow active maintenance, high weekly downloads

### Tertiary (LOW confidence)
- WebSearch synthesis for imapflow + mailparser integration pattern — verified with imapflow docs and GitHub

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — imapflow and mailparser are both well-documented with official sources; Yahoo IMAP settings confirmed via official Yahoo Help
- Architecture: HIGH — all patterns drawn directly from existing project code (process-job.ts, api/jobs/index.tsx) plus verified imapflow docs; codebase state freshly confirmed
- Pitfalls: HIGH — Yahoo App Password requirement confirmed by official Yahoo Help; other pitfalls drawn from imapflow API behavior; Pitfall 8 newly identified from codebase inspection

**Research date:** 2026-03-04
**Valid until:** 2026-06-04 (90 days — imapflow and Yahoo IMAP settings are stable; TanStack packages are more volatile but this phase doesn't add new TanStack dependencies)
