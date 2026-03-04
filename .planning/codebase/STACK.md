# Technology Stack

**Analysis Date:** 2026-03-04

## Languages

**Primary:**
- TypeScript 5.7.2 - All application code, workers, routes, services
- HTML/CSS - UI markup and styling via Tailwind CSS

**Secondary:**
- JavaScript (ESM) - Configuration files, build scripts

## Runtime

**Environment:**
- Node.js - No explicit version enforced; project uses `tsx` for TypeScript execution in workers

**Package Manager:**
- pnpm - Primary package manager
- Lockfile: present (pnpm-lock.yaml)

## Frameworks

**Core:**
- TanStack Start 1.132.0 - Full-stack framework with file-based routing and SSR
- TanStack Router 1.132.0 - File-based routing (routes in `src/routes/`)
- TanStack React 19.2.0 - UI components and hooks
- TanStack AI 0.5.1 - AI orchestration and agent loop control

**Styling:**
- Tailwind CSS 4.1.18 - Utility-first CSS framework
- @tailwindcss/vite 4.1.18 - Tailwind Vite integration

**State Management & Data:**
- TanStack Query 5.90.21 - Server state and data fetching
- TanStack React Form 1.28.3 - Form management
- @tanstack/db 0.5.28 - Database abstraction layer
- @tanstack/react-db 0.1.72 - React bindings for database
- @tanstack/query-db-collection 1.0.25 - Query integration with database collections

**Development & DevTools:**
- TanStack DevTools (Vite) 0.3.11 - Development visualization
- TanStack React AI DevTools 0.2.8 - AI-specific debugging
- @tanstack/react-router-devtools 1.132.0 - Router debugging

**Testing:**
- Vitest 3.0.5 - Unit test runner and framework
- @testing-library/react 16.2.0 - React component testing utilities
- @testing-library/dom 10.4.0 - DOM testing utilities
- jsdom 27.0.0 - JavaScript implementation of web standards

**Build & Dev:**
- Vite 7.1.7 - Frontend build tool and dev server
- Nitro (nightly) - Server runtime and API routes
- @vitejs/plugin-react 5.0.4 - React JSX support
- vite-tsconfig-paths 5.1.4 - TypeScript path alias resolution
- @tanstack/router-plugin 1.132.0 - Router file-based routing plugin
- @tanstack/devtools-vite 0.3.11 - DevTools Vite integration
- tsx 4.21.0 - TypeScript executor for Node.js scripts and workers

**Database:**
- Drizzle ORM 0.45.1 - SQL query builder and ORM
- drizzle-kit 0.31.9 - Migration and schema tooling
- postgres 3.4.8 - PostgreSQL client (js-postgres)

**Integrations & Tools:**
- @tanstack/ai-openai 0.5.0 - OpenAI GPT adapter for TanStack AI
- @modelcontextprotocol/sdk 1.26.0 - Model Context Protocol client for MCP server communication
- node-cron 4.2.1 - Cron job scheduling in workers
- puppeteer-core 24.37.5 - Headless browser automation for PDF generation
- zod 4.3.6 - TypeScript-first schema validation and parsing
- dotenv 17.3.1 - Environment variable loading
- marked 17.0.3 - Markdown parsing and rendering
- lucide-react 0.545.0 - Icon library

## Configuration

**TypeScript:**
- Strict mode enabled
- Target: ES2022
- Module resolution: bundler
- Path aliases:
  - `@/*` → `./src/*` (main app code)
  - `#/*` → `./src/*` (alias for same resolution)
- Separate configs for workers: `tsconfig.worker.json`, `tsconfig.gateway.json`

**Build:**
- `vite.config.ts` - Vite configuration
- Plugins chain: devtools → nitro → tsconfigPaths → tailwindcss → tanstackStart → viteReact
- External dependencies for nitro build: `@sentry/*`, `postgres`, `drizzle-orm`, `node-cron`
- `drizzle.config.ts` - Drizzle migrations and schema
- `mcp.json` - Model Context Protocol server definition (TanStack CLI MCP)

**Environment:**
- `.env.example` - Template for required environment variables (never commit `.env`)
- Variables defined at runtime via `dotenv` package

## Platform Requirements

**Development:**
- Node.js (version unspecified; recommend LTS)
- pnpm package manager
- PostgreSQL database
- Docker (optional, for MCP gateway: `docker.exe mcp gateway run`)
- Chrome/Chromium (for puppeteer PDF generation on local path: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` on macOS)

**Production:**
- Node.js runtime
- PostgreSQL database
- Environment variables: `OPENAI_API_KEY`, `DATABASE_URL`, `APP_URL`, `TELEGRAM_BOT_TOKEN` (optional), `TELEGRAM_BOT_USERNAME` (optional)
- Docker (for MCP Gateway worker)
- Chrome/Chromium for PDF generation (via puppeteer-core)

---

*Stack analysis: 2026-03-04*
