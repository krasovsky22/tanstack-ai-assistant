import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';

// Strip Chakra's global CSS resets so they don't conflict with Tailwind
const system = createSystem(defaultConfig, { globalCss: {} });

export function Provider({ children }: { children: React.ReactNode }) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
}
