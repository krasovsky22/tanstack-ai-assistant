# Phase 10: User Settings Token Encryption - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Encrypt sensitive PAT tokens (`jiraPat`, `githubPat`) stored in the `user_settings` PostgreSQL table so they are protected at rest. Currently stored as plaintext text columns. No new functionality — purely a security hardening phase. Presentation masking (••••••••) in API responses already exists from Phase 08 and is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Encryption key
- New dedicated `ENCRYPTION_KEY` env var — not shared with `SESSION_SECRET` (which is for cookie signing)
- Format: 32-byte hex string (64 hex chars), generated with `openssl rand -hex 32`
- Hard fail at startup if `ENCRYPTION_KEY` is not set — prevents silently writing unencrypted data

### What to encrypt
- Encrypt only actual secret fields: `jiraPat` and `githubPat`
- Do NOT encrypt non-secret fields: `jiraBaseUrl`, `jiraEmail`, `jiraDefaultProject`
- The encrypt/decrypt pattern should be easy to extend: new PAT-like fields added to `userSettings` in future phases should follow the same approach without redesign

### Storage format
- Keep existing text columns (`jira_pat`, `github_pat`) — no schema/column changes
- Store encrypted values as base64-encoded ciphertext with an `enc:` prefix: `enc:<base64(iv+ciphertext)>`
- The `enc:` prefix distinguishes encrypted values from any pre-existing plaintext values at read time

### Data migration
- No migration of existing plaintext data — existing PAT values are not encrypted in-place
- Existing plaintext PATs (without the `enc:` prefix) should be treated as legacy: cleared on next read or returned as-is with graceful fallback behavior (Claude's discretion)

### Claude's Discretion
- Encryption algorithm choice (AES-256-GCM with Node.js built-in `node:crypto` is the natural choice — no new deps)
- IV generation strategy (random 12-byte IV per encryption operation, prepended to ciphertext)
- How to handle existing plaintext PATs at read time: clear them (force re-entry) vs decode them as-is without decryption — either is acceptable
- Whether to extract the `encrypt`/`decrypt` helpers into a shared `src/lib/crypto.ts` utility or keep inline in `user-settings.ts`
- Test approach: unit tests for encrypt/decrypt round-trip + integration test that DB stores ciphertext not plaintext

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/services/user-settings.ts` (`getUserSettings`, `upsertUserSettings`): Central read/write point for all user settings — encrypt on write, decrypt on read, entirely contained here
- `process.env.SESSION_SECRET`: Demonstrates existing env var pattern for secret keys — `ENCRYPTION_KEY` follows same pattern
- `src/routes/api/user-settings.tsx` PUT handler: Already handles masked placeholder detection (`••••••••`) before writing — encryption is transparent to this layer

### Established Patterns
- Env vars validated at startup in relevant service files (not in `.env.example` alone)
- `node:crypto` is available in Node.js runtime without additional packages — standard for field-level AES-GCM encryption
- `enc:` prefix pattern is a common convention for distinguishing encrypted DB values

### Integration Points
- `src/services/user-settings.ts`: Add `encrypt()`/`decrypt()` helpers; wrap `jiraPat` and `githubPat` fields in `upsertUserSettings()` (write) and `getUserSettings()` (read)
- `.env.example`: Add `ENCRYPTION_KEY=` entry with generation instructions
- `CLAUDE.md` Environment Variables section: Document `ENCRYPTION_KEY` as required

</code_context>

<specifics>
## Specific Ideas

- No specific references or external examples — standard AES-256-GCM field-level encryption
- Key must be generated before first run: `openssl rand -hex 32`

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-user-settings-token-encryption*
*Context gathered: 2026-04-06*
