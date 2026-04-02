import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'ChatWidget',
      formats: ['iife'],
      fileName: () => 'chat-widget',
    },
    rollupOptions: {
      // Do NOT externalize react — must be self-contained for script tag use
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
