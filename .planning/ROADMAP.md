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
**Plans:** 3/4 plans executed

Plans:
- [ ] 02-01-PLAN.md — Docker Compose ES service + env vars across all workers + Wave 0 test stubs
- [ ] 02-02-PLAN.md — src/services/elasticsearch.ts: client singleton, ensureIndices, indexDocument, searchMemory
- [ ] 02-03-PLAN.md — src/tools/memory.ts: search_memory tool + register in buildChatOptions()
- [ ] 02-04-PLAN.md — Write hooks: index conversations, jobs, cronjob results, and generated files after Postgres writes

---
