# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack AI chat application built with TanStack Start, TanStack Router (file-based routing), and TanStack AI. Uses OpenAI (GPT-5.2) with streaming responses and a tool-calling system.

## Commands

- **Dev server**: `pnpm dev` (runs on port 3000)
- **Build**: `pnpm build`
- **Test**: `pnpm test` (vitest)
- **Run single test**: `pnpm vitest run <path>`

Package manager is **pnpm**.

## Architecture

**Routing**: File-based via TanStack Router. Route files live in `src/routes/`. The file `src/routeTree.gen.ts` is auto-generated — do not edit it.

**API endpoint**: `src/routes/api.chat.tsx` — server-side POST handler that orchestrates LLM calls using `@tanstack/ai` with an agent loop (maxIterations: 10). Returns streaming responses via `toHttpResponse()`.

**Chat UI**: `src/components/Chat.tsx` — uses `useChat` hook from `@tanstack/ai-react` with `fetchHttpStream('/api/chat')` for streaming.

**Tools system**: `src/tools/` — AI-callable tools with Zod-validated inputs. Currently contains a weather tool that calls the OpenWeather API. Tools are registered in the server-side chat handler.

**Path aliases**: `@/*` and `#/*` both resolve to `./src/*`.

## Environment Variables

- `OPENAI_API_KEY` — required for LLM calls
- `OPEN_WEATHER_API` — required for the weather tool
