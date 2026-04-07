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
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag(); // MUST be called AFTER cipher.final()
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
    return (
      decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8')
    );
  } catch {
    return null; // tampered or corrupt value
  }
}
