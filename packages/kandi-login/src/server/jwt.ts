/**
 * JWT signing and verification using jose (Edge Runtime compatible).
 *
 * Access tokens: HS256, configurable TTL (default 1h), contains user claims.
 * Refresh tokens: HS256, configurable TTL (default 30d), contains only sub + type.
 */

import { SignJWT, jwtVerify } from 'jose';
import type { JwtConfig, AccessTokenPayload } from './types.js';

function getSecret(config: JwtConfig): Uint8Array {
  return new TextEncoder().encode(config.secret);
}

/** Sign an access token with user claims */
export async function signAccessToken(
  config: JwtConfig,
  payload: AccessTokenPayload,
): Promise<string> {
  return new SignJWT({
    sub: payload.sub,
    email: payload.email,
    role: payload.role ?? 'user',
    aud: config.audience ?? 'authenticated',
    display_name: payload.display_name,
    avatar_url: payload.avatar_url,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(config.accessTokenTtl ?? '1h')
    .setIssuer(config.issuer)
    .sign(getSecret(config));
}

/** Sign a refresh token (minimal payload, longer TTL) */
export async function signRefreshToken(
  config: JwtConfig,
  userId: string,
): Promise<string> {
  return new SignJWT({
    sub: userId,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(config.refreshTokenTtl ?? '30d')
    .setIssuer(config.issuer)
    .sign(getSecret(config));
}

/** Verify an access token and return its claims */
export async function verifyAccessToken(
  config: JwtConfig,
  token: string,
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret(config), {
    issuer: config.issuer,
  });
  return payload as unknown as AccessTokenPayload;
}

/** Verify a refresh token and return the user ID (sub) */
export async function verifyRefreshToken(
  config: JwtConfig,
  token: string,
): Promise<string> {
  const { payload } = await jwtVerify(token, getSecret(config), {
    issuer: config.issuer,
  });
  if (payload.type !== 'refresh') {
    throw new Error('Not a refresh token');
  }
  if (!payload.sub) {
    throw new Error('Refresh token missing subject');
  }
  return payload.sub;
}
