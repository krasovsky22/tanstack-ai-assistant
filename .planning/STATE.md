---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: Not started
status: unknown
stopped_at: Completed 08-02-PLAN.md
last_updated: "2026-03-29T06:08:02.304Z"
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 16
  completed_plans: 15
---

# Project State

## Current Status

- **Active Phase:** 5 — gateway-identity-linking
- **Milestone:** 1 — Core Feature Expansion
- **Current Plan:** Not started
- **Last session:** 2026-03-29T06:08:02.300Z
- **Stopped At:** Completed 08-02-PLAN.md

## Progress

Phase 01: [####] 4/4 plans complete
Phase 02: [####] 4/4 plans complete
Phase 04: [####] 4/4 plans complete

## Accumulated Context

### Pending Todos

1 pending todo — run `/gsd:check-todos` to view.

- **Link gateway identities to internal users** (general) — identity mapping table + runtime resolution for Telegram → internal user

### Roadmap Evolution
- Phase 1 added: Yahoo Mail Ingestion & Job Email Tracking — pull Yahoo IMAP emails, LLM classify, match/create jobs, job_emails table, dashboard badges, job detail mail view
- Phase 2 added: Add Elasticsearch to Docker stack for LLM memory - store generated files, conversations, and cronjob results
- Phase 3 added: jira-integration
- Phase 4 added: user authentication.
- Phase 5 added: gateway-identity-linking — code-based Telegram→internal user mapping, block unlinked users, Settings UI for managing linked identities
- Phase 6 added: Report Bug button — persistent UI entry point on every page, modal form, LLM classification, automatic Jira ticket creation
- Phase 8 added: GitHub MCP Tool Integration — fetch open/closed PRs, search code, analyze PR changes via GitHub MCP; PAT configured per user in settings

### Decisions

- **01-01:** Repaired Drizzle migration journal (_journal.json) to include all migrations 0000-0008 and back-filled __drizzle_migrations tracking table — prior migrations were applied via db:push without journal entries
- **01-01:** jobId column is nullable (no .notNull()) to support orphaned email records when a matched job is deleted
- **01-01:** Wave 0 test scaffolds use @ts-expect-error on imports of non-existent files — expected behavior until Plans 02/03 create implementations
- **01-01:** Migration journal must match DB tracking table: when using db:push, also update _journal.json and insert hash rows into drizzle.__drizzle_migrations
- **01-03:** Missing jobId returns { count: 0 } and [] respectively — safe fallbacks, not errors
- **01-03:** emails-by-job selects exactly 6 fields (id, subject, sender, receivedAt, emailLlmSummarized, emailContent) matching Plan 04 UI contract
- [Phase 01-02]: download() called with null part for full RFC822 stream — simpleParser needs raw stream, not named MIME part
- [Phase 01-02]: DB insert(jobEmails) before messageFlagsAdd — ensures email re-processable if DB write fails (pitfall 3)
- [Phase 01-02]: Per-folder try/catch around getMailboxLock so invalid folder logs warning and continues rather than aborting all ingestion
- [Phase 01]: staleTime 60s + initialData { count: 0 } prevents N+1 HTTP spike on jobs list load with many JobCards
- [Phase 01]: enabled: expanded on email thread query — no network request until user opens EmailThreadSection
- **02-01:** Elasticsearch 8.19.12 with security disabled and vm.max_map_count=262144 via sysctls; WSL2 users need sudo sysctl on host
- **02-01:** Test files use vi.mock pattern (not @ts-expect-error) because elasticsearch.ts and memory.ts were present as untracked pre-plan work; Wave 0 tests pass now rather than fail
- [Phase 02]: estypes.MappingTypeMapping used for index definition type safety; 400 status handled via meta.statusCode in catch (ES 8.x ignore option unavailable in TS types); indexDocument never re-throws — ES supplementary to Postgres
- [Phase 02-03]: Used dynamic import for elasticsearch service in tool handler — allows tool to be tested without live ES
- [Phase 02-03]: chat.test.ts uses full vi.mock(@/tools) approach — avoids Docker MCP connection noise and runs in 2ms vs 400ms
- [Phase 02-04]: void used on all indexDocument calls — fire-and-forget ensures ES failure cannot crash Postgres write path
- [Phase 02-04]: appendMessagesToConversation uses conversationId as title fallback — title not available in that context
- [Phase 02-04]: workers/cron changed cronjobLogs insert to use .returning() — needed to capture logRow.id for ES document ID
- [Phase 02-04]: generate-resume indexes content before PDF generation — result.updatedResume and result.coverLetter still in scope
- [Phase 03-01]: Wave 0 tests use @ts-expect-error on jiratool import — runtime import failure is the expected RED signal
- [Phase 03-01]: chat.test.ts uses vi.mock('@/tools') full-mock pattern (established in 02-03) — avoids Docker MCP connection noise in test runs
- [Phase 03-01]: jira_assign_issue uses { name: username } NOT { accountId } — Jira Server API vs Cloud distinction encoded in test assertions
- [Phase 03]: jira_add_comment returns res.json() directly (not wrapped) — matches test assertion toMatchObject({ id })
- [Phase 03]: getJiraTools registered in buildChatOptions() with DISABLE_TOOLS=jira guard alongside existing tool groups
- [Phase 03]: JIRA_DEFAULT_PROJECT documented as optional reference var — not actively consumed by tools in this phase
- [Phase 04]: FK columns referencing users.id (uuid) must use uuid type — text FK causes type mismatch in PostgreSQL
- [Phase 04]: Wave 0 TDD stubs confirmed RED before schema changes, GREEN after — pattern established for auth phase tests
- [Phase 04]: All old route files deleted after copying to _protected/ — TanStack Router file-based routing requires no duplicate path registrations
- [Phase 04]: loginFn returns { error } on bad credentials — avoids username enumeration and allows client-side error display without redirect
- [Phase 04]: Unauthenticated GET returns empty arrays (graceful degradation) rather than 401 on user-scoped routes
- [Phase 04]: Ownership guards fire only when both session userId and record userId are non-null — avoids locking legacy unowned records
- [Phase 04]: userId excluded from onConflictDoUpdate set clause in conversations/index.tsx to preserve original owner on upsert
- [Phase 04-04]: Phase 4 auth system verified end-to-end by Playwright QA agent — all 6 browser scenarios (redirect, invalid login, valid login, persistence, protected routes, logout) passed
- [Phase 05]: Drizzle 0.45.1 array syntax for table extras: (t) => [unique().on(...)]
- [Phase 05]: Wave 0 schema tests (GID-01/02) immediately GREEN since schema added in Task 1 before test file in Task 2
- [Phase 05]: handler.test.ts mockProvider includes start/stop to satisfy Provider interface — plan stub omitted these
- [Phase 05-03]: chatIdStr = String(msg.chatId) normalised once at top of handleMessage before any fetch — avoids type inconsistency pitfall
- [Phase 05-03]: LINK_PATTERN evaluated before identity resolve — avoids wasted API call for linking messages
- [Phase 05]: redeemLinkingCode uses single UPDATE WHERE isNull+gt returning() — atomic claim prevents double-redemption without explicit transaction
- [Phase 05]: PUT /api/gateway-link is public — gateway worker has no user session; security is enforced by one-time code expiry
- [Phase 05-04]: Text fontFamily=mono used for code display instead of Chakra Code component — safer Chakra v3 compatibility
- [Phase 05-04]: generatedCode stored in local state only — not persisted; user must regenerate on page refresh (per plan spec)
- [Phase 06-02]: Flag icon (lucide-react) chosen for report button over Bell — avoids confusion with IconRail notifications bell
- [Phase 06-02]: useRouteContext({ from: '__root__' }) used inside AppHeader to read user — avoids prop-drilling from AppLayout
- [Phase 06-01]: ticketUrl allowed as empty string — valid outcome when Jira doesn't return a browse URL
- [Phase 06-01]: Code fence stripping regex mirrors parseGatewayDecision in chat-sync.tsx for consistent LLM output handling
- [Phase 06-03]: ReportIssueModal accesses user via useRouteContext internally — avoids prop drilling from AppLayout
- [Phase 06-03]: Error state preserves form values (no form.reset()) on Try Again — only clears error state
- [Phase 06-04]: login() helper uses waitForURL with 20s timeout (not waitForResponse) — TanStack Start serverFn navigation timing varies across tests
- [Phase 06-04]: e2e-test user created in DB via pnpm create-user — avoids hardcoding unknown user credentials in Playwright tests
- [Phase 08]: getGitHubMcpTools creates a fresh Client per call — GitHub PAT is per-user unlike Zapier singleton
- [Phase 08]: ServerTool assertion checks __toolSide === 'server' not .server property (exists on ToolDefinition builder, not ServerTool result)
- [Phase 08]: Migration 0011 tracking entry backfilled in drizzle.__drizzle_migrations — same pattern as 01-01
- [Phase 08]: PUT /api/user-settings validates PAT via GitHub REST API but never returns 4xx on network failure — save PAT regardless, connectedAs is null if unreachable
- [Phase 08]: buildChatOptions() loads GitHub tools only when githubPat is non-null AND 'github' not in DISABLE_TOOLS

### Performance Metrics

| Phase | Plan  | Duration | Tasks | Files |
|-------|-------|----------|-------|-------|
| 01    | 01-01 | 3 min    | 3     | 7     |
| 01    | 01-03 | 2 min    | 2     | 3     |
| Phase 01 P01-02 | 2min | 2 tasks | 6 files |
| Phase 01 P01-04 | 2min | 2 tasks | 2 files |
| 02    | 02-01 | 5 min    | 2     | 5     |
| Phase 02 P02-02 | 4 min | 2 tasks | 4 files |
| Phase 02 P02-03 | 3min | 2 tasks | 5 files |
| 02    | 02-04 | 5 min    | 2     | 4     |
| Phase 03-jira-integration P03-01 | 3min | 2 tasks | 2 files |
| Phase 03 P03-02 | 2min | 1 tasks | 4 files |
| Phase 03 P03-03 | 2min | 3 tasks | 1 files |
| Phase 04 P04-01 | 4min | 2 tasks | 9 files |
| Phase 04 P04-02 | 11min | 2 tasks | 25 files |
| Phase 04 P04-03 | 3min | 2 tasks | 8 files |
| Phase 04 P04-04 | 0min | 1 task | 0 files |
| Phase 05 P05-01 | 8min | 2 tasks | 6 files |
| Phase 05 P05-03 | 1min | 1 tasks | 1 files |
| Phase 05 P05-02 | 3 | 2 tasks | 3 files |
| Phase 05 P05-04 | 3min | 1 tasks | 1 files |
| Phase 05 P05-05 | 2min | 1 tasks | 4 files |
| Phase 06 P06-02 | 3min | 1 tasks | 1 files |
| Phase 06 P06-01 | 2min | 2 tasks | 2 files |
| Phase 06 P06-03 | 2min | 2 tasks | 2 files |
| Phase 06 P06-04 | 15min | 2 tasks | 2 files |
| Phase 08 P08-01 | 7min | 3 tasks | 6 files |
| Phase 08 P08-02 | 6min | 2 tasks | 7 files |

