---
created: 2026-03-23T09:07:08.518Z
title: Link gateway identities to internal users
area: general
files: []
---

## Problem

Incoming messages from gateways (e.g., Telegram) identify the sender using gateway-specific identifiers (`user_id`, chat id, username). Without a mapping to an internal user account, the system cannot reliably fetch user settings, store/retrieve per-user secrets, apply per-user feature flags, rate limits, or control tool availability.

## Solution

1. **Identity mapping table** — store `(gateway_type, gateway_user_id[, gateway_chat_id]) -> internal_user_id` with audit fields (`createdBy`, `createdAt`, `lastUsedAt`). Support multiple identities per internal user.

2. **Linking flows**:
   - Manual: user issues a command or follows a link/code to connect their gateway identity to an internal account.
   - Admin: internal admin associates identities when needed.

3. **Runtime resolution** — on message ingestion, resolve gateway identity → internal user → load settings/secrets → enable tools.

**Acceptance Criteria:**
- Given an inbound Telegram message, the system resolves it to an internal user when a mapping exists.
- If no mapping exists, the system provides a clear linking path and does not expose other users' data.
- Users can have multiple gateway identities linked to one internal account.
- Mapping lookup is performant and audited.
- Secrets/API keys are only accessible after successful association.

**Example:** associate Telegram `user_id=123456` with internal `user_id=abc-123` so tool calls can use that user's stored API keys.
