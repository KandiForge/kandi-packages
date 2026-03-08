/**
 * Hello.coop OIDC provider
 *
 * Implements the full authorization code flow:
 * 1. Build authorize URL → redirect user to Hello.coop wallet
 * 2. Receive callback with code → exchange for tokens
 * 3. Fetch userinfo → return normalized profile
 */

import type { HelloCoopCredentials, OAuthProfile } from '../types.js';

const AUTHORIZE_URL = 'https://wallet.hello.coop/authorize';
const TOKEN_URL = 'https://wallet.hello.coop/oauth/token';
const USERINFO_URL = 'https://wallet.hello.coop/oauth/userinfo';

/** Build the Hello.coop authorization URL */
export function buildHelloCoopAuthUrl(
  credentials: HelloCoopCredentials,
  params: {
    redirectUri: string;
    state: string;
    nonce: string;
  },
): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', credentials.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', credentials.scopes ?? 'openid email profile picture');
  url.searchParams.set('state', params.state);
  url.searchParams.set('nonce', params.nonce);
  return url.toString();
}

/** Build Hello.coop authorize URL with a provider hint (google, apple, etc.) */
export function buildHelloCoopAuthUrlWithHint(
  credentials: HelloCoopCredentials,
  params: {
    redirectUri: string;
    state: string;
    nonce: string;
    providerHint?: string;
  },
): string {
  const url = buildHelloCoopAuthUrl(credentials, params);
  if (params.providerHint) {
    const parsed = new URL(url);
    parsed.searchParams.set('provider_hint', params.providerHint);
    return parsed.toString();
  }
  return url;
}

/** Exchange authorization code for tokens */
export async function exchangeHelloCoopCode(
  credentials: HelloCoopCredentials,
  code: string,
  redirectUri: string,
): Promise<{ id_token: string; access_token: string }> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: credentials.clientId,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Hello.coop token exchange failed: ${text}`);
  }

  return response.json() as Promise<{ id_token: string; access_token: string }>;
}

/** Fetch user profile from Hello.coop userinfo endpoint */
export async function fetchHelloCoopProfile(
  accessToken: string,
): Promise<OAuthProfile> {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Hello.coop userinfo failed: ${response.status}`);
  }

  const data = await response.json() as Record<string, unknown>;

  return {
    provider: 'hellocoop',
    providerUserId: data.sub as string,
    email: data.email as string,
    name: (data.name as string) ?? null,
    avatarUrl: (data.picture as string) ?? null,
    emailVerified: (data.email_verified as boolean) ?? false,
    raw: data,
  };
}
