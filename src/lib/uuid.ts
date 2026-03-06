import 'crypto-randomuuid';

/**
 * Generates a UUID v4 string.
 * Uses the crypto-randomuuid polyfill for non-secure contexts.
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
