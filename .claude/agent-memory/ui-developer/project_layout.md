---
name: 3-column app shell layout
description: The app uses a fixed 3-column layout: 60px icon rail (left) + 280px chat sidebar + main content area (ml: 340px)
type: project
---

The root layout (`src/routes/__root.tsx`) renders a full-height 3-column layout:

1. `IconRail` (`src/components/IconRail.tsx`) — fixed, 60px wide, left:0, contains app icon + nav icons + bottom utility icons
2. `ChatSidebar` (`src/components/ChatSidebar.tsx`) — fixed, 280px wide, left:60px, contains "All Chats" header + "New Chat" button + grouped conversation list + Usage Summary card
3. Main content `Box` — `ml="340px"`, takes remaining width, `bg="#F0F0F0"`

**Why:** Redesign to match "Orin AI" design with light gray outer background, white panels, green accent.

**How to apply:** When adding new pages or modifying the layout, preserve the `ml="340px"` offset on the main content area. Never remove the `IconRail` or `ChatSidebar` from the root.
