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
    },
  },
});

const system = createSystem(defaultConfig, customConfig);

export function Provider({ children }: { children: React.ReactNode }) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
}
