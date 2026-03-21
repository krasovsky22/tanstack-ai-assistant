# Jira Ticket Management Guide

This guide covers best practices for creating, updating, and managing Jira tickets.

---

## Quick Start: Creating Tickets

**You don't need to fill in all the details upfront.** Create a ticket with just:
- **Summary** — What needs to be done
- **Type** — Story, Bug, Task, or Epic

That's it. Then add details later as you learn more.

**Example:**
```
Summary: Add dark mode toggle to settings
Type: Story
→ Create
```

Done in 5 seconds. Then add acceptance criteria and details during refinement.

---

## General Best Practices

### Be Clear

- Use simple, precise language
- Describe exactly what needs to be done
- Avoid ambiguous or vague terminology
- Use technical accuracy without jargon when possible

### Provide Context

- Explain **why the work is needed**, not just **what to build or fix**
- Link related tickets or dependencies
- Reference relevant documentation or external resources
- Explain business or user impact

### Make It Testable

- Someone should be able to verify the work using only the ticket description
- Define clear acceptance criteria
- Include steps to reproduce (for bugs)
- Describe expected outcomes

### Define Acceptance Criteria

- State clear, measurable conditions that define when the ticket is **done**
- Use checkbox format for easy tracking
- Include both functional and non-functional requirements (performance, security, etc.)
- Reference testing requirements

### Keep It Short

- Only include information necessary to understand and complete the task
- Use templates to organize information consistently
- Link to external documentation rather than copying it
- Remove outdated or resolved comments

### Ticket Metadata

- Assign to appropriate team member
- Set correct priority and labels
- Estimate story points if using Agile
- Set target fix/completion date when applicable
- Use consistent naming conventions in summaries

---

## Updating Existing Tickets

### Keep Tickets Updated

- Update status as work progresses
- Add comments for blockers or decisions
- Link newly discovered related tickets
- Remove resolved/outdated information

### Comment Best Practices

- Reference specific code, line numbers, or commits
- Explain decision rationale, not just what was done
- Use mentions (@) to notify relevant team members
- Keep technical details in descriptions, summaries in comments

### Resolution

- Update ticket before moving to Done
- Link to PR/merge request for verification
- Note any known limitations or workarounds
- Provide deployment instructions if needed

---

## Ticket Types & Templates

### Story Template

**Usage**: For user-facing features and capabilities. Use when work involves user interactions or visible functionality.

**Minimal story** (quick creation):
```
Summary: [What feature to build]
Type: Story
Priority: Medium
```

**Detailed story** (for complex features):

```md
## Summary

Short, clear description of the feature.

## Problem

Describe the problem this feature solves or the user need it addresses.
Explain the business or user impact.

## Solution

High-level explanation of how the feature should work.
Include any architectural considerations.

## Scope

### In Scope

- Feature component/behavior 1
- Feature component/behavior 2
- Integration point 1

### Out of Scope

- Related feature not included in this ticket
- Nice-to-have functionality
- Future optimization

## User Story

As a **[user/role]**, I want **[capability]**, so that **[benefit]**.

## Acceptance Criteria

- [ ] Feature is implemented and works as described
- [ ] Unit tests are written for core logic
- [ ] Code review completed and approved
- [ ] Documentation updated (if applicable)
- [ ] No regression in existing functionality
- [ ] Performance impact assessed (if applicable)

## Technical Notes

- Relevant files/components involved
- Dependencies or integration points
- Potential performance considerations
- Security considerations (if applicable)

## Notes

Optional implementation notes or references.
```

---

### Bug Template

**Usage**: For defects and issues that need fixing. Use when reporting broken functionality.

**Minimal bug report** (quick creation):
```
Summary: [What's broken]
Type: Bug
Priority: Medium
```

**Detailed bug report** (for complex issues):

```md
## Summary

Short, clear description of the bug.

## Environment

- Environment: Production / Staging / Development / Local
- Version/Branch:
- Browser/Device (if applicable):

## Steps to Reproduce

1. Step one
2. Step two
3. Step three
   ...

## Expected Result

Describe what should happen.
Include expected behavior based on requirements.

## Actual Result

Describe what currently happens instead.
Include actual behavior observed.

## Impact

Describe the severity and impact of the bug.

Examples:
- **Critical**: Blocks user workflow / Data loss / Production down
- **High**: Incorrect data / Major UI issue / Performance degradation
- **Medium**: Minor UI issue / Limited user impact
- **Low**: Cosmetic issue / Edge case

## Reproduction Frequency

- Always
- Sometimes (X% of the time)
- Rare / Only under specific conditions

## Error Logs / Screenshots

Attach relevant logs, stack traces, or screenshots.

## Debugging Information

- Browser console errors
- Network request details
- Database queries executed
- Relevant environment variables

## Notes

Optional additional debugging information or context.
```

---

### Task Template

**Usage**: For technical work, database changes, maintenance, and implementation details.

**Minimal task** (quick creation):
```
Summary: [What work to do]
Type: Task
Priority: Medium
```

**Detailed task** (for complex work, especially database changes):

**Important**: Database changes are high-risk and require careful review.

```md
## Summary

Short description of the task.

## Database Details

(Only needed for database tasks)

- **Server**: [SERVER_NAME]
- **Database**: [DATABASE_NAME]
- **Type**: Schema change / Data update / Maintenance / Query optimization

## Change Description

Detailed explanation of the change and why it's needed.

## SQL Query

\`\`\`sql
-- Your SQL query here
-- Be specific and include comments where needed
\`\`\`

## Risk Assessment

- **Risk Level**: Danger / Average / No Risk
- **Reasoning**: Explain why this risk level was assigned
- **Rollback Plan**: How can this be rolled back if needed?

## Data Impact

- Rows affected (estimated):
- Tables affected:
- Downtime required (if any):

## Backup Requirements

- Is backup needed before execution? Yes / No
- Backup plan:

## Verification Steps

1. Step to verify change was applied correctly
2. Step to check data integrity
3. Step to validate performance impact

## Prerequisites

- [ ] Database backup completed
- [ ] Query tested in development environment
- [ ] Peer reviewed by another developer
- [ ] Rollback plan documented
- [ ] Business approval obtained (if required)

## Notes

Additional context or dependencies.
```

---

## Creating vs Updating Tickets

### When Creating a New Ticket

1. **Search for duplicate tickets FIRST**
   - Search using keywords from the summary
   - Look for similar issues, bugs, or features already reported
   - If duplicates are found:
     - Display each duplicate with its summary, status, and key
     - Ask for confirmation: "Duplicate tickets found. Do you still want to create this ticket?"
     - Link to the duplicate if you proceed with creating the new ticket
     - Consider commenting on existing ticket instead of creating new one

2. **Minimum required fields**:
   - **Summary** — Short, clear description of what needs to be done
   - **Type** — Epic / Story / Task / Bug
   - **Priority** — Default to Medium

3. **Optional but recommended**:
   - Description (use templates below for context)
   - Acceptance criteria
   - Labels
   - Assignment

**Note**: You can create a ticket with just a summary and type. Fill in details later as you learn more. Tickets can be refined during refinement sessions or before work starts.

### When Updating a Ticket

1. **Update status** to reflect current state
2. **Add meaningful comments** with decisions and blockers
3. **Link newly discovered** related or blocked tickets
4. **Update acceptance criteria** if scope changes (note the change)
5. **Provide evidence** (links to PRs, commits, screenshots)
6. **Clean up** resolved comments or outdated information
7. **Notify stakeholders** if there are significant changes

---

## Priority Guidelines

**Default priority is Medium.** Adjust up or down only if the ticket clearly falls into a different category.

- **Highest**: Production down / Data loss / Security vulnerability / Blocks deployment
- **High**: Major feature / Critical bug / Significant impact
- **Medium** (Default): Standard feature / Non-critical bug / Technical debt / Regular work
- **Low**: Minor issue / Nice-to-have / Cosmetic improvements
- **Lowest**: Future optimization / Edge cases / Discussion items

---

## Labels & Metadata Best Practices

### Use Consistent Labels

- `bug` — for bug fixes
- `feature` — for new features
- `enhancement` — for improvements to existing features
- `documentation` — for docs updates
- `technical-debt` — for refactoring/cleanup
- `security` — for security-related work
- `performance` — for performance improvements

### Link Tickets

- Link blockers: "is blocked by"
- Link dependencies: "relates to"
- Link duplicates: "duplicated by" or "duplicates"
- Link implementations: link epic to story to task

---

## Common Mistakes to Avoid

- ❌ Vague summaries ("Fix stuff", "Updates")
- ❌ Missing acceptance criteria
- ❌ No context on why the work is needed
- ❌ Over-scoping tickets (too large to complete in one sprint)
- ❌ Forgetting to link related tickets
- ❌ Not updating tickets as work progresses
- ❌ Creating Tasks with database changes without risk assessment
- ❌ Mixing multiple work types in a single ticket (use Epic to link related items)

---

## Quick Reference

| Aspect                  | Best Practice                                                     |
| ----------------------- | ----------------------------------------------------------------- |
| **Minimum to create**    | Summary + Type + Priority (or just Summary + Type)                |
| **Quick create**         | "Feature X" → Story → Medium (3 seconds)                          |
| **Default Priority**     | Medium — adjust only if clearly different                         |
| **Duplicate Check**      | Mandatory search before creating, show duplicates                 |
| **Templates**            | Optional guides for detailed tickets, not required                |
| **When to use templates**| Complex work that needs context, database changes, high-risk work |
| **Refinement**           | Add details later: description, acceptance criteria, scope        |
| **Ticket Size**          | Should fit in one sprint                                          |
| **Update Frequency**     | As status changes                                                 |
