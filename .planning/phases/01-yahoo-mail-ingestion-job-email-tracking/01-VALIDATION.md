---
phase: 1
slug: yahoo-mail-ingestion-job-email-tracking
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.0.5 |
| **Config file** | none — uses vitest defaults |
| **Quick run command** | `pnpm vitest run src/services/mail-ingestion.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/services/mail-ingestion.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | DB schema | unit | `pnpm vitest run src/services/mail-ingestion.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | IMAP 10-day search window | unit | `pnpm vitest run src/services/mail-ingestion.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | Multi-folder iteration | unit | `pnpm vitest run src/services/mail-ingestion.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | LLM classification + job matching | unit | `pnpm vitest run src/services/mail-ingestion.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 1 | Subject normalization strips Re:/Fwd: | unit | `pnpm vitest run src/services/mail-ingestion.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-06 | 01 | 1 | runIngestion summary counts | unit | `pnpm vitest run src/services/mail-ingestion.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | Email count API returns 0 | integration | `pnpm vitest run src/routes/api/mail/email-count.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | Mail badge visible on JobCard | manual | — | N/A | ⬜ pending |
| 1-03-02 | 03 | 2 | Email thread collapsible on detail page | manual | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/services/mail-ingestion.test.ts` — unit tests for: subject normalization, job matching logic (ilike + most recent), search date calculation (10-day window), runIngestion summary counting, ImapFlow mock setup
- [ ] `src/routes/api/mail/email-count.test.ts` — integration test stub for email count API (returns 0 for job with no emails)
- [ ] ImapFlow mock — mock the `ImapFlow` class entirely to avoid real IMAP connections in tests
- [ ] `chat()` mock — mock `@tanstack/ai` `chat()` to return fixed Zod-shaped classification/extraction objects

*No existing test files found in project — vitest is installed but unused.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mail badge appears on JobCard with count > 0 | Dashboard badge | Requires real DB data with job_emails rows | 1. Run ingest, 2. Load jobs dashboard, 3. Verify badge shows count next to job title |
| Badge absent when count = 0 | Dashboard badge | Requires real DB state | Verify jobs with no emails show no badge |
| Email thread collapsible on job detail page | Detail page UI | Requires real job_emails data + browser | 1. Open job with emails, 2. Verify collapsible section at bottom, 3. Test expand/collapse |
| "Show full email" toggle reveals raw content | Detail page toggle | Requires real email data | Click toggle, verify raw email_content loads on demand |
| POST /api/mail/ingest returns correct summary JSON | Ingestion response | Requires real Yahoo IMAP connection | Call endpoint, verify { fetched, jobRelated, matched, created } counts are accurate |
| Emails marked as read on Yahoo after ingest | Mark-as-read | Requires real Yahoo account | Verify emails disappear from unread in Yahoo inbox after ingest |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
