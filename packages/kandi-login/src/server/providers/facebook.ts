/**
 * Facebook OAuth provider
 *
 * Implements the authorization code flow:
 * 1. Build authorize URL → redirect user to Facebook
 * 2. Receive callback with code → exchange for access token
 * 3. Fetch user profile from Graph API → return normalized profile
 */

import type { FacebookCredentials, OAuthProfile } from '../types.js';

const AUTHORIZE_URL = 'https://www.facebook.com/v19.0/dialog/oauth';
const TOKEN_URL = 'https://graph.facebook.com/v19.0/oauth/access_token';
const PROFILE_URL = 'https://graph.facebook.com/v19.0/me';

/** Build the Facebook authorization URL */
export function buildFacebookAuthUrl(
  credentials: FacebookCredentials,
  params: {
    redirectUri: string;
    state: string;
  },
): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', credentials.appId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('state', params.state);
  url.searchParams.set('scope', 'email,public_profile');
  url.searchParams.set('response_type', 'code');
  return url.toString();
}

/** Exchange authorization code for an access token */
export async function exchangeFacebookCode(
  credentials: FacebookCredentials,
  code: string,
  redirectUri: string,
): Promise<string> {
  const url = new URL(TOKEN_URL);
  url.searchParams.set('client_id', credentials.appId);
  url.searchParams.set('client_secret', credentials.appSecret);
  url.searchParams.set('code', code);
  url.searchParams.set('redirect_uri', redirectUri);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Facebook token exchange failed: ${text}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
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
