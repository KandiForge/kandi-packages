/**
 * Google Sign-In provider
 *
 * Verifies Google ID tokens using Google's public JWKS.
 * Supports both native (GIDSignIn SDK) and web (GSI) flows.
 *
 * The client obtains an id_token from Google's SDK and sends it to the server.
 * The server verifies the token against Google's JWKS, checks issuer and
 * audience, then extracts the user profile.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { GoogleCredentials, OAuthProfile } from '../types.js';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
// Google uses both issuer forms
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

// Cached JWKS — jose handles key rotation automatically
const googleJWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

/**
 * Verify a Google ID token and extract profile data.
 *
 * @param credentials - Google client configuration
 * @param idToken - The id_token from Google's SDK
 * @param supplemental - Optional name/email/picture from client (may be richer)
 */
export async function verifyGoogleIdToken(
  credentials: GoogleCredentials,
  idToken: string,
  supplemental?: {
    email?: string;
    name?: string;
    picture?: string;
  },
): Promise<OAuthProfile> {
  const audiences = [
    credentials.clientId,
    ...(credentials.webClientId ? [credentials.webClientId] : []),
  ];

  const { payload } = await jwtVerify(idToken, googleJWKS, {
    issuer: GOOGLE_ISSUERS,
    audience: audiences,
  });

  return {
    provider: 'google',
    providerUserId: payload.sub as string,
    email: supplemental?.email ?? (payload.email as string) ?? '',
    name: supplemental?.name ?? (payload.name as string | undefined) ?? null,
    avatarUrl: supplemental?.picture ?? (payload.picture as string | undefined) ?? null,
    emailVerified: (payload.email_verified as boolean) ?? false,
    raw: payload as unknown as Record<string, unknown>,
  };
}
