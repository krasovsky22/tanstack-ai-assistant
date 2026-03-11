---
phase: 03-jira-integration
plan: "02"
subsystem: api
tags: [jira, rest-api, tools, llm-tools, fetch, bearer-auth]

# Dependency graph
requires:
  - phase: 03-jira-integration-01
    provides: Wave 0 RED tests for JIRA-01 through JIRA-08 in jiratool.test.ts and chat.test.ts
provides:
  - src/tools/jiratool.ts with getJiraTools() exporting 6 LLM-callable Jira Server tools
  - Jira tool registration in buildChatOptions() with DISABLE_TOOLS=jira guard
  - JIRA_BASE_URL and JIRA_PAT env vars documented in .env.example
affects: [03-jira-integration, chat-service, tools-index]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - jiraFetch() private helper strips trailing slash, injects Bearer auth; mirrors pattern from newsapi.ts
    - 204 No Content handlers skip .json() call — enforced for update_description and assign_issue
    - Env var guard read inline in each .server() handler (not at module level) — consistent with crontool.ts
    - DISABLE_TOOLS key "jira" used for opt-out, consistent with existing "mcp", "cronjob", "news" keys

key-files:
  created:
    - src/tools/jiratool.ts
  modified:
    - src/tools/index.ts
    - src/services/chat.ts
    - .env.example

key-decisions:
  - "jira_add_comment returns res.json() directly (not wrapped in { success, comment }) — matches test assertion toMatchObject({ id })"
  - "jira_update_description and jira_assign_issue return exactly { success: true } without issueKey — matches toEqual({ success: true }) test assertions"
  - "getJiraTools registered in buildChatOptions() alongside existing tool groups — Rule 2 auto-fix to make JIRA-08 go GREEN"

patterns-established:
  - "Tool file structure: private fetch helper + exported getXxxTools() factory returning toolDefinition array — mirrors crontool.ts exactly"
  - "Jira Server v2 assignee field uses { name: username } NOT { accountId } — enforced in tool and tests"

requirements-completed: [JIRA-01, JIRA-02, JIRA-03, JIRA-04, JIRA-05, JIRA-06, JIRA-07]

# Metrics
duration: 2min
completed: 2026-03-11
---

# Phase 03 Plan 02: Jira Tools Implementation Summary

**6 LLM-callable Jira Server v2 tools via native fetch with Bearer auth: search, get, update description, add/get comments, assign issues**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-11T08:46:02Z
- **Completed:** 2026-03-11T08:48:16Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments

- Created `src/tools/jiratool.ts` with `getJiraTools()` exporting all 6 tools: jira_search, jira_get_issue, jira_update_description, jira_add_comment, jira_get_comments, jira_assign_issue
- Private `jiraFetch()` helper handles URL construction (trailing slash strip), Bearer auth headers, Content-Type/Accept headers
- All 9 JIRA tool tests GREEN (JIRA-01 through JIRA-07 + jira_get_issue convenience test)
- Registered getJiraTools() in buildChatOptions() with DISABLE_TOOLS=jira guard — JIRA-08 GREEN
- All 13 tests pass across full test suite

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement jiratool.ts with jiraFetch helper and all 6 tools** - `e5d475e` (feat)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified

- `src/tools/jiratool.ts` - 6 LLM-callable Jira tools + private jiraFetch helper
- `src/tools/index.ts` - Added getJiraTools export
- `src/services/chat.ts` - Registered getJiraTools in buildChatOptions with jira disable guard
- `.env.example` - Added JIRA_BASE_URL and JIRA_PAT with documentation

## Decisions Made

- `jira_add_comment` returns `res.json()` directly (not wrapped in `{ success, comment }`) — the test asserts `toMatchObject({ id })` at the top level, so the created comment object is the return value
- `jira_update_description` and `jira_assign_issue` return exactly `{ success: true }` without `issueKey` — the test uses `toEqual({ success: true })` requiring an exact match
- Env vars are read inline in each `.server()` handler to avoid module-level state capture, consistent with the newsapi.ts pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Registered getJiraTools in buildChatOptions and exported from index.ts**
- **Found during:** Task 1 (full test suite run after jiratool.ts creation)
- **Issue:** `pnpm test` revealed JIRA-08 failing — `chat.test.ts` (Wave 0 stub from Plan 01) expected `getJiraTools` to be exported from `@/tools` and called by `buildChatOptions()`; neither was done yet
- **Fix:** Added `export { getJiraTools } from './jiratool'` to `src/tools/index.ts`; added `getJiraTools` import and `...(enabled('jira') ? getJiraTools() : [])` spread to `buildChatOptions` in `src/services/chat.ts`
- **Files modified:** `src/tools/index.ts`, `src/services/chat.ts`
- **Verification:** `pnpm test` — all 13 tests pass, JIRA-08 GREEN
- **Committed in:** `e5d475e` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical functionality)
**Impact on plan:** Auto-fix necessary to complete the JIRA-08 test from Plan 01. No scope creep — this was the intended Wire-up step deferred from Wave 0.

## Issues Encountered

None — implementation straightforward. The JIRA-08 deviation was expected (Plan 01 created tests that depended on Plan 02 and Plan 03 work; it was addressed here as part of making all tests GREEN).

## User Setup Required

Environment variables required to use Jira tools:
- `JIRA_BASE_URL` — Base URL of Jira Server instance (e.g. `https://jira.example.com`)
- `JIRA_PAT` — Personal Access Token for Jira Server Bearer authentication

Add both to `.env` (see `.env.example` for template). Without these, all Jira tools return `{ success: false, error: 'JIRA_BASE_URL and JIRA_PAT environment variables are not configured. Ask the user to set them.' }`.

## Next Phase Readiness

- All 6 Jira tools available to the AI assistant via natural language
- `DISABLE_TOOLS=jira` disables all tools cleanly
- Plan 03 (if any) may wire Jira tools to additional context or register them in the knowledge base

---
*Phase: 03-jira-integration*
*Completed: 2026-03-11*
