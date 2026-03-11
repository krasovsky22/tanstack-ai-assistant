# Phase 3: jira-integration - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning
**Source:** Direct user specification

<domain>
## Phase Boundary

Add a new LLM-callable tool that integrates with the Jira Server REST API v11. The tool enables the AI assistant to interact with Jira issues: searching via JQL, updating descriptions, managing comments, and assigning tickets — all authenticated via a personal access token stored in environment variables.

</domain>

<decisions>
## Implementation Decisions

### Authentication
- Use Jira personal access token (PAT) stored as an environment variable
- PAT is sent as a Bearer token in the Authorization header
- No OAuth flow required — simple static token configuration

### Tool Capabilities (all 4 must be implemented)
1. **Search/Execute JQL Queries** — find issues matching a JQL query, return relevant fields
2. **Edit/Update Ticket Descriptions** — update the description field of a specific issue
3. **Add Comments to Issues** — post a new comment on a specific issue
4. **Read All Comments** — retrieve all comments for a specific issue
5. **Assign Tickets to Users** — change the assignee of a specific issue

### API Reference
- Documentation: https://developer.atlassian.com/server/jira/platform/rest/v11002/intro/#gettingstarted
- Jira Server REST API v11002 (not Jira Cloud)

### Environment Variables
- Follow existing pattern in project — add to `.env.example` with descriptive comments
- Variables needed: Jira base URL, personal access token, (optionally) default project key

### Integration Pattern
- Follow existing tool patterns in `src/tools/` (see `crontool.ts` for reference)
- Register new tool in `src/tools/index.ts` and `buildChatOptions()` in `src/services/chat.ts`
- Use Zod schema validation for tool inputs

### Claude's Discretion
- Exact field selection for JQL search results (balance verbosity vs usefulness)
- Error handling strategy for Jira API failures
- Whether to implement pagination for large result sets
- Whether to add a "get issue details" convenience tool

</decisions>

<specifics>
## Specific Ideas

- Jira Server REST API v11002 base path: `{baseUrl}/rest/api/2/`
- JQL search endpoint: `GET /rest/api/2/search?jql={query}`
- Issue update: `PUT /rest/api/2/issue/{issueIdOrKey}`
- Add comment: `POST /rest/api/2/issue/{issueIdOrKey}/comment`
- Get comments: `GET /rest/api/2/issue/{issueIdOrKey}/comment`
- Assign issue: `PUT /rest/api/2/issue/{issueIdOrKey}/assignee`

</specifics>

<deferred>
## Deferred Ideas

- OAuth 2.0 / Jira Cloud support
- Webhook integration for real-time issue updates
- Bulk operations across multiple issues
- Jira project management (create projects, manage boards)
- File attachments upload/download

</deferred>

---

*Phase: 03-jira-integration*
*Context gathered: 2026-03-11 via direct user specification*
