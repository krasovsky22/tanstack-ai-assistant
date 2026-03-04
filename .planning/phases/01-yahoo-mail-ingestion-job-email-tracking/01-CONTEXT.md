# Phase 1: Yahoo Mail Ingestion & Job Email Tracking - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Pull unread emails from Yahoo IMAP (configurable folders, last 10 days only), use LLM to classify as job-related, match to existing jobs via company/title extraction + DB query, or auto-create a new job from the email. Persist job-related emails in a `job_emails` table. Surface email counts as badges on the jobs dashboard and a collapsible conversation view on the job detail page.

</domain>

<decisions>
## Implementation Decisions

### Email ingestion trigger
- Manual API endpoint: `POST /api/mail/ingest` — no background worker, called on demand
- Separate read-only endpoint: `GET /api/mail/emails` — returns raw Yahoo emails without any processing or DB writes
- Only fetch emails received in the last 10 days (hardcoded lookback window, do not go further back)
- Max emails per call configurable via `YAHOO_MAIL_MAX_EMAILS` env var
- Folders to poll configurable via `YAHOO_MAIL_FOLDERS` env var (comma-separated, e.g. `"INBOX,Jobs,Recruiters"`)
- After processing, mark emails as read on Yahoo to prevent re-processing

### Ingestion response
- `POST /api/mail/ingest` returns a detailed JSON summary: emails fetched, how many were job-related, how many matched existing jobs, how many new jobs were auto-created

### Job matching strategy
- LLM extracts company name + job title from email body/subject
- DB text search for matching job by company + title
- Multiple matches → pick the most recently created job
- Non-job emails (LLM determines not job-related) → skip entirely, still mark as read on Yahoo, nothing stored in DB

### Auto-created jobs (no match found)
- Status: `'generated-from-email'`
- LLM does full extraction: title, company, description, skills, job location
- Source: `'email'`

### job_emails table columns
- `id` (uuid, PK)
- `job_id` (uuid, FK → jobs, nullable for edge cases)
- `source` (text) — e.g. `'yahoo'`, `'gmail'` — designed for multi-provider from the start
- `email_content` (text) — raw email body
- `email_llm_summarized` (text) — LLM-generated summary
- `subject` (text)
- `sender` (text)
- `received_at` (timestamp)
- `created_at` (timestamp)

### Dashboard mail badge
- Shown on each `JobCard` next to the job title/company name (inline with header)
- Displays email count with mail icon: ✉ 3
- Email count fetched via a separate API call per job (not included in the `/api/jobs` list response)
- Badge only appears if count > 0

### Mail conversation box (job detail page)
- Collapsible section at the bottom of the job detail/edit page (same pattern as Job Description collapsible in `JobCard`)
- Emails threaded by subject, sorted by `received_at` desc
- Default view: shows `email_llm_summarized` for each email
- "Show full email" toggle per email to expand and load raw `email_content` on demand
- View only — no reply capability in this phase

### Claude's Discretion
- IMAP library choice (e.g. `imapflow`, `node-imap`, `imap-simple`)
- Exact LLM prompt design for classification and extraction
- Threading logic implementation (group by subject normalization — strip Re:/Fwd: prefixes)
- Loading state while fetching email count per job card

</decisions>

<specifics>
## Specific Ideas

- Multi-provider architecture from the start: `source` column in `job_emails` means Yahoo is just the first provider; Gmail and others can be added as future phases without schema changes
- The GET /api/mail/emails endpoint is useful for debugging and verifying IMAP connectivity before committing to processing
- "Show full email" expand follows the same collapsible pattern already used in `JobCard` for Job Description

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Badge.tsx`: Existing badge component — use for mail count badge on `JobCard`
- `JobCard` collapsible pattern (`border-t` + `ChevronDown/Up` toggle): Reuse for the email conversation section on job detail page
- `src/services/process-job.ts`: LLM extraction pattern (Zod schema + `chat()` from `@tanstack/ai`) — follow same pattern for email classification and job data extraction
- `src/db/schema.ts` `pgTable()` pattern with `uuid`, `text`, `timestamp`, `jsonb` — follow for `job_emails` table definition
- Lucide icons already in use: `Mail` icon available in `lucide-react` for badge

### Established Patterns
- API routes in `src/routes/api/[feature]/` with named export handlers (`GET`, `POST`)
- Business logic in `src/services/[name].ts` — put IMAP + LLM logic in `src/services/mail-ingestion.ts`
- `[module] message` console logging prefix pattern for service logs
- Error response: `new Response(JSON.stringify({ error: '...' }), { status: 500 })`
- TanStack Query (`useQuery`) for data fetching in UI components
- `createServerFn` pattern used in `jobs/$id.tsx` for server-side data loading

### Integration Points
- `src/db/schema.ts`: Add `job_emails` table, FK to `jobs`
- `src/routes/jobs/index.tsx` (`JobCard`): Add mail badge next to title — fetch count via `useQuery` per job
- `src/routes/jobs/$id.tsx` (`EditJobPage`): Add collapsible email conversation section at bottom
- `src/routes/api/` — new directory `src/routes/api/mail/` for ingestion and raw email endpoints
- `.env.example`: Add `YAHOO_IMAP_HOST`, `YAHOO_IMAP_USER`, `YAHOO_IMAP_PASSWORD`, `YAHOO_MAIL_FOLDERS`, `YAHOO_MAIL_MAX_EMAILS`

</code_context>

<deferred>
## Deferred Ideas

- Gmail and other email provider integrations — future phases (schema already supports via `source` column)
- Reply/send email from within the app — future phase
- Email notification/alert when new job email arrives — future phase

</deferred>

---

*Phase: 01-yahoo-mail-ingestion-job-email-tracking*
*Context gathered: 2026-03-04*
