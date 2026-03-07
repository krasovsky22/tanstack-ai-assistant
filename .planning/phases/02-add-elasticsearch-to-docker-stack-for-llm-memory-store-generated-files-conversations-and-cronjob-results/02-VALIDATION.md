---
phase: 2
slug: add-elasticsearch-to-docker-stack-for-llm-memory-store-generated-files-conversations-and-cronjob-results
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (already installed) |
| **Config file** | vite.config.ts (auto-discovered) |
| **Quick run command** | `pnpm vitest run src/services/elasticsearch.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/services/elasticsearch.test.ts`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | MEM-01 | unit | `pnpm vitest run src/services/elasticsearch.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 0 | MEM-02 | unit | `pnpm vitest run src/services/elasticsearch.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 0 | MEM-03 | unit | `pnpm vitest run src/services/elasticsearch.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-04 | 01 | 0 | MEM-04 | unit | `pnpm vitest run src/tools/memory.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-05 | 01 | 0 | MEM-06 | unit | `pnpm vitest run src/services/chat.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | MEM-05 | smoke | `curl http://localhost:9200/_cluster/health` | manual only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/services/elasticsearch.test.ts` — stubs for MEM-01, MEM-02, MEM-03 (mock `@elastic/elasticsearch` Client)
- [ ] `src/tools/memory.test.ts` — stubs for MEM-04
- [ ] `src/services/chat.test.ts` — stubs for MEM-06 (verify if already exists first)

*Vitest is already installed and configured — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ES service starts and responds to health check | MEM-05 | Docker/networking — requires running stack | `docker compose up elasticsearch -d && curl http://localhost:9200/_cluster/health` |
| LLM invokes search_memory tool in a chat session | MEM-07 | Requires live LLM interaction | Start dev server, send a message asking to recall past context, verify tool is called in streaming output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
