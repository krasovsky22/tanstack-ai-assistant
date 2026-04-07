---
phase: 11
slug: configurable-agents
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 11 — Validation Strategy

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
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | DB schema | unit | `pnpm vitest run src/db` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | DB migration | manual | inspect drizzle output | N/A | ⬜ pending |
| 11-02-01 | 02 | 1 | Agent CRUD API | unit | `pnpm vitest run src/routes/api/agents` | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 1 | Widget key validation | unit | `pnpm vitest run src/services/widget` | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 2 | Agents admin page | manual | browser test at /agents | N/A | ⬜ pending |
| 11-03-02 | 03 | 2 | Agent dropdown in chat | manual | browser test at /chat | N/A | ⬜ pending |
| 11-04-01 | 04 | 3 | buildChatOptions agent param | unit | `pnpm vitest run src/services/chat` | ❌ W0 | ⬜ pending |
| 11-04-02 | 04 | 3 | resolveAdapter dispatch | unit | `pnpm vitest run src/services/chat` | ❌ W0 | ⬜ pending |
| 11-05-01 | 05 | 3 | Telegram/cron default agent | unit | `pnpm vitest run workers` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/db/__tests__/agents.test.ts` — stubs for agents table schema validation
- [ ] `src/services/__tests__/chat-agent.test.ts` — stubs for resolveAdapter dispatch logic
- [ ] `src/services/__tests__/widget-agent.test.ts` — stubs for widget API key lookup
- [ ] `workers/__tests__/gateway-default-agent.test.ts` — stubs for default agent resolution

*Existing vitest infrastructure covers the framework requirement.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Agent dropdown locks after first message | UI state | Requires browser interaction | Open /chat, select agent, send message, verify dropdown is disabled |
| API key masked/copyable in table | UI display | Requires browser visual check | Open /agents, verify key shows masked with copy button |
| Set as default clears previous default | DB side-effect | Requires DB state inspection | Create 2 agents, set second as default, verify first no longer default |
| Widget request routes to correct agent | Integration | Requires running gateway | POST to /api/gateway/widget with agent API key, verify correct model used |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
