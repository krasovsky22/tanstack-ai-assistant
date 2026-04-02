import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

type ColorMode = 'light' | 'dark';

const STORAGE_KEY = 'chakra-color-mode';

interface ColorModeContextValue {
  colorMode: ColorMode;
  toggleColorMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue>({
  colorMode: 'light',
  toggleColorMode: () => {},
});

export function ColorModeProvider({ children }: { children: ReactNode }) {
  // Always start with 'light' to match SSR — sync from localStorage after hydration
  const [colorMode, setColorMode] = useState<ColorMode>('light');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      setColorMode(stored);
    }
  }, []);

  function toggleColorMode() {
    setColorMode((prev) => {
      const next: ColorMode = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }

  return (
    <ColorModeContext.Provider value={{ colorMode, toggleColorMode }}>
      {children}
    </ColorModeContext.Provider>
  );
}

export function useColorMode(): ColorModeContextValue {
  return useContext(ColorModeContext);
}
