---
phase: 3
slug: jira-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm vitest run src/tools/jiratool.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/tools/jiratool.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | JIRA-01 | unit | `pnpm vitest run src/tools/jiratool.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 0 | JIRA-02 | unit | `pnpm vitest run src/tools/jiratool.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | JIRA-03 | unit (fetch mock) | `pnpm vitest run src/tools/jiratool.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 1 | JIRA-04 | unit (fetch mock) | `pnpm vitest run src/tools/jiratool.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-05 | 01 | 1 | JIRA-05 | unit (fetch mock) | `pnpm vitest run src/tools/jiratool.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-06 | 01 | 1 | JIRA-06 | unit (fetch mock) | `pnpm vitest run src/tools/jiratool.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-07 | 01 | 1 | JIRA-07 | unit (fetch mock) | `pnpm vitest run src/tools/jiratool.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | JIRA-08 | unit | `pnpm vitest run src/services/chat.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/tools/jiratool.test.ts` — stubs for JIRA-01 through JIRA-07; use `vi.stubGlobal('fetch', vi.fn())` to mock fetch
- [ ] `src/services/chat.test.ts` — add test case for `getJiraTools` being registered in `buildChatOptions()`

*Existing vitest infrastructure covers all phase requirements — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Jira tools callable from chat UI | JIRA-01 through JIRA-07 | Requires live Jira Server instance | Ask AI "search for my open Jira tickets", verify response |
| Env var missing message | JIRA-02 | Runtime check | Unset JIRA_PAT, trigger tool, verify graceful error |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
