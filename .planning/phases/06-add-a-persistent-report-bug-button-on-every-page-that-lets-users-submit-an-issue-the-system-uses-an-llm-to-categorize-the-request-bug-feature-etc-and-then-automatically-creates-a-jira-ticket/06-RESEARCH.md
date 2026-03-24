# Phase 6: Report Bug / Suggestion Box - Research

**Researched:** 2026-03-24
**Domain:** UI header bar, TanStack Form, LLM classification via /api/chat-sync, Jira ticket creation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Add a persistent top header bar to the protected app layout (`_protected.tsx` or `__root.tsx` AppLayout)
- Header layout: logo/app name on the left, bell icon + user avatar on the right
- Visible only on protected pages (login page has no header)
- The header sits above the existing `<Outlet />` content area
- A bell icon button in the top-right header area opens the report modal
- Label next to icon (not icon-only)
- Fields: **Title** (short summary) + **Description** (freeform)
- Built with **TanStack Form** (`@tanstack/react-form`) — reference: https://tanstack.com/form/latest/docs/overview
- Use the existing `AppModal` component as the modal shell
- No attachments or file upload
- Current page URL is automatically captured at submission time (via `window.location.href`)
- Included in the Jira ticket description — not shown to the user as a field
- User submits → spinner/loading state inside the modal
- Request routes through **`/api/chat-sync`** — the LLM classifies the issue and creates the Jira ticket via existing Jira tools
- On success: show success state with the LLM-assigned category label and a link to the created Jira ticket
- On error: show an inline error message, keep the form data so the user can retry
- LLM classification is silent — user never picks or sees the category before submission
- Categories: **Bug**, **Feature**, **Other** → Jira types: Bug → `Bug`, Feature → `Story`, Other → `Task`
- Only logged-in users see the header with the bell icon

### Claude's Discretion

- Exact header height and styling (must integrate visually with the existing IconRail + content layout)
- User avatar appearance in the header (initials vs placeholder icon)
- Whether the header also shows the current page title or just logo + actions
- Exact system prompt sent to /api/chat-sync for classification

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 6 adds a persistent top header bar to every protected page containing a bell icon + label that opens a `ReportIssueModal`. The modal presents a two-field form (Title + Description) built with `@tanstack/react-form` v1.x, which is already installed in the project. On submit, the form POSTs to `/api/chat-sync` with a system prompt instructing the LLM to classify the issue and call `jira_create_issue`. The Jira tool is already wired into `buildChatOptions()` and available in chat-sync without any new tool registration.

The main implementation surfaces are: (1) adding the `AppHeader` component to `AppLayout` in `__root.tsx` scoped to non-login routes, (2) building the `ReportIssueModal` with TanStack Form, and (3) crafting the system prompt that drives silent LLM classification. No new API routes, no new tools, no DB migrations are needed for this phase.

**Primary recommendation:** Build AppHeader as a standalone Chakra Flex component rendered inside `AppLayout` only when `!isLoginPage`, at the same level as `IconRail`. Adjust the main `<Box>` content area to add a top padding/margin equal to the header height so content does not slide under the fixed header.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-form` | ^1.28.3 (installed) | Form state, submission, validation | Explicitly required by user decision; already installed |
| `@chakra-ui/react` | ^3.34.0 (installed) | All UI primitives (Flex, Box, Button, Input, Textarea, Spinner, Text) | Project-wide UI standard |
| `lucide-react` | installed | Icons (Bell, User, AlertCircle, CheckCircle2, ExternalLink) | Already used in IconRail |
| `@tanstack/react-router` | installed | `useRouterState` for current pathname detection | Already used in AppLayout and IconRail |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^4.3.6 (installed) | Form field validation schemas | Use for title min-length validation on submit |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@tanstack/react-form` | `react-hook-form` | User explicitly locked TanStack Form — do not switch |
| `/api/chat-sync` | New dedicated endpoint | chat-sync already has Jira tools registered — no new route needed |
| Custom classification logic | LLM via system prompt | LLM classification is simpler and already proven via existing gateway/cron patterns |

**Installation:** No new packages needed — all dependencies are already installed.

---

## Architecture Patterns

### Recommended Component Structure

```
src/components/
├── AppHeader.tsx           # new — top header bar, bell button, avatar
├── ReportIssueModal.tsx    # new — TanStack Form modal with 3 states: form / loading / success
└── AppModal.tsx            # existing — use as modal shell (no changes)
```

**`__root.tsx` change:** Insert `<AppHeader />` inside `AppLayout`, immediately before the `<Box flex="1">` content wrapper, rendered only when `!isLoginPage`. The content `<Box>` needs `pt` (padding-top) matching the header height (e.g. `"56px"`) so page content is not hidden behind the fixed header.

### Pattern 1: AppLayout Integration

**What:** Add a fixed-position (or sticky) header bar above the scrollable content area, scoped to non-login pages.

**When to use:** Any layout-level persistent UI element visible across all protected routes.

**Example:**
```tsx
// Source: __root.tsx AppLayout — existing pattern extended
function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoginPage = pathname === '/login';

  // ... existing sidebar logic ...

  return (
    <Flex minH="100vh" bg="bg.page">
      {!isLoginPage && <IconRail />}
      {!isLoginPage && <AppHeader />}       {/* NEW */}
      {/* ... ChatSidebar ... */}
      <Box
        flex="1"
        ml={mainMargin}
        pt={isLoginPage ? '0' : '56px'}      {/* NEW: clear header height */}
        minH="100vh"
        overflowY="auto"
        transition="margin-left 0.2s"
      >
        {children}
      </Box>
    </Flex>
  );
}
```

### Pattern 2: TanStack Form with Three Modal States

**What:** A single modal component managed with a local `modalState` enum (`'form' | 'loading' | 'success' | 'error'`) driven by TanStack Form's `onSubmit`.

**When to use:** Any async form submission that needs distinct UI phases after submit.

**Example:**
```tsx
// Source: https://tanstack.com/form/latest/docs/framework/react/quick-start
import { useForm } from '@tanstack/react-form';

const form = useForm({
  defaultValues: { title: '', description: '' },
  onSubmit: async ({ value }) => {
    // POST to /api/chat-sync, parse ticket URL from response
    // On success: setModalState('success'), setTicketInfo({ category, url })
    // On error: throw — form will surface via form.state.isSubmitting
  },
});

// In JSX:
<form.Subscribe
  selector={(s) => [s.isSubmitting, s.isSubmitSuccessful]}
  children={([isSubmitting]) => (
    <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
      Submit
    </Button>
  )}
/>
```

### Pattern 3: /api/chat-sync — Non-Gateway Flow

**What:** POST to `/api/chat-sync` without a `chatId`, which uses the non-gateway code path: run LLM + tools, return `{ text }`.

**When to use:** Any client-side fire-and-classify-then-act scenario that should not persist a conversation.

**Payload:**
```ts
// Source: src/routes/api/chat-sync.tsx — non-chatId branch, line 97–119
const res = await fetch('/api/chat-sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: context.user?.userId,   // from route context — enables Jira user settings lookup
    messages: [
      {
        role: 'user',
        content: `<system prompt + title + description + url>`,
      },
    ],
  }),
});
const { text, error } = await res.json();
// text contains the LLM's final response — parse category label and ticket URL/key from it
```

**Critical:** The `userId` field causes `getUserSettings` to load the user's Jira credentials. Without it, `getJiraConfig` returns null and `jira_create_issue` will fail.

### Pattern 4: LLM Prompt for Silent Classification

**What:** A system-style prompt embedded in the user message content that instructs the LLM to classify and create a ticket without conversational preamble.

**Recommended prompt template (Claude's Discretion area):**
```
You are a bug triage assistant. A user has submitted a report from the web app.

Classify the report as exactly one of: Bug, Feature, or Other.
- Bug → create a Jira issue with issueType "Bug"
- Feature → create a Jira issue with issueType "Story"
- Other → create a Jira issue with issueType "Task"

After creating the ticket, respond with ONLY valid JSON:
{"category":"<Bug|Feature|Other>","ticketKey":"<PROJ-NNN>","ticketUrl":"<url>"}

User report:
Title: ${title}
Description: ${description}
Submitted from: ${pageUrl}
```

**Why JSON-only response:** The non-gateway flow returns `{ text }` directly. Structured JSON makes parsing reliable and avoids regex heuristics.

### Anti-Patterns to Avoid

- **Mounting modal in each page:** Mount `ReportIssueModal` once in `AppHeader` or at the AppLayout level. Mounting per-page causes duplicate instances and state reset on route change.
- **Reading `window.location.href` at component mount:** Capture at form submit time (`onSubmit`) not at component render — the user may navigate after opening the modal.
- **Omitting `userId` from chat-sync payload:** Without `userId`, `getUserSettings` returns null, Jira config is unavailable, and `jira_create_issue` returns a config error.
- **Using `chatId` in the payload:** The non-gateway flow (no `chatId`) is correct for this feature — the gateway JSON-action parsing logic should not run here.
- **Parsing ticket URL with regex from verbose LLM response:** Instruct the LLM to return structured JSON so parsing is deterministic.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state and submission | Custom `useState` per field + manual submit handler | `useForm` from `@tanstack/react-form` | Already installed; handles `isSubmitting`, error state, and field subscription |
| Issue classification | Client-side keyword matching | LLM via `/api/chat-sync` | Handles ambiguous language, multilingual input, and future category expansion without code changes |
| Jira ticket creation | Direct Jira REST API call from client | `jira_create_issue` via `buildChatOptions()` in chat-sync | Tool already handles ADF conversion, project key defaulting, error normalisation |
| Modal shell | Custom Dialog component | `AppModal` (`src/components/AppModal.tsx`) | Already built with Chakra v3 Dialog, title/body/footer slots, close trigger |
| Icon buttons | Custom styled buttons | `RailIcon` pattern or Chakra `IconButton` | Consistent hover/active states match existing IconRail styling |

**Key insight:** Every non-trivial piece of infrastructure (Jira integration, LLM call, modal shell, form library) already exists in the codebase. This phase is primarily UI composition.

---

## Common Pitfalls

### Pitfall 1: Header Overlaps Page Content

**What goes wrong:** The AppHeader is `position="fixed"` (or sticky), so it overlays the top of page content without adjustment.

**Why it happens:** The existing `AppLayout` `<Box flex="1">` has no top padding. Adding a fixed header without compensating pt/mt causes content to render under the header.

**How to avoid:** Add `pt="56px"` (matching header height, e.g. `h="56px"`) to the main content `<Box>` when `!isLoginPage`.

**Warning signs:** Page headings are clipped or partially hidden on first load.

### Pitfall 2: Jira Tool Returns Config Error

**What goes wrong:** `jira_create_issue` silently returns `{ success: false, error: "Jira is not configured..." }`. The LLM may include this in its `text` response or hallucinate a ticket URL.

**Why it happens:** `userId` was omitted from the chat-sync payload, so `getUserSettings` returns null, and `getJiraConfig` fails.

**How to avoid:** Always pass `userId` from `context.user?.userId` in the POST body. Consider parsing the response JSON's `success` field and surfacing "Jira not configured" as a specific user-facing error message.

**Warning signs:** LLM response text mentions "Jira is not configured" or `ticketKey` is null/undefined in parsed JSON.

### Pitfall 3: Bell Icon Conflicts with Existing Bell in IconRail

**What goes wrong:** The new header bell icon (Report Issue) is visually confused with the existing `Bell` icon in the IconRail (Notifications).

**Why it happens:** Both use `lucide-react`'s `Bell` icon. The IconRail bell navigates to `/notifications`; the header bell opens the report modal.

**How to avoid:** Use a different icon for the report entry point (e.g. `BugIcon`, `Flag`, `AlertCircle`, or `MessageCircleWarning` from lucide-react) OR label the header button clearly ("Report Issue" text label next to icon, as required by the decisions). The label makes the distinction unambiguous.

**Warning signs:** User testing confusion between notification bell and report button.

### Pitfall 4: LLM Response Not JSON / Parsing Failure

**What goes wrong:** The LLM returns verbose prose instead of the expected JSON, causing `JSON.parse` to throw. The modal enters an error state even on successful ticket creation.

**Why it happens:** The system prompt was not strict enough, or the LLM added markdown code fences around the JSON.

**How to avoid:** (a) The prompt must say "respond with ONLY valid JSON, no markdown, no code blocks". (b) Apply the same cleanup used in `parseGatewayDecision` in `chat-sync.tsx` — strip leading/trailing code fences before parsing.

**Warning signs:** `JSON.parse` error in the browser console; `ticketKey` missing from parsed response.

### Pitfall 5: AppHeader Context Access

**What goes wrong:** `context.user` is not accessible in `AppHeader` when mounted in `__root.tsx` `AppLayout`, because `AppLayout` is a plain React component, not a route component with TanStack Router context.

**Why it happens:** `createRootRoute.beforeLoad` returns `{ user }`, but that is only available in route components via `useRouteContext()`. The `AppLayout` function does not receive router context directly.

**How to avoid:** In `__root.tsx`, the `fetchUser` server function is already called in `beforeLoad`. Read user from route context using `useRouteContext({ from: '__root__' })` inside `AppHeader`, or pass the user down as a prop from a route component that has context access. Alternatively, since `fetchUser` is a server function, call it again inside `AppHeader` with `useQuery` using the session or expose the user via a context provider set up in `__root.tsx`.

**Warning signs:** `context.user` is `undefined` inside `AppHeader`, avatar displays placeholder always.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### TanStack Form Basic Submit with Loading State
```tsx
// Source: https://tanstack.com/form/latest/docs/framework/react/quick-start
import { useForm } from '@tanstack/react-form';

const form = useForm({
  defaultValues: { title: '', description: '' },
  onSubmit: async ({ value }) => {
    const res = await fetch('/api/chat-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.userId,
        messages: [{ role: 'user', content: buildPrompt(value, window.location.href) }],
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error ?? 'Request failed');
    const parsed = JSON.parse(cleanJson(data.text));
    setTicketInfo({ category: parsed.category, url: parsed.ticketUrl });
    setSubmitState('success');
  },
});

// Submit button pattern
<form.Subscribe
  selector={(s) => s.isSubmitting}
  children={(isSubmitting) => (
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? <Spinner size="sm" /> : 'Submit'}
    </Button>
  )}
/>
```

### AppModal Usage (existing component)
```tsx
// Source: src/components/AppModal.tsx
<AppModal
  isOpen={isOpen}
  onClose={() => { form.reset(); setSubmitState('form'); onClose(); }}
  title="Report an Issue"
  footer={/* submit/cancel buttons */}
>
  {/* form fields or success state */}
</AppModal>
```

### /api/chat-sync Non-Gateway Call
```tsx
// Source: src/routes/api/chat-sync.tsx lines 97-119 (non-chatId branch)
// Pass userId so Jira user settings are loaded:
body: JSON.stringify({
  userId: user?.userId,          // REQUIRED for Jira config resolution
  messages: [{ role: 'user', content: prompt }],
  // No chatId → triggers non-gateway branch, no conversation persisted
})
```

### Route Context Access in __root.tsx Component
```tsx
// Source: src/routes/__root.tsx - fetchUser already in beforeLoad
// Access user context inside a component mounted under the root route:
import { useRouteContext } from '@tanstack/react-router';

function AppHeader() {
  const { user } = useRouteContext({ from: '__root__' });
  // user: { userId: string, username: string } | null
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-hook-form` | `@tanstack/react-form` v1.x | Project baseline | Use TanStack Form — already installed, user locked |
| Manual fetch + useState | TanStack Form `onSubmit` async + `form.state.isSubmitting` | TanStack Form v1 | Reduces boilerplate, eliminates manual loading flag |
| Chakra v2 `useDisclosure` | Chakra v3 `Dialog.Root open={isOpen}` | Chakra v3 migration | `AppModal` already uses v3 pattern — pass `isOpen` bool directly |

---

## Open Questions

1. **Route context access for user in AppHeader**
   - What we know: `fetchUser` runs in `beforeLoad` of `createRootRoute`, result stored in router context as `{ user }`
   - What's unclear: Whether `useRouteContext({ from: '__root__' })` works inside a component rendered from `shellComponent: RootDocument` vs a standard route component
   - Recommendation: Try `useRouteContext({ from: '__root__' })` first. If unavailable (because AppLayout is rendered by RootDocument's shellComponent path), lift user into a React context (e.g. `UserContext`) provided by the root layout. This is a small wrapper addition.

2. **Parsing ticket URL from LLM response**
   - What we know: The non-gateway chat-sync returns `{ text: string }` — the LLM's final text output
   - What's unclear: Whether the LLM will consistently include the full ticket URL or only the key; Jira Server vs Cloud URL patterns differ
   - Recommendation: Instruct the LLM to return `ticketUrl` in the JSON. If blank/null, construct URL client-side from `ticketKey` + known `jiraBaseUrl` (available in user settings if needed).

3. **Header position: fixed vs sticky**
   - What we know: IconRail is `position="fixed"` at `zIndex={100}`
   - What's unclear: Whether header should be fixed (always visible on scroll) or sticky (scrolls away)
   - Recommendation: Use `position="fixed"` at `top=0`, `left={ICON_RAIL_WIDTH}` (60px), `right=0`, `zIndex={99}` (below IconRail) for consistency with existing fixed sidebar. Add `pt="56px"` to content area.

---

## Validation Architecture

> `workflow.nyquist_validation` is absent from `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^3.0.5 |
| Config file | none — Vitest auto-discovers via `vite.config.ts` |
| Quick run command | `pnpm vitest run src/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RPT-01 | `buildReportPrompt()` produces valid JSON-requesting prompt with title, description, url | unit | `pnpm vitest run src/lib/report-issue.test.ts` | Wave 0 |
| RPT-02 | `parseTicketResponse()` correctly parses `{category, ticketKey, ticketUrl}` from JSON string | unit | `pnpm vitest run src/lib/report-issue.test.ts` | Wave 0 |
| RPT-03 | `parseTicketResponse()` handles JSON wrapped in markdown code fences | unit | `pnpm vitest run src/lib/report-issue.test.ts` | Wave 0 |
| RPT-04 | `parseTicketResponse()` returns error shape on unparseable input | unit | `pnpm vitest run src/lib/report-issue.test.ts` | Wave 0 |
| RPT-05 | Header renders bell button and avatar only on protected routes (not /login) | manual/Playwright | Playwright QA agent | Wave 0 |
| RPT-06 | Form submission sends correct payload to /api/chat-sync including userId | manual/Playwright | Playwright QA agent | Wave 0 |

**Note:** UI component rendering tests (RPT-05, RPT-06) are integration/Playwright concerns; the CLAUDE.md workflow requires invoking the `playwright-qa-tester` agent after UI implementation.

### Sampling Rate

- **Per task commit:** `pnpm vitest run src/lib/report-issue.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/report-issue.ts` — `buildReportPrompt()` and `parseTicketResponse()` helpers (covers RPT-01 through RPT-04)
- [ ] `src/lib/report-issue.test.ts` — unit tests for above helpers

*(No framework install gaps — Vitest already in devDependencies)*

---

## Sources

### Primary (HIGH confidence)

- Codebase: `src/routes/__root.tsx` — AppLayout structure, isLoginPage pattern, user fetch
- Codebase: `src/components/AppModal.tsx` — Chakra v3 Dialog.Root API, props interface
- Codebase: `src/components/IconRail.tsx` — RailIcon pattern, icon library, fixed positioning, zIndex=100
- Codebase: `src/routes/api/chat-sync.tsx` — non-gateway flow (no chatId), payload shape, userId → jira settings chain
- Codebase: `src/tools/jiratool.ts` — `jira_create_issue` tool signature, `issueType` field, error shape
- Codebase: `src/services/jira.ts` — `getJiraConfig`, `JIRA_CONFIG_ERROR` constant
- Official docs: https://tanstack.com/form/latest/docs/framework/react/quick-start — `useForm`, `form.Subscribe`, `isSubmitting`, field-level errors

### Secondary (MEDIUM confidence)

- Official docs: https://tanstack.com/form/latest/docs/overview — `onSubmit` async pattern, data preservation on error

### Tertiary (LOW confidence)

- Inferred: `useRouteContext({ from: '__root__' })` works inside RootDocument shellComponent context — needs verification during implementation (see Open Questions)

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries are already installed and verified in package.json
- Architecture: HIGH — integration points verified by direct codebase reading
- TanStack Form patterns: HIGH — verified against official docs
- Pitfalls: HIGH for Jira config and header overlap (traced through code); MEDIUM for LLM JSON parsing (pattern borrowed from existing gateway logic)
- Route context access: LOW — implementation detail that needs runtime validation

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable stack — 30 days)
