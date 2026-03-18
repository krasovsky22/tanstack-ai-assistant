---
phase: 4
slug: user-authentication
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm vitest run` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | AUTH-DB | unit | `pnpm vitest run src/db` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | AUTH-LOGIN | manual | — | ✅ | ⬜ pending |
| 4-02-01 | 02 | 1 | AUTH-ROUTES | manual | — | ✅ | ⬜ pending |
| 4-03-01 | 03 | 2 | AUTH-SCOPE | unit | `pnpm vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/db/__tests__/schema.test.ts` — stubs verifying users table schema shape
- [ ] `src/db/__tests__/user-scoping.test.ts` — stubs for user_id FK on jobs/cronjobs

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Login redirects unauthenticated users | AUTH-LOGIN | Browser session required | Navigate to /conversations, expect redirect to /login |
| Session persists after page refresh | AUTH-SESSION | Browser state | Login, refresh, verify still authenticated |
| Protected pages inaccessible without session | AUTH-ROUTES | Browser session required | Clear cookies, visit /jobs, expect redirect |
| create-user script hashes password | AUTH-SCRIPT | CLI execution | Run script, check DB row has hashed (not plain) password |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
