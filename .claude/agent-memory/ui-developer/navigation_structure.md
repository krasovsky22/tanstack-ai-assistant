---
name: Navigation structure and section disabling
description: How routes map to nav icons and how the DISABLE_SECTIONS env var gates UI sections
type: reference
---

## Routes
- `/` — Home page (hero + feature cards + chat input)
- `/conversations` — AI chat list layout (guards with `useSectionDisabled('ai')`)
- `/conversations/new` — New chat
- `/conversations/$id` — Individual chat
- `/jobs` — Job search (guards with `useSectionDisabled('jobs')`)
- `/mail` — Mail (guards with `useSectionDisabled('mail')`)
- `/knowledge-base` — Knowledge Base (guards with `useSectionDisabled('knowledge-base')`)
- `/cronjobs` — Automation (guards with `useSectionDisabled('cronjobs')`)

## Section keys (for DISABLE_SECTIONS env)
`ai`, `jobs`, `mail`, `knowledge-base`, `cronjobs`

## useDisabledSections hook
Located at `src/lib/sections.ts`. Returns `{ disabled: Section[] }` from `/api/sections`. Both `IconRail` and `ChatSidebar` use this to conditionally show nav items.

## Active state detection in IconRail
Uses `useRouterState()` from TanStack Router and checks `pathname.startsWith(route)` to determine active state. Active icons get `bg: '#5A9E3A'` and white color.
