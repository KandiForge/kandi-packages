/**
 * Server-side types for kandi-login auth server
 */

import type { KandiLoginUser } from '../core/types.js';

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------

/** Claims embedded in access tokens */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role?: string;
  aud?: string;
  display_name?: string;
  avatar_url?: string;
}

/** JWT configuration */
export interface JwtConfig {
  /** HMAC secret for signing JWTs (min 32 chars recommended) */
  secret: string;
  /** Token issuer claim (e.g., "auth.myapp.com") */
  issuer: string;
  /** Access token TTL (default: "1h") — jose duration string */
  accessTokenTtl?: string;
  /** Refresh token TTL (default: "30d") — jose duration string */
  refreshTokenTtl?: string;
  /** Audience claim for access tokens (default: "authenticated") */
  audience?: string;
}

// ---------------------------------------------------------------------------
// OAuth Provider Credentials
// ---------------------------------------------------------------------------

export interface HelloCoopCredentials {
  clientId: string;
  /** Custom scopes (default: "openid email profile picture") */
  scopes?: string;
}

export interface GoogleCredentials {
  clientId: string;
  clientSecret?: string;
  /** Web client ID for ID token audience check (if different from clientId) */
  webClientId?: string;
}

export interface AppleCredentials {
  /** iOS Bundle ID or Services ID */
  clientId: string;
  /** Additional client IDs to accept (e.g., web Services ID) */
  additionalClientIds?: string[];
}

export interface FacebookCredentials {
  appId: string;
  appSecret: string;
}

/** All provider credentials */
export interface ProviderCredentials {
  hellocoop?: HelloCoopCredentials;
  google?: GoogleCredentials;
  apple?: AppleCredentials;
  facebook?: FacebookCredentials;
}

// ---------------------------------------------------------------------------
// User Adapter (Database Interface)
// ---------------------------------------------------------------------------

/** Profile data extracted from an OAuth provider */
export interface OAuthProfile {
  provider: string;
  providerUserId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  /** Raw claims/data from the provider (for custom extraction) */
  raw?: Record<string, unknown>;
}

/**
 * Database adapter for user management.
 * Consumers implement this to connect kandi-login to their database.
 */
export interface UserAdapter {
  /** Find a user by provider + provider user ID */
  findByProviderId(provider: string, providerUserId: string): Promise<KandiLoginUser | null>;

  /** Find a user by email (for cross-provider account linking) */
  findByEmail(email: string): Promise<KandiLoginUser | null>;

  /** Create a new user from OAuth profile. Return the created user. */
  createUser(profile: OAuthProfile): Promise<KandiLoginUser>;

  /**
   * Link a provider to an existing user (account linking).
   * Called when a user with the same email signs in with a different provider.
   */
  linkProvider(userId: string, provider: string, providerUserId: string): Promise<void>;

  /** Get a user by ID (for token refresh / validation) */
  getUserById(id: string): Promise<KandiLoginUser | null>;
}

// ---------------------------------------------------------------------------
// Auth Server Configuration
// ---------------------------------------------------------------------------

/** Full configuration for createAuthServer() */
export interface AuthServerConfig {
  /** JWT signing configuration */
  jwt: JwtConfig;

  /** OAuth provider credentials */
  providers: ProviderCredentials;

  /** Database adapter for user CRUD */
  userAdapter: UserAdapter;

  /** Deep link scheme for desktop apps (e.g., "ta8er", "myapp") */
  deepLinkScheme?: string;

  /** Web redirect URL after successful login (e.g., "https://myapp.com/dashboard") */
  successRedirectUrl?: string;

  /** Web redirect URL on login error */
  errorRedirectUrl?: string;

  /**
   * Base URL of the auth server itself (for constructing callback URLs).
   * Required for redirect-based OAuth flows (Hello.coop, Facebook).
   * Example: "https://auth.myapp.com"
   */
  baseUrl?: string;

  /** Callback path on this server (default: "/callback") */
  callbackPath?: string;

  /** CORS allowed origins (default: ["*"]) */
  corsOrigins?: string[];

  /** Secret for HMAC-signing OAuth state tokens (default: derives from jwt.secret) */
  stateSecret?: string;

  /**
   * Called after successful login before tokens are issued.
   * Use for custom validation, logging, or enriching the user object.
   * Throw to reject the login.
   */
  onLogin?: (user: KandiLoginUser, provider: string) => Promise<void>;

  /**
   * Called after a new user is created.
   * Use for provisioning (creating teams, sending welcome emails, etc.).
   */
  onUserCreated?: (user: KandiLoginUser, provider: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Request / Response (Framework-Agnostic)
// ---------------------------------------------------------------------------

/** Minimal request interface (works with Express, Next.js, Vercel, etc.) */
export interface AuthRequest {
  method: string;
  url?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

/** Minimal response interface */
export interface AuthResponse {
  status(code: number): AuthResponse;
  json(data: unknown): void;
  redirect(url: string): void;
  send(body: string): void;
  setHeader(name: string, value: string): AuthResponse;
}

// ---------------------------------------------------------------------------
// Auth Server Instance
// ---------------------------------------------------------------------------

/** Handler function signature */
export type AuthHandler = (req: AuthRequest, res: AuthResponse) => Promise<void>;

/** The auth server instance returned by createAuthServer() */
export interface AuthServer {
  /** GET /login?provider=google&return_url=... */
  handleLogin: AuthHandler;

  /** GET /callback?code=...&state=... (OAuth redirect callback) */
  handleCallback: AuthHandler;

  /** POST /native { provider, id_token } (native Apple/Google ID token) */
  handleNativeLogin: AuthHandler;

  /** POST /refresh { refresh_token } */
  handleRefresh: AuthHandler;

  /** GET /validate (Authorization: Bearer <token>) */
  handleValidate: AuthHandler;

  /** POST /logout (Authorization: Bearer <token>) */
  handleLogout: AuthHandler;

  /** Utility: verify an access token and return its payload */
  verifyToken: (token: string) => Promise<AccessTokenPayload>;

  /** Utility: sign tokens for a user */
  signTokens: (user: KandiLoginUser) => Promise<{ access_token: string; refresh_token: string }>;
}

// ---------------------------------------------------------------------------
// Legacy (kept for backward compat with v0 callback handler)
// ---------------------------------------------------------------------------

/** @deprecated Use AuthServerConfig instead */
export interface CallbackHandlerConfig {
  exchangeCode: (code: string, provider: string) => Promise<{
    access_token: string;
    refresh_token: string;
    user: KandiLoginUser;
  }>;
  successRedirectUrl: string;
  deepLinkScheme?: string;
  errorRedirectUrl?: string;
}

/** @deprecated Use AuthRequest instead */
export interface CallbackRequest {
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
}

/** @deprecated Use AuthResponse instead */
export interface CallbackResponse {
  status: (code: number) => CallbackResponse;
  redirect: (url: string) => void;
  json: (data: unknown) => void;
}
