import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';

import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';

const config = defineConfig({
  server: {
    host: process.env.HOST || 'localhost',
    allowedHosts: ['host.docker.internal'],
  },
  plugins: [
    devtools(),
    nitro({
      rollupConfig: {
        external: [/^@sentry\//, 'postgres', /^drizzle-orm/, 'node-cron'],
      },
    }),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
