/**
 * Facebook OAuth provider — powered by Arctic
 *
 * 1. Arctic handles auth URL building + code→token exchange
 * 2. Profile fetch from Graph API remains manual (Arctic doesn't fetch profiles)
 */

import { Facebook, OAuth2RequestError } from 'arctic';
import type { FacebookCredentials, OAuthProfile } from '../types.js';

const PROFILE_URL = 'https://graph.facebook.com/v19.0/me';

/** Create an Arctic Facebook client instance */
export function createFacebookClient(
  credentials: FacebookCredentials,
  redirectUri: string,
): Facebook {
  return new Facebook(credentials.appId, credentials.appSecret, redirectUri);
}

/** Build the Facebook authorization URL via Arctic */
export function buildFacebookAuthUrl(
  client: Facebook,
  state: string,
): string {
  const url = client.createAuthorizationURL(state, ['email', 'public_profile']);
  return url.toString();
}

/** Exchange authorization code for an access token via Arctic */
export async function exchangeFacebookCode(
  client: Facebook,
  code: string,
): Promise<string> {
  try {
    const tokens = await client.validateAuthorizationCode(code);
    return tokens.accessToken();
  } catch (e) {
    // Facebook returns non-RFC-compliant errors
    if (e instanceof OAuth2RequestError) {
      throw new Error(`Facebook token exchange failed: ${e.code} ${e.description}`);
    }
    throw e;
  }
}

/** Fetch user profile from Facebook Graph API */
export async function fetchFacebookProfile(
  accessToken: string,
): Promise<OAuthProfile> {
  const url = new URL(PROFILE_URL);
  url.searchParams.set('fields', 'id,email,name,picture.type(large)');
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Facebook profile fetch failed: ${response.status}`);
  }

  const data = await response.json() as {
    id: string;
    email?: string;
    name?: string;
    picture?: { data?: { url?: string } };
  };

  return {
    provider: 'facebook',
    providerUserId: data.id,
    email: data.email ?? '',
    name: data.name ?? null,
    avatarUrl: data.picture?.data?.url ?? null,
    emailVerified: true, // Facebook emails are verified
    raw: data as unknown as Record<string, unknown>,
  };
}
