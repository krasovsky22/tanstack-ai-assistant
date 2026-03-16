import { ChakraProvider, createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const customConfig = defineConfig({
  globalCss: {},
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#f0f9eb' },
          100: { value: '#dcf0cc' },
          200: { value: '#b8e199' },
          300: { value: '#8ecc66' },
          400: { value: '#6BBF45' },
          500: { value: '#5A9E3A' },
          600: { value: '#3D7A28' },
          700: { value: '#2e5c1e' },
          800: { value: '#1f3f14' },
          900: { value: '#0f2009' },
        },
      },
      radii: {
        card: { value: '16px' },
        input: { value: '8px' },
        button: { value: '8px' },
        badge: { value: '6px' },
      },
    },
    semanticTokens: {
      colors: {
        // Background tokens
        'bg.page': { value: '{colors.gray.50}' },
        'bg.surface': { value: '{colors.white}' },
        // Border tokens
        'border.default': { value: '{colors.gray.200}' },
        // Text tokens
        'text.primary': { value: '{colors.gray.900}' },
        'text.secondary': { value: '{colors.gray.500}' },
        'text.muted': { value: '{colors.gray.400}' },
        'text.subtle': { value: '{colors.gray.700}' },
        // Brand semantic tokens
        'brand.primary': { value: '{colors.brand.600}' },
        'brand.hover': { value: '{colors.brand.500}' },
        'brand.light': { value: '{colors.brand.400}' },
        'brand.dark': { value: '{colors.brand.700}' },
        // Brand color palette tokens (required by Chakra for colorPalette support)
        brand: {
          solid: { value: '{colors.brand.600}' },
          contrast: { value: '{colors.brand.50}' },
          fg: { value: { _light: '{colors.brand.700}', _dark: '{colors.brand.500}' } },
          muted: { value: '{colors.brand.100}' },
          subtle: { value: '{colors.brand.200}' },
          emphasized: { value: '{colors.brand.300}' },
          focusRing: { value: '{colors.brand.500}' },
        },
      },
    },
    recipes: {
      button: {
        base: {
          borderRadius: '8px',
        },
        defaultVariants: {
          colorPalette: 'brand',
        },
      },
      input: {
        base: {
          borderRadius: '8px',
        },
      },
      textarea: {
        base: {
          borderRadius: '8px',
        },
      },
    },
  },
});

const system = createSystem(defaultConfig, customConfig);

export function Provider({ children }: { children: React.ReactNode }) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
}
