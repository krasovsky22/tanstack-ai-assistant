---
name: Chat component architecture
description: How Chat.tsx, ChatInput.tsx, and the conversation routes are structured after Phase 4 redesign
type: project
---

## Chat UI Architecture (post Phase 4)

**ChatInput** (`src/components/ChatInput.tsx`) — shared input bar used in two places:
- Props: `onSubmit: (value: string) => void`, `isLoading?: boolean`, `placeholder?: string`
- Send button uses `brand.600` bg, disabled/grey when input is empty, `loading` prop when `isLoading`
- Attach File (Paperclip) and Tools (Wrench) buttons in the bottom-left
- Submit on Enter key, Shift+Enter for newline (if Textarea used)
- Green `brand.600` border on the container with subtle shadow

**Chat.tsx** (`src/components/Chat.tsx`):
- Uses `ReactMarkdown` + `remark-gfm` — zero `dangerouslySetInnerHTML`
- Markdown components defined as `markdownComponents` const (p, h1-h3, code, pre, ul, ol, li, a)
- Fenced code blocks handled via regex split — passed to the `Code` component for syntax highlighting
- **User bubbles**: `Flex justifyContent="flex-end"`, `bg="brand.600"`, `color="white"`, `borderRadius="16px 16px 4px 16px"`, `maxW="70%"`
- **Assistant bubbles**: left-aligned, `bg="bg.surface"`, `border="1px solid"`, `borderColor="border.default"`, `borderRadius="16px 16px 16px 4px"`, `maxW="85%"`
- **Layout**: `Flex flexDir="column" h="100%" minH="0"` — header (flexShrink=0), messages area (flex="1" overflowY="auto"), input (flexShrink=0)
- Header contains: breadcrumb + editable title + agent status indicator

**Conversation route wrappers** (`src/routes/conversations/new.tsx`, `src/routes/conversations/$id.tsx`):
- Both use `<Box h="100vh" bg="bg.page" display="flex" flexDirection="column">` to give Chat.tsx full viewport height

**Home page** (`src/routes/index.tsx`):
- Uses `HomePageChatInput` wrapper that calls `navigate({ to: '/conversations/new', search: { q: value } })`
- The inline `ChatInput` was replaced with the shared component

**Why:** Phase 4 of the UI redesign — eliminate dangerouslySetInnerHTML (XSS risk), unify input component, add visual message bubble differentiation, fix height layout.
**How to apply:** When editing chat UI, preserve the flex height layout. When adding new markdown elements, add them to `markdownComponents` in Chat.tsx. When building features that need a chat-style input, import `ChatInput` from `@/components/ChatInput`.
