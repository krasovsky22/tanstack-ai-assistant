---
phase: 5
slug: gateway-identity-linking
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.0.5 |
| **Config file** | vite.config.ts (inferred — no standalone vitest.config) |
| **Quick run command** | `pnpm vitest run src/db/gateway-identity.test.ts src/services/gateway-identity.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/db/gateway-identity.test.ts src/services/gateway-identity.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 0 | GID-01 | unit | `pnpm vitest run src/db/gateway-identity.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 0 | GID-02 | unit | `pnpm vitest run src/db/gateway-identity.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-03 | 01 | 0 | GID-03 | unit | `pnpm vitest run src/services/gateway-identity.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-04 | 01 | 0 | GID-04 | unit | `pnpm vitest run src/services/gateway-identity.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-05 | 01 | 0 | GID-05 | unit | `pnpm vitest run src/services/gateway-identity.test.ts` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 0 | GID-06 | unit | `pnpm vitest run workers/gateway/handler.test.ts` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 0 | GID-07 | unit | `pnpm vitest run workers/gateway/handler.test.ts` | ❌ W0 | ⬜ pending |
| 5-03-01 | 03 | 1 | GID-UI | manual | n/a — Settings UI (browser) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/db/gateway-identity.test.ts` — stubs for GID-01, GID-02 (schema column assertions following `user-scoping.test.ts` pattern)
- [ ] `src/services/gateway-identity.test.ts` — stubs for GID-03, GID-04, GID-05 (pure function + mocked DB)
- [ ] `workers/gateway/handler.test.ts` — stubs for GID-06, GID-07 (mock fetch, assert intercept behavior)

*All three test files are new — Wave 0 must create them before any implementation tasks run.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GatewayIdentitiesCard renders in Settings UI | GID-UI | Browser-only UI component | Open Settings page, verify card appears with "Generate Code" button and linked identities list |
| Linking flow end-to-end | GID-E2E | Requires running Telegram bot | Generate code in UI, send `/link CODE` in Telegram, verify bot confirms and identity appears in Settings |
| Unlinked user blocked message | GID-BLOCK | Requires running Telegram bot | Send a message from unlinked account, verify bot responds with linking instructions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
