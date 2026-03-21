import 'crypto-randomuuid';

/**
 * Generates a UUID v4 string.
 * Uses the crypto-randomuuid polyfill for non-secure contexts.
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_RE.test(id);
}
