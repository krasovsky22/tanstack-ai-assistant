---
name: Chakra UI conventions and gotchas
description: Key patterns and known issues when using Chakra UI v3 in this project
type: reference
---

## Theme setup
`src/components/ui/provider.tsx` uses `createSystem(defaultConfig, customConfig)` with `globalCss: {}` to strip Chakra global resets (Tailwind handles globals). Custom brand green tokens live under `colors.brand.*`.

## Brand green tokens
- `brand.400` = #6BBF45 (bright)
- `brand.500` = #5A9E3A (medium)
- `brand.600` = #3D7A28 (dark)

## Design tokens (used directly as strings where Chakra token lookup may not apply)
- `#F0F0F0` — outer app background
- `#FFFFFF` — panel/card bg
- `#E5E7EB` — border color
- `#1A1A1A` — primary text
- `#6B7280` — secondary text
- `#9CA3AF` — muted/placeholder text
- `#3D7A28` — button dark green

## Known gotchas
- `Box as={Link}` with `to=` prop causes TypeScript errors because Chakra's Box type doesn't know about TanStack Link props. Use native `<Link>` wrapping a `<Box>` instead, or use `<Link style={...}>` directly.
- `Tooltip` from `@chakra-ui/react` sometimes has JSX type errors in strict TS mode — use `title` attribute on native elements as fallback.
- `LayoutSidebar` doesn't exist in lucide-react — use `PanelLeft` instead.
- Progress: use `Progress.Root`, `Progress.Track`, `Progress.Range` (namespace pattern).
- `colorPalette="green"` on Progress maps to Chakra's built-in green, not brand green. Set `bg` directly on `Progress.Range` for brand colors.
