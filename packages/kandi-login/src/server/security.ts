/**
 * Security utilities for OAuth state tokens and nonce generation.
 *
 * State tokens use HMAC-SHA256 with a configurable secret.
 * Format: <base64url-payload>.<hmac-signature>
 * Payload includes expiration (10 min default) for CSRF protection.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface StatePayload {
  provider: string;
  returnUrl?: string;
  nonce?: string;
  clientType?: string;
  exp: string;
}

/** Generate a cryptographically random nonce (32 bytes hex) */
export function generateNonce(): string {
  return randomBytes(32).toString('hex');
}

/** Generate an HMAC-signed state token for OAuth flows */
export function generateState(
  secret: string,
  data: {
    provider: string;
    returnUrl?: string;
    nonce?: string;
    clientType?: string;
  },
): string {
  const payload: StatePayload = {
    ...data,
    exp: new Date(Date.now() + STATE_TTL_MS).toISOString(),
  };

  const base64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = createHmac('sha256', secret).update(base64).digest('base64url');

  return `${base64}.${hmac}`;
}

/** Verify and parse an HMAC-signed state token. Returns null if invalid or expired. */
export function verifyState(
  secret: string,
  state: string,
): StatePayload | null {
  const dotIndex = state.indexOf('.');
  if (dotIndex === -1) return null;

  const base64 = state.substring(0, dotIndex);
  const signature = state.substring(dotIndex + 1);

  // Compute expected HMAC
  const expectedHmac = createHmac('sha256', secret).update(base64).digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedHmac);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(base64, 'base64url').toString(),
    ) as StatePayload;

    // Check expiration
    if (new Date(payload.exp).getTime() < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/** Extract Bearer token from Authorization header */
export function extractBearerToken(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const auth = headers['authorization'] ?? headers['Authorization'];
  const value = Array.isArray(auth) ? auth[0] : auth;
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice(7);
}
