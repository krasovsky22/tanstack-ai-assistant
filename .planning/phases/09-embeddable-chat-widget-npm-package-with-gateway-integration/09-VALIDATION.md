---
phase: 9
slug: embeddable-chat-widget-npm-package-with-gateway-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm vitest run --reporter=verbose` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run --reporter=verbose`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | Widget scaffold | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | Widget build | integration | `pnpm build:widget` | ❌ W0 | ⬜ pending |
| 9-02-01 | 02 | 1 | WebWidgetProvider unit | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 9-02-02 | 02 | 1 | API route proxy | integration | `pnpm test` | ❌ W0 | ⬜ pending |
| 9-03-01 | 03 | 2 | End-to-end widget flow | integration | `pnpm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/routes/api/gateway-widget.test.ts` — stubs for proxy route validation
- [ ] `workers/gateway/providers/web-widget.test.ts` — stubs for WebWidgetProvider
- [ ] `packages/chat-widget/src/widget.test.ts` — stubs for widget init and UI behavior

*Existing vitest infrastructure covers the framework.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Widget renders floating button on host page | Widget Appearance | Requires real browser on a separate HTML page | Open test.html in browser, verify button appears bottom-right |
| Slide-up panel opens on button click | Widget Appearance | Requires real browser interaction | Click floating button, verify panel slides up |
| Chat message round-trip visible in widget | Gateway Integration | Full stack with LLM calls | Send "hello" in widget, verify response appears in panel |
| API key rejection (wrong key) | Backend Endpoint | Requires running server | Set wrong key in widget init, verify 401 response |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
