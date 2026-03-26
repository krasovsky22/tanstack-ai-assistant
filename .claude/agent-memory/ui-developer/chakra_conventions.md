---
name: Chakra UI conventions and gotchas
description: Key patterns and known issues when using Chakra UI v3 in this project
type: reference
---

## Theme setup
`src/components/ui/provider.tsx` uses `createSystem(defaultConfig, customConfig)` with `globalCss: {}`. Custom tokens go in `theme.tokens`, semantic tokens in `theme.semanticTokens`, component overrides in `theme.recipes`.

## Dark mode
Chakra UI v3 does NOT have `useColorMode` or `ColorModeProvider` built-in (unlike v2). Dark mode is managed via:
- A custom `ColorModeProvider` in `src/lib/color-mode.tsx` that persists preference to `localStorage` under key `chakra-color-mode`
- `useColorMode()` hook from that file returns `{ colorMode, toggleColorMode }`
- The `<Theme appearance={colorMode}>` wrapper in `provider.tsx` activates dark mode via Chakra's class-based approach
- All semantic tokens now have `_light` / `_dark` conditional values
- Do NOT use `useColorModeValue` — it doesn't exist in v3. Use semantic tokens instead.

## Brand green tokens (theme.tokens.colors.brand)
- `brand.400` = #6BBF45 (bright/light)
- `brand.500` = #5A9E3A (medium/hover)
- `brand.600` = #3D7A28 (primary/dark)
- `brand.700` = #2e5c1e (dark)

## Semantic color tokens (theme.semanticTokens.colors) — use these in new code
All tokens are dual-mode (light/dark). Never use bare `bg="white"` or `color="gray.900"` — always use semantic tokens.
- `bg.page` → gray.50 / gray.900 — page background
- `bg.surface` → white / gray.800 — panel/card backgrounds
- `bg.subtle` → gray.100 / gray.700 — subtle hover/secondary backgrounds
- `bg.panel` → white / gray.800 — header/panel backgrounds
- `border.default` → gray.200 / gray.700 — standard border color
- `border.subtle` → gray.200 / gray.700 — subtle border color
- `text.primary` → gray.900 / gray.50 — main body text
- `text.secondary` → gray.500 / gray.400 — secondary/caption text
- `text.muted` → gray.400 / gray.500 — placeholder/muted text
- `text.subtle` → gray.700 / gray.300 — slightly subdued text
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
- The `defaultVariants.colorPalette: 'brand'` in button recipe triggers a TS2322 type error — this is a pre-existing issue, not introduced by dark mode work.
