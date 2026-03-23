# Roadmap

## Milestone 1: Core Feature Expansion

**Goal:** Extend the AI assistant platform with email ingestion, job matching, and enhanced job tracking.

---

### Phase 1: Yahoo Mail Ingestion & Job Email Tracking

**Goal:** Pull unread mail from Yahoo IMAP, use LLM to classify job-related emails, match to existing jobs or create new ones, persist in a `job_emails` table, and surface email activity on the jobs dashboard and job detail view.

**Depends on:** —

**Plans:** 4/4 plans complete

Plans:
- [ ] 01-01-PLAN.md — DB foundation: job_emails migration, Drizzle schema, job-constants update, env vars, test scaffold
- [ ] 01-02-PLAN.md — Mail ingestion service (IMAP + LLM pipeline) + POST /api/mail/ingest + GET /api/mail/emails
- [ ] 01-03-PLAN.md — Email query APIs: GET /api/mail/email-count + GET /api/mail/emails-by-job
- [ ] 01-04-PLAN.md — UI: mail count badge on JobCard + collapsible email thread on job detail page

### Phase 2: Add Elasticsearch to Docker stack for LLM memory - store generated files, conversations, and cronjob results

**Goal:** Add Elasticsearch as a secondary search/retrieval index alongside Postgres. Index conversations, jobs, cronjob results, and generated resume files. Expose a `search_memory` LLM tool so the agent can recall past context via full-text search.
**Requirements**: MEM-01, MEM-02, MEM-03, MEM-04, MEM-05, MEM-06
**Depends on:** Phase 1
**Plans:** 4/4 plans complete

Plans:
- [ ] 02-01-PLAN.md — Docker Compose ES service + env vars across all workers + Wave 0 test stubs
- [ ] 02-02-PLAN.md — src/services/elasticsearch.ts: client singleton, ensureIndices, indexDocument, searchMemory
- [ ] 02-03-PLAN.md — src/tools/memory.ts: search_memory tool + register in buildChatOptions()
- [ ] 02-04-PLAN.md — Write hooks: index conversations, jobs, cronjob results, and generated files after Postgres writes

### Phase 3: jira-integration

**Goal:** Add 6 LLM-callable tools that integrate with the Jira Server REST API v2, enabling the AI assistant to search issues via JQL, read/update descriptions, manage comments, get issue details, and assign tickets — all authenticated via a personal access token.
**Requirements**: JIRA-01, JIRA-02, JIRA-03, JIRA-04, JIRA-05, JIRA-06, JIRA-07, JIRA-08
**Depends on:** Phase 2
**Plans:** 3/3 plans complete

Plans:
- [ ] 03-01-PLAN.md — Wave 0 test stubs: jiratool.test.ts (JIRA-01–07) + chat.test.ts (JIRA-08), RED before implementation
- [ ] 03-02-PLAN.md — src/tools/jiratool.ts: jiraFetch helper + 6 tools (search, get, update-desc, add-comment, get-comments, assign)
- [ ] 03-03-PLAN.md — Wiring: export from index.ts, register in buildChatOptions() under 'jira' key, document env vars in .env.example

### Phase 4: user-authentication

**Goal:** Add user authentication using TanStack Router's pathless layout route pattern with server-side encrypted cookie sessions. Delivers: users table, login page, protected routes for all existing pages, per-user data scoping on jobs/cronjobs/conversations, and a CLI user-creation script.
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Depends on:** Phase 3
**Plans:** 4/4 plans complete

Plans:
- [ ] 04-01-PLAN.md — DB foundation: users table migration, user_id FK on jobs/cronjobs/cronjobLogs, bcryptjs install, create-user script, Wave 0 test stubs
- [ ] 04-02-PLAN.md — Auth wiring: session service, root user hydration, login/logout routes, _protected pathless layout, move all page routes under _protected/
- [ ] 04-03-PLAN.md — API user-scoping: filter jobs/cronjobs/conversations by session userId; /api/chat reads userId from session
- [ ] 04-04-PLAN.md — Human verification: full E2E auth flow checkpoint

### Phase 5: gateway-identity-linking

**Goal:** Link Telegram (and future gateway) user IDs to internal users via a code-based flow. Block unlinked users at the gateway with a linking prompt. Add a Settings UI to view and manage linked gateway identities.
**Requirements**: GID-01, GID-02, GID-03, GID-04, GID-05, GID-06, GID-07
**Depends on:** Phase 4
**Plans:** 5/5 plans complete

Plans:
- [ ] 05-01-PLAN.md — DB foundation: gatewayIdentities + linkingCodes schema, migration 0011, Wave 0 RED test stubs (GID-01–GID-07)
- [ ] 05-02-PLAN.md — Service + API: gateway-identity.ts (6 functions), GET/DELETE /api/gateway-identities, POST/PUT /api/gateway-link
- [ ] 05-03-PLAN.md — Gateway handler: /link CODE intercept, unlinked user blocking, userId propagation to chat-sync
- [ ] 05-04-PLAN.md — Settings UI: GatewayIdentitiesCard with generate code + linked identities list
- [ ] 05-05-PLAN.md — Human verification: full suite green + Settings UI card confirmed

---
