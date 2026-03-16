---
name: Chakra UI conventions and gotchas
description: Key patterns and known issues when using Chakra UI v3 in this project
type: reference
---

## Theme setup
`src/components/ui/provider.tsx` uses `createSystem(defaultConfig, customConfig)` with `globalCss: {}`. Custom tokens go in `theme.tokens`, semantic tokens in `theme.semanticTokens`, component overrides in `theme.recipes`.

## Brand green tokens (theme.tokens.colors.brand)
- `brand.400` = #6BBF45 (bright/light)
- `brand.500` = #5A9E3A (medium/hover)
- `brand.600` = #3D7A28 (primary/dark)
- `brand.700` = #2e5c1e (dark)

## Semantic color tokens (theme.semanticTokens.colors) — use these in new code
Reference token values with `{colors.gray.50}` syntax (not bare strings).
- `bg.page` → gray.50 (#F0F0F0 equiv) — page background
- `bg.surface` → white — panel/card backgrounds
- `border.default` → gray.200 — standard border color
- `text.primary` → gray.900 — main body text
- `text.secondary` → gray.500 — secondary/caption text
- `text.muted` → gray.400 — placeholder/muted text
- `text.subtle` → gray.700 — slightly subdued text
- `brand.primary` → brand.600 — primary brand color
- `brand.hover` → brand.500 — hover state
- `brand.light` → brand.400 — light accent
- `brand.dark` → brand.700 — dark accent

The `brand` color palette semantic tokens (solid, contrast, fg, muted, subtle, emphasized, focusRing) are defined so `colorPalette="brand"` works on Chakra components.

## Border radius tokens (theme.tokens.radii)
- `card`: 16px
- `input`: 8px
- `button`: 8px
- `badge`: 6px

## Component recipes (theme.recipes)
Button, Input, Textarea all have `base.borderRadius: '8px'`. Button also has `defaultVariants.colorPalette: 'brand'`.

## Known gotchas
- `Box as={Link}` with `to=` prop causes TypeScript errors because Chakra's Box type doesn't know about TanStack Link props. Use native `<Link>` wrapping a `<Box>` instead, or use `<Link style={...}>` directly.
- `Tooltip` from `@chakra-ui/react` sometimes has JSX type errors in strict TS mode — use `title` attribute on native elements as fallback.
- `LayoutSidebar` doesn't exist in lucide-react — use `PanelLeft` instead.
- Progress: use `Progress.Root`, `Progress.Track`, `Progress.Range` (namespace pattern).
- `colorPalette="green"` on Progress maps to Chakra's built-in green, not brand green. Set `bg` directly on `Progress.Range` for brand colors.
