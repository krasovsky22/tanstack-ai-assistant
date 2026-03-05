# Roadmap

## Milestone 1: Core Feature Expansion

**Goal:** Extend the AI assistant platform with email ingestion, job matching, and enhanced job tracking.

---

### Phase 1: Yahoo Mail Ingestion & Job Email Tracking

**Goal:** Pull unread mail from Yahoo IMAP, use LLM to classify job-related emails, match to existing jobs or create new ones, persist in a `job_emails` table, and surface email activity on the jobs dashboard and job detail view.

**Depends on:** —

**Plans:** 3/4 plans executed

Plans:
- [ ] 01-01-PLAN.md — DB foundation: job_emails migration, Drizzle schema, job-constants update, env vars, test scaffold
- [ ] 01-02-PLAN.md — Mail ingestion service (IMAP + LLM pipeline) + POST /api/mail/ingest + GET /api/mail/emails
- [ ] 01-03-PLAN.md — Email query APIs: GET /api/mail/email-count + GET /api/mail/emails-by-job
- [ ] 01-04-PLAN.md — UI: mail count badge on JobCard + collapsible email thread on job detail page

---
