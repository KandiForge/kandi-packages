/**
 * Hello.coop OIDC provider — powered by Arctic's generic OAuth2Client
 *
 * Hello.coop is not a built-in Arctic provider, so we use the generic client.
 * Arctic handles auth URL building + code→token exchange.
 * Userinfo fetch remains manual.
 *
 * Hello.coop acts as an OIDC gateway — it can route to upstream providers
 * (Google, Apple, Facebook, etc.) via the provider_hint parameter.
 */

import { OAuth2Client } from 'arctic';
import type { HelloCoopCredentials, OAuthProfile } from '../types.js';

const AUTHORIZE_URL = 'https://wallet.hello.coop/authorize';
const TOKEN_URL = 'https://wallet.hello.coop/oauth/token';
const USERINFO_URL = 'https://wallet.hello.coop/oauth/userinfo';

/** Create an Arctic OAuth2Client for Hello.coop */
export function createHelloCoopClient(
  credentials: HelloCoopCredentials,
  redirectUri: string,
): OAuth2Client {
  // Hello.coop is a public client (no client_secret for the authorize flow).
  // The token exchange sends client_id in the body via Arctic's generic client.
  return new OAuth2Client(credentials.clientId, null, redirectUri);
}

/** Build the Hello.coop authorization URL via Arctic */
export function buildHelloCoopAuthUrl(
  client: OAuth2Client,
  credentials: HelloCoopCredentials,
  params: {
    state: string;
    nonce: string;
  },
): string {
  const scopes = (credentials.scopes ?? 'openid email profile picture').split(' ');
  const url = client.createAuthorizationURL(AUTHORIZE_URL, params.state, scopes);
  url.searchParams.set('nonce', params.nonce);
  return url.toString();
}

/** Build Hello.coop authorize URL with a provider hint (google, apple, etc.) */
export function buildHelloCoopAuthUrlWithHint(
  client: OAuth2Client,
  credentials: HelloCoopCredentials,
  params: {
    state: string;
    nonce: string;
    providerHint?: string;
  },
): string {
  const url = buildHelloCoopAuthUrl(client, credentials, params);
  if (params.providerHint) {
    const parsed = new URL(url);
    parsed.searchParams.set('provider_hint', params.providerHint);
    return parsed.toString();
  }
  return url;
}

/** Exchange authorization code for tokens via Arctic */
export async function exchangeHelloCoopCode(
  client: OAuth2Client,
  code: string,
): Promise<{ id_token: string; access_token: string }> {
  const tokens = await client.validateAuthorizationCode(TOKEN_URL, code, null);
  return {
    access_token: tokens.accessToken(),
    id_token: tokens.idToken(),
  };
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
