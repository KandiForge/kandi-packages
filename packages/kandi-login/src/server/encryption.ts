/**
 * AES-256-GCM encryption for secure token storage.
 *
 * Follows the same pattern as KandiForge's server encryption:
 * - AES-256-GCM (authenticated encryption)
 * - Random 16-byte IV per encryption
 * - 16-byte auth tag for integrity verification
 * - Packed format: base64(iv + authTag + ciphertext)
 * - Key derived from SHA-256 hash of encryption secret
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/** Derive a 32-byte AES key from a secret string */
function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

/** Encrypt a string using AES-256-GCM. Returns base64-encoded packed result. */
export function encrypt(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Pack: iv(16) + authTag(16) + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString('base64');
}

/** Decrypt a base64-encoded AES-256-GCM payload. Throws on tampered data. */
export function decrypt(encryptedBase64: string, secret: string): string {
  const key = deriveKey(secret);
  const packed = Buffer.from(encryptedBase64, 'base64');

  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted payload: too short');
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
