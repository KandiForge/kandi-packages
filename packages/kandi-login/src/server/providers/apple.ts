/**
 * Apple Sign-In provider
 *
 * Verifies Apple ID tokens using Apple's public JWKS.
 * Supports both native (iOS SDK) and web (Sign in with Apple JS) flows.
 *
 * The client obtains an id_token from Apple's SDK and sends it to the server.
 * The server verifies the token signature against Apple's JWKS endpoint,
 * checks issuer and audience, then extracts the user profile.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AppleCredentials, OAuthProfile } from '../types.js';

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';

// Cached JWKS — jose handles key rotation automatically
const appleJWKS = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

/**
 * Verify an Apple ID token and extract profile data.
 *
 * @param credentials - Apple client configuration
 * @param idToken - The id_token from Apple's SDK
 * @param supplemental - Optional name/email from Apple's first-login response
 *   (Apple only provides name on the very first sign-in)
 */
export async function verifyAppleIdToken(
  credentials: AppleCredentials,
  idToken: string,
  supplemental?: {
    email?: string;
    givenName?: string;
    familyName?: string;
    nonce?: string;
  },
): Promise<OAuthProfile> {
  // Build audience list (Bundle ID + any additional client IDs)
  const audiences = [
    credentials.clientId,
    ...(credentials.additionalClientIds ?? []),
  ];

  const { payload } = await jwtVerify(idToken, appleJWKS, {
    issuer: APPLE_ISSUER,
    audience: audiences,
  });

  // Nonce verification (when client provides one)
  if (supplemental?.nonce && payload.nonce !== supplemental.nonce) {
    throw new Error('Apple ID token nonce mismatch');
  }

  const sub = payload.sub as string;
  // Apple hides email after first sign-in — use supplemental if available
  const email = supplemental?.email ?? (payload.email as string | undefined) ?? '';

  let displayName: string | undefined;
  if (supplemental?.givenName && supplemental.familyName) {
    displayName = `${supplemental.givenName} ${supplemental.familyName}`;
  } else if (supplemental?.givenName) {
    displayName = supplemental.givenName;
  }

  return {
    provider: 'apple',
    providerUserId: sub,
    email,
    name: displayName ?? null,
    avatarUrl: null, // Apple doesn't provide avatars
    emailVerified: (payload.email_verified as boolean) ?? false,
    raw: payload as unknown as Record<string, unknown>,
  };
}
