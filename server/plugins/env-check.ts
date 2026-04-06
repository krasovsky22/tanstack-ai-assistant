/**
 * Nitro server plugin — runs at startup before any requests are handled.
 * Validates required environment variables and exits early with a clear message
 * if any are missing or malformed.
 */
export default function envCheck() {
  const errors: string[] = [];

  // Required — no format constraints beyond presence
  const required = ['OPENAI_API_KEY', 'DATABASE_URL'] as const;
  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`  • ${key} is required but not set`);
    }
  }

  // ENCRYPTION_KEY — required AND must be exactly 64 hex chars (32 bytes for AES-256-GCM)
  const encKey = process.env.ENCRYPTION_KEY;
  if (!encKey) {
    errors.push(
      '  • ENCRYPTION_KEY is required but not set\n' +
      '    Generate with: openssl rand -hex 32',
    );
  } else if (!/^[0-9a-fA-F]{64}$/.test(encKey)) {
    errors.push(
      `  • ENCRYPTION_KEY must be exactly 64 hex chars (32 bytes), got ${encKey.length} chars\n` +
      '    Generate with: openssl rand -hex 32',
    );
  }

  if (errors.length === 0) return;

  console.error('\n[startup] Missing or invalid environment variables:\n');
  for (const msg of errors) {
    console.error(msg);
  }
  console.error('');
  process.exit(1);
}
