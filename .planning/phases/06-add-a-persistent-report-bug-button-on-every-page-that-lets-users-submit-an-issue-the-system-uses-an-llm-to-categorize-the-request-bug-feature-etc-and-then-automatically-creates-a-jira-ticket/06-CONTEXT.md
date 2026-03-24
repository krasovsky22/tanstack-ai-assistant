# Phase 6: Report Bug / Suggestion Box - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a persistent report/suggestion entry point on every protected page. Users fill in a title and description, submit, and the system silently classifies the request (Bug / Feature / Other) via the LLM and automatically creates the corresponding Jira ticket. The entry point lives in a new top header bar — not the IconRail.

</domain>

<decisions>
## Implementation Decisions

### Header Bar (New UI Layer)
- Add a persistent top header bar to the protected app layout (`_protected.tsx` or `__root.tsx` AppLayout)
- Header layout: logo/app name on the left, bell icon + user avatar on the right
- Reference: the attached screenshot showing "Overview" with a bell icon and user avatar/name in the top-right
- Visible only on protected pages (login page has no header)
- The header sits above the existing `<Outlet />` content area

### Entry Point — Bell Icon
- A bell icon button in the top-right header area opens the report modal
- Label next to icon (not icon-only)
- Clicking the bell opens the ReportIssueModal

### Report Form
- Fields: **Title** (short summary) + **Description** (freeform)
- Built with **TanStack Form** (`@tanstack/react-form`) — reference: https://tanstack.com/form/latest/docs/overview
- Use the existing `AppModal` component as the modal shell
- No attachments or file upload

### Auto-context
- Current page URL is automatically captured at submission time (via `window.location.href`)
- Included in the Jira ticket description — not shown to the user as a field

### Submission Flow
- User submits → spinner/loading state inside the modal
- Request routes through **`/api/chat-sync`** — the LLM classifies the issue and creates the Jira ticket via existing Jira tools
- On success: show success state inside the modal with:
  - The LLM-assigned category label (e.g. "Bug report created" / "Feature request created")
  - A link to the created Jira ticket
- On error: show an inline error message, keep the form data so the user can retry

### LLM Classification
- Silent — user never picks or sees the category before submission
- Categories: **Bug**, **Feature**, **Other**
- Map to Jira issue types: Bug → `Bug`, Feature → `Story`, Other → `Task`
- The LLM prompt instructs classification before calling `jira_create_issue` with the correct type

### Visibility
- Only logged-in users see the header with the bell icon
- The login page is excluded (consistent with IconRail behavior)

### Claude's Discretion
- Exact header height and styling (must integrate visually with the existing IconRail + content layout)
- User avatar appearance in the header (initials vs placeholder icon)
- Whether the header also shows the current page title or just logo + actions
- Exact system prompt sent to /api/chat-sync for classification

</decisions>

<specifics>
## Specific Ideas

- User reference: Grafana-style top header — "Overview" as page title on left, bell + colored avatar + username + chevron on right
- TanStack Form is explicitly required for the report form (not React Hook Form or uncontrolled)
- The success state should display the category name naturally: "Bug report created ✓" with the Jira ticket URL as a link

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AppModal` (`src/components/AppModal.tsx`): Dialog shell with title, body, footer slots — use as the report modal container
- `IconRail` (`src/components/IconRail.tsx`): Existing nav pattern for icon buttons, including `RailIcon` with hover/active states — reference for icon button styling in the new header
- `/api/chat-sync`: Existing synchronous LLM endpoint used by gateway and cron workers — takes a prompt, returns LLM response; Jira tools already registered here
- Jira tools (`src/tools/`): `jira_create_issue` already wired into `buildChatOptions()` — available in chat-sync without new tool registration

### Established Patterns
- Chakra UI for all components (Box, Flex, IconButton, Button, Text, Spinner, etc.)
- `lucide-react` for icons (Bell, User, etc. — consistent with existing icons in IconRail)
- `AppLayout` in `__root.tsx` wraps the full app — the new header belongs here, scoped to protected routes

### Integration Points
- `__root.tsx` `AppLayout`: Add header above the `<Box flex="1">` content area, only when `!isLoginPage`
- `/api/chat-sync` (`src/routes/api/chat-sync.tsx`): Route the classification + Jira creation call here; pass title, description, and current URL in the prompt body
- `_protected.tsx` context: `context.user` is available — use for user display in the header avatar

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-report-bug-button*
*Context gathered: 2026-03-24*
