# Phase 10: User Settings Token Encryption - Research

**Researched:** 2026-04-06
**Domain:** Node.js AES-256-GCM field-level encryption, service layer hardening
**Confidence:** HIGH

## Summary

Phase 10 is a security hardening phase: encrypt `jiraPat` and `githubPat` fields at rest in the `user_settings` PostgreSQL table. No schema changes, no new dependencies, no UI changes. The work is entirely contained within `src/services/user-settings.ts` plus a new `src/lib/crypto.ts` utility and minor documentation updates.

The encryption algorithm is AES-256-GCM using Node.js built-in `node:crypto`. A random 12-byte IV is generated per-operation and prepended to the ciphertext alongside the GCM auth tag. Values are stored as `enc:<base64(iv+tag+ciphertext)>`. The `enc:` prefix allows transparent detection at read time so legacy plaintext values are handled gracefully without a data migration.

Startup validation (hard-fail if `ENCRYPTION_KEY` is absent) follows the same implicit pattern used for `SESSION_SECRET` in `src/services/session.ts`. The planner should scope this to one plan: add crypto helpers + wire encrypt-on-write / decrypt-on-read into `upsertUserSettings()` and `getUserSettings()`, add env var docs, and write unit tests.

**Primary recommendation:** Extract `encrypt()`/`decrypt()` into `src/lib/crypto.ts`, validate `ENCRYPTION_KEY` at module load time in that file, then call those helpers for `jiraPat` and `githubPat` in the two functions in `user-settings.ts`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- New dedicated `ENCRYPTION_KEY` env var — not shared with `SESSION_SECRET`
- Format: 32-byte hex string (64 hex chars), generated with `openssl rand -hex 32`
- Hard fail at startup if `ENCRYPTION_KEY` is not set
- Encrypt only `jiraPat` and `githubPat` — do NOT encrypt `jiraBaseUrl`, `jiraEmail`, `jiraDefaultProject`
- Keep existing text columns (`jira_pat`, `github_pat`) — no schema/column changes
- Storage format: `enc:<base64(iv+ciphertext)>` prefix distinguishes encrypted values from plaintext
- No migration of existing plaintext data — existing PATs without `enc:` prefix are treated as legacy

### Claude's Discretion
- Encryption algorithm: AES-256-GCM with `node:crypto` (no new deps) — natural choice confirmed
- IV generation: random 12-byte IV per encryption operation, prepended to ciphertext
- Legacy plaintext handling at read time: clear them (force re-entry) vs return as-is — either acceptable
- Whether to extract helpers into `src/lib/crypto.ts` or keep inline in `user-settings.ts`
- Test approach: unit tests for encrypt/decrypt round-trip + integration test verifying DB stores ciphertext not plaintext

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:crypto` | built-in | AES-256-GCM encryption/decryption | No additional deps; standard for server-side field-level encryption in Node.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | existing | Unit tests for encrypt/decrypt round-trip | Already the project test runner |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node:crypto` built-in | `libsodium-wrappers` or `@noble/ciphers` | Third-party libs offer cleaner API but add dependencies — unnecessary when built-in covers the need |

**Installation:**
```bash
# No new packages needed — node:crypto is built-in
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── crypto.ts          # encrypt() / decrypt() helpers + ENCRYPTION_KEY validation
└── services/
    └── user-settings.ts   # Import and use encrypt/decrypt for jiraPat + githubPat
```

### Pattern 1: AES-256-GCM Field Encryption

**What:** Symmetric encryption of a string field using a 256-bit key. Each call generates a fresh 12-byte random IV; GCM mode also produces a 16-byte authentication tag that detects tampering.

**Storage layout (verified by Node.js execution):**
- Blob = `iv (12 bytes) || authTag (16 bytes) || ciphertext (N bytes)`
- Stored as: `enc:<base64(blob)>`

**When to use:** Any string column containing a credential, token, or secret that must be protected at rest but retrieved in plaintext by the application.

**Example (verified — successfully round-tripped in Node.js 22):**
```typescript
// src/lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const KEY_HEX = process.env.ENCRYPTION_KEY;
if (!KEY_HEX) {
  throw new Error('ENCRYPTION_KEY env var is required. Generate with: openssl rand -hex 32');
}
const KEY = Buffer.from(KEY_HEX, 'hex');

const ENC_PREFIX = 'enc:';

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16 bytes
  const blob = Buffer.concat([iv, tag, encrypted]);
  return ENC_PREFIX + blob.toString('base64');
}

export function decrypt(stored: string): string | null {
  if (!stored.startsWith(ENC_PREFIX)) {
    // Legacy plaintext value — return null to force re-entry
    return null;
  }
  const blob = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64');
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
}
```

### Pattern 2: Encrypt-on-Write / Decrypt-on-Read in Service Layer

**What:** All DB writes pass through `encrypt()`, all DB reads pass through `decrypt()`. The API route layer is unaware — it receives and sends plaintext strings. The existing masking logic (`••••••••`) in `src/routes/api/user-settings.tsx` is unaffected.

**When to use:** Centralizing encryption in the service layer means no call site needs to change.

**Example:**
```typescript
// In upsertUserSettings() — encrypt before writing
const settingsToWrite = {
  ...settings,
  jiraPat: settings.jiraPat != null ? encrypt(settings.jiraPat) : null,
  githubPat: settings.githubPat != null ? encrypt(settings.githubPat) : null,
};

// In getUserSettings() — decrypt after reading
return {
  jiraBaseUrl: row.jiraBaseUrl,
  jiraEmail: row.jiraEmail,
  jiraPat: row.jiraPat ? decrypt(row.jiraPat) : null,
  jiraDefaultProject: row.jiraDefaultProject,
  githubPat: row.githubPat ? decrypt(row.githubPat) : null,
};
```

### Pattern 3: Startup Hard-Fail for Missing Key

**What:** Module-level `if (!KEY_HEX) throw` in `src/lib/crypto.ts`. Throws synchronously at module load time — any server startup that imports the crypto module will abort with a clear error message.

**Mirrors:** The implicit `process.env.SESSION_SECRET!` non-null assertion in `src/services/session.ts`, but as an explicit throw with an actionable message.

### Anti-Patterns to Avoid
- **Reusing SESSION_SECRET as the encryption key:** Violates separation of concerns. A compromised session secret would also expose all stored PATs.
- **Encrypting non-secret fields:** `jiraBaseUrl`, `jiraEmail`, `jiraDefaultProject` are not credentials — encrypting them adds overhead for no security gain.
- **Schema column changes:** Changing the column type from `text` would require a Drizzle migration; the `enc:` prefix approach avoids this entirely.
- **Deterministic IV (reusing the same IV):** GCM is catastrophically broken when the same IV is reused with the same key. Always call `randomBytes(12)` per encrypt call.
- **Storing only IV+ciphertext without the auth tag:** Without the GCM auth tag, tampering cannot be detected. The layout must be `iv || tag || ciphertext`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Symmetric encryption | Custom XOR / Base64-only obfuscation | `node:crypto` AES-256-GCM | GCM provides authenticated encryption; tampering detection is built-in |
| Key derivation | Custom hashing of the hex key | Direct `Buffer.from(hexKey, 'hex')` | Key is already 32 random bytes; no KDF needed |

**Key insight:** AES-256-GCM in Node.js's built-in `crypto` module is the exact right primitive — no third-party library is needed or advisable.

---

## Common Pitfalls

### Pitfall 1: IV Reuse
**What goes wrong:** Using a static or predictable IV breaks GCM confidentiality and allows an attacker to recover the plaintext.
**Why it happens:** Developer caches the IV as a constant for simplicity.
**How to avoid:** Call `randomBytes(12)` inside every `encrypt()` call — never as a module-level constant.
**Warning signs:** IV bytes look identical in two encrypted values stored in the DB.

### Pitfall 2: Forgetting the Auth Tag
**What goes wrong:** Decryption succeeds even on tampered ciphertext, or `decipher.final()` throws "Unsupported state" without a clear error.
**Why it happens:** Auth tag retrieval (`cipher.getAuthTag()`) is called before `cipher.final()`, or not stored at all.
**How to avoid:** Always call `cipher.getAuthTag()` AFTER `cipher.final()`, store it in the blob, and call `decipher.setAuthTag(tag)` before `decipher.final()`.

### Pitfall 3: Key Length Mismatch
**What goes wrong:** `createCipheriv` throws "Invalid key length".
**Why it happens:** `ENCRYPTION_KEY` is not exactly 64 hex chars (32 bytes).
**How to avoid:** Validate at startup: `if (KEY_HEX.length !== 64) throw new Error(...)`.

### Pitfall 4: Double-Encryption on Upsert
**What goes wrong:** The `upsertUserSettings()` function calls `getUserSettings()` internally to check for an existing row. If `getUserSettings()` returns already-decrypted values, and those are then passed back in as `settings.jiraPat`, they get encrypted again.
**Why it happens:** The PUT handler in `src/routes/api/user-settings.tsx` calls `getUserSettings()` to handle the `••••••••` placeholder case (lines 65-73), then passes the resolved plaintext PAT to `upsertUserSettings()`. This is the correct existing flow — `upsertUserSettings()` should always receive plaintext and always encrypt before writing.
**How to avoid:** Encrypt only at the point of writing to the DB (`upsertUserSettings()`). `getUserSettings()` always returns decrypted plaintext to callers.

### Pitfall 5: Legacy PAT Silently Returned
**What goes wrong:** A user who set their PAT before Phase 10 deploys finds their tools working (PAT is readable in plaintext from the DB) but their PAT is never encrypted — a silent security gap.
**How to avoid:** Per the locked decision, return `null` for legacy plaintext values (i.e., values that don't start with `enc:`). This forces re-entry on next settings save, at which point encryption is applied.

### Pitfall 6: Workers That Bypass getUserSettings
**What goes wrong:** If any worker process constructs its own DB query for `user_settings` fields without going through `getUserSettings()`, it reads ciphertext as plaintext.
**Why it matters:** All DB reads of `jira_pat` / `github_pat` must route through `getUserSettings()`.
**Warning signs:** Search for direct `db.select().from(userSettings)` outside of `user-settings.ts`.

---

## Code Examples

### Complete encrypt/decrypt utility (Node.js verified)
```typescript
// Source: verified via Node.js 22 execution — round-trip confirmed
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const KEY_HEX = process.env.ENCRYPTION_KEY;
if (!KEY_HEX || KEY_HEX.length !== 64) {
  throw new Error(
    'ENCRYPTION_KEY must be set and be exactly 64 hex chars (32 bytes). ' +
    'Generate with: openssl rand -hex 32',
  );
}
const KEY = Buffer.from(KEY_HEX, 'hex');
const ENC_PREFIX = 'enc:';

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag(); // must be called AFTER cipher.final()
  return ENC_PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decrypt(stored: string): string | null {
  if (!stored.startsWith(ENC_PREFIX)) return null; // legacy plaintext — force re-entry
  try {
    const blob = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64');
    const iv = blob.subarray(0, 12);
    const tag = blob.subarray(12, 28);
    const ciphertext = blob.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
  } catch {
    return null; // tampered or corrupt value
  }
}
```

### Unit test pattern (matching project vitest style)
```typescript
// src/lib/crypto.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'a'.repeat(64); // valid 32-byte test key
});

// Dynamic import required because module validates KEY at load time
const { encrypt, decrypt } = await import('@/lib/crypto');

describe('encrypt / decrypt', () => {
  it('round-trips a PAT value', () => {
    const pat = 'ghp_TestTokenAbc123';
    expect(decrypt(encrypt(pat))).toBe(pat);
  });

  it('encrypt produces enc: prefix', () => {
    expect(encrypt('secret')).toMatch(/^enc:/);
  });

  it('two encryptions of same value produce different ciphertext (random IV)', () => {
    const a = encrypt('same');
    const b = encrypt('same');
    expect(a).not.toBe(b);
  });

  it('decrypt returns null for legacy plaintext (no enc: prefix)', () => {
    expect(decrypt('old-plaintext-pat')).toBeNull();
  });

  it('decrypt returns null for tampered ciphertext', () => {
    const enc = encrypt('secret');
    const tampered = enc.slice(0, -4) + 'XXXX';
    expect(decrypt(tampered)).toBeNull();
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store PATs as plaintext text columns | AES-256-GCM with `enc:` prefix sentinel | Phase 10 | DB compromise no longer exposes raw PATs |

**Deprecated/outdated:**
- CBC mode for authenticated encryption: superseded by GCM which combines confidentiality + integrity in one pass.

---

## Open Questions

1. **Legacy plaintext handling (Claude's Discretion)**
   - What we know: Both "clear on read" and "return as-is" are acceptable per CONTEXT.md
   - Recommendation: Return `null` (clear/force re-entry). Returning the raw plaintext would mean the user's PAT is silently never encrypted until they open settings and save again — easy to miss. Returning `null` forces immediate awareness and re-entry on next API use.

2. **Direct DB queries outside `user-settings.ts`**
   - What we know: `src/services/user-settings.ts` is the only place `getUserSettings` / `upsertUserSettings` are called from the API route layer
   - What's unclear: Workers (cron, gateway, jobs) — do any directly query `user_settings`?
   - Recommendation: Grep for `from(userSettings)` outside of `user-settings.ts` before finalizing the plan. If found, those callers also need to route through the service functions.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing, via `vite.config.ts`) |
| Config file | `vite.config.ts` — `test.exclude: ['e2e/**', 'node_modules/**']` |
| Quick run command | `pnpm vitest run src/lib/crypto.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENC-01 | `encrypt()` round-trips a PAT via `decrypt()` | unit | `pnpm vitest run src/lib/crypto.test.ts` | Wave 0 |
| ENC-02 | Each `encrypt()` call uses a different IV (non-deterministic) | unit | `pnpm vitest run src/lib/crypto.test.ts` | Wave 0 |
| ENC-03 | `decrypt()` returns `null` for legacy plaintext (no `enc:` prefix) | unit | `pnpm vitest run src/lib/crypto.test.ts` | Wave 0 |
| ENC-04 | `decrypt()` returns `null` for tampered ciphertext | unit | `pnpm vitest run src/lib/crypto.test.ts` | Wave 0 |
| ENC-05 | DB stores ciphertext (starts with `enc:`) not plaintext after `upsertUserSettings()` | integration | `pnpm vitest run src/services/user-settings.test.ts` | Wave 0 |
| ENC-06 | `getUserSettings()` returns decrypted plaintext to callers | integration | `pnpm vitest run src/services/user-settings.test.ts` | Wave 0 |
| ENC-07 | Hard fail at startup when `ENCRYPTION_KEY` is missing | unit | `pnpm vitest run src/lib/crypto.test.ts` | Wave 0 |
| ENC-08 | `.env.example` and `CLAUDE.md` document `ENCRYPTION_KEY` | manual | visual inspection | n/a |

### Sampling Rate
- **Per task commit:** `pnpm vitest run src/lib/crypto.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/crypto.test.ts` — covers ENC-01 through ENC-04, ENC-07
- [ ] `src/services/user-settings.test.ts` — covers ENC-05, ENC-06 (mock DB via `vi.mock('@/db')`)

---

## Sources

### Primary (HIGH confidence)
- Node.js `node:crypto` built-in — verified by live execution: AES-256-GCM round-trip confirmed, IV layout (iv 12b + tag 16b + ciphertext) verified
- `src/services/user-settings.ts` — read directly; confirms `getUserSettings` / `upsertUserSettings` are the sole service-layer entry points
- `src/routes/api/user-settings.tsx` — read directly; confirms masking logic is in the route layer, not service layer; confirms `getUserSettings` is called for placeholder detection
- `.planning/phases/10-user-settings-token-encryption/10-CONTEXT.md` — all locked decisions sourced from here

### Secondary (MEDIUM confidence)
- AES-256-GCM standard layout (IV 12 bytes, auth tag 16 bytes) — consistent with Node.js docs and NIST recommendations

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `node:crypto` is built-in, verified by execution
- Architecture: HIGH — existing service layer is simple and clean; all reads/writes go through two functions
- Pitfalls: HIGH — double-encryption and IV reuse are well-known GCM pitfalls; legacy plaintext gap is specific to this codebase

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable domain — Node.js crypto API does not change)
