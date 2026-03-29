---
phase: 8
slug: github-mcp-tool-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | none — uses vite.config.ts |
| **Quick run command** | `pnpm vitest run src/tools/github-mcp.test.ts` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run <specific test file>`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 8-??-01 | 01 | 0 | schema migration | unit | `pnpm vitest run src/services/user-settings.test.ts` | Wave 0 | ⬜ pending |
| 8-??-02 | 01 | 1 | getGitHubMcpTools() returns [] on error | unit | `pnpm vitest run src/tools/github-mcp.test.ts` | Wave 0 | ⬜ pending |
| 8-??-03 | 01 | 1 | getGitHubMcpTools() returns tools on success | unit | `pnpm vitest run src/tools/github-mcp.test.ts` | Wave 0 | ⬜ pending |
| 8-??-04 | 01 | 1 | UserSettingsRecord includes githubPat | unit | `pnpm vitest run src/services/user-settings.test.ts` | Wave 0 | ⬜ pending |
| 8-??-05 | 01 | 1 | buildChatOptions() includes GitHub tools when PAT present | unit | `pnpm vitest run src/services/chat.test.ts` | Exists (extend) | ⬜ pending |
| 8-??-06 | 02 | 2 | Settings API PUT masks github_pat in response | unit | `pnpm vitest run src/routes/api/user-settings.test.ts` | Wave 0 | ⬜ pending |
| 8-??-07 | 02 | 2 | GitHubSettingsCard renders PAT input | manual | n/a | n/a | ⬜ pending |
| 8-??-08 | 02 | 2 | GitHubSettingsCard shows "Connected as @username" on success | manual | n/a | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/tools/github-mcp.test.ts` — unit tests for getGitHubMcpTools()
- [ ] `src/services/user-settings.test.ts` — tests for UserSettingsRecord with githubPat
- [ ] `src/routes/api/user-settings.test.ts` — tests for PAT masking in API response

*Existing test infrastructure (vitest) already installed — no new installs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GitHubSettingsCard renders correctly below Jira card | UI layout | Visual verification required | Open Settings page, verify card appears below Jira section with correct fields |
| "Connected as @username" shows after valid PAT save | UI flow | Requires live GitHub API | Enter a valid PAT, save, verify success message with username appears |
| Masked placeholder (••••••••••••) shows when PAT saved | UI state | Visual verification | Reload Settings page with saved PAT, verify masked input and Update button |
| GitHub tools available in chat after PAT saved | E2E flow | Requires live MCP server | Save PAT in settings, open chat, ask to list GitHub repos, verify tool calls fire |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
