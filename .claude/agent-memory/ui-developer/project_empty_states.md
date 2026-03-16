---
name: Empty state and loading state patterns
description: Standard empty state design and skeleton loading conventions used across all pages
type: project
---

All pages use a consistent empty state pattern:

```tsx
<VStack gap={4} py={16} alignItems="center" textAlign="center">
  <SomeLucideIcon size={40} color="var(--chakra-colors-text-muted)" />
  <Heading size="md" color="text.primary">Descriptive heading</Heading>
  <Text color="text.secondary" fontSize="sm">Helpful subtitle text.</Text>
  <Button ...>Call to action</Button>
</VStack>
```

Loading states use `Skeleton` (not bare `<Spinner />`):
- List-based pages (conversations, cronjobs): `<Skeleton height="Xpx" borderRadius="lg/md" />` repeated 4–5 times in a VStack
- Card-based pages (jobs): `<Skeleton height="120px" borderRadius="lg" />` repeated 4 times

Bare `<Spinner />` is only used for inline loading (e.g., inside an icon button for test-run, or upload banner).

**Why:** Phase 8 design polish pass standardized all empty states and loading states for visual consistency.
**How to apply:** When adding a new page or data-driven list, always implement both an empty state and a skeleton loading state following these patterns.
