---
phase: 6
slug: add-a-persistent-report-bug-button-on-every-page-that-lets-users-submit-an-issue-the-system-uses-an-llm-to-categorize-the-request-bug-feature-etc-and-then-automatically-creates-a-jira-ticket
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm vitest run src/lib/report-issue.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/lib/report-issue.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 0 | REQ-06-LIB | unit | `pnpm vitest run src/lib/report-issue.test.ts` | ❌ W0 | ⬜ pending |
| 6-02-01 | 02 | 1 | REQ-06-HEADER | manual | browser inspection | N/A | ⬜ pending |
| 6-02-02 | 02 | 1 | REQ-06-MODAL | manual | open modal, fill form, submit | N/A | ⬜ pending |
| 6-03-01 | 03 | 2 | REQ-06-API | unit | `pnpm vitest run src/lib/report-issue.test.ts` | ❌ W0 | ⬜ pending |
| 6-03-02 | 03 | 2 | REQ-06-SUCCESS | manual | submit form, verify success state | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/report-issue.ts` — `buildReportPrompt()` and `parseTicketResponse()` utilities
- [ ] `src/lib/report-issue.test.ts` — unit tests for prompt builder and response parser

*Wave 0 establishes the testable pure-function layer before any UI or API integration is built.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Header appears on all protected pages | REQ-06-HEADER | Requires visual browser inspection across routes | Navigate to /, /jobs, /cronjobs — confirm header visible with bell icon + label |
| Bell icon opens modal | REQ-06-MODAL | UI interaction | Click bell icon, confirm ReportIssueModal renders with Title + Description fields |
| Submit creates Jira ticket | REQ-06-JIRA | Requires live Jira integration | Fill form, submit, confirm success state shows category + link to created ticket |
| Error state shown on failure | REQ-06-ERROR | Requires simulated API failure | Submit with invalid/missing Jira creds, confirm inline error message appears |
| Page URL captured silently | REQ-06-URL | Runtime behavior | Submit from different pages, confirm ticket description includes correct URL |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
