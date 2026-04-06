---
phase: 10
slug: user-settings-token-encryption
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing, via `vite.config.ts`) |
| **Config file** | `vite.config.ts` — `test.exclude: ['e2e/**', 'node_modules/**']` |
| **Quick run command** | `pnpm vitest run src/lib/crypto.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/lib/crypto.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 0 | ENC-01, ENC-02, ENC-03, ENC-04, ENC-07 | unit | `pnpm vitest run src/lib/crypto.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 0 | ENC-05, ENC-06 | integration | `pnpm vitest run src/services/user-settings.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | ENC-01..ENC-07 | unit+integration | `pnpm test` | ✅ (from W0) | ⬜ pending |
| 10-02-02 | 02 | 1 | ENC-08 | manual | visual inspection | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/crypto.test.ts` — stubs for ENC-01 through ENC-04, ENC-07
- [ ] `src/services/user-settings.test.ts` — stubs for ENC-05, ENC-06 (mock DB via `vi.mock('@/db')`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `.env.example` and `CLAUDE.md` document `ENCRYPTION_KEY` | ENC-08 | Documentation check | Open both files and verify `ENCRYPTION_KEY` entry with description exists |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
