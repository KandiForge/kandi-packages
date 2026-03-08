/**
 * Core types for kandi-login
 * All shared interfaces generalized from KandiForge and ta8er auth patterns
 */

import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

/** Authenticated user profile returned after login */
export interface KandiLoginUser {
  id: string;
  email: string;
  name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  email_verified?: boolean;
  /** Allow consumer-specific fields */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// OAuth Providers
// ---------------------------------------------------------------------------

/** Built-in provider identifiers */
export type BuiltInProvider = 'apple' | 'google' | 'facebook' | 'hellocoop';

/** OAuth provider configuration */
export interface OAuthProviderConfig {
  /** Provider identifier (e.g., "apple", "google", or a custom string) */
  id: string;
  /** Display name shown on buttons */
  name: string;
  /** Custom icon (React node — SVG component, img, etc.) */
  icon?: ReactNode;
  /** Whether this provider is enabled (default: true) */
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Token Storage
// ---------------------------------------------------------------------------

/** Adapter for secure token persistence across platforms */
export interface TokenStorageAdapter {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  storeTokens(accessToken: string, refreshToken: string): Promise<void>;
  clearTokens(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Platform Adapter
// ---------------------------------------------------------------------------

/** Payload received from OAuth callback (desktop deep link or web redirect) */
export interface OAuthCallbackPayload {
  access_token: string | null;
  refresh_token: string | null;
  error: string | null;
}

/** Platform-specific OAuth flow adapter */
export interface PlatformAdapter {
  /** Current platform identifier */
  readonly platform: Platform;
  /** Start the OAuth login flow for a given provider */
  startOAuth(authUrl: string, provider?: string): Promise<void>;
  /** Listen for OAuth callback. Returns an unlisten function. */
  onOAuthCallback(
    handler: (payload: OAuthCallbackPayload) => void,
  ): Promise<() => void>;
}

/** Supported platform types */
export type Platform = 'tauri' | 'electron' | 'web';

// ---------------------------------------------------------------------------
// Auth Events
// ---------------------------------------------------------------------------

/** Auth event types emitted by AuthService */
export type AuthEventType = 'login' | 'logout' | 'token_refresh' | 'error';

/** Structured auth event */
export interface AuthEvent {
  type: AuthEventType;
  user?: KandiLoginUser | null;
  error?: Error;
}

/** Auth event listener callback */
export type AuthEventListener = (event: AuthEvent) => void;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Main configuration for kandi-login */
export interface KandiLoginConfig {
  /** Auth server base URL (e.g., "https://auth.ta8er.com") */
  authServerUrl: string;

  /** API server base URL for profile/user endpoints (e.g., "https://api.ta8er.com") */
  apiServerUrl?: string;

  /** OAuth providers to enable */
  providers: OAuthProviderConfig[];

  /** Deep link scheme for desktop apps (e.g., "ta8er", "myapp") */
  deepLinkScheme?: string;

  /** Service name for OS keychain storage (e.g., "com.ta8er.studio") */
  keychainService?: string;

  /** Custom token storage adapter (overrides default platform-based storage) */
  tokenStorage?: TokenStorageAdapter;

  /** Custom platform adapter (overrides default platform detection) */
  platformAdapter?: PlatformAdapter;

  // --- Path overrides (defaults follow common conventions) ---

  /** Path on auth server for login initiation (default: "/api/mobile/login") */
  loginPath?: string;

  /** Path on auth server for token refresh (default: "/api/mobile/refresh") */
  refreshPath?: string;

  /** Path on API server for fetching user profile (default: "/api/v1/users/me") */
  profilePath?: string;

  /** Callback URL path for web (default: "/auth/callback") */
  webCallbackPath?: string;

  /** Path on auth server for logout (default: "/api/mobile/logout") */
  logoutPath?: string;
}

// ---------------------------------------------------------------------------
// Auth State (used by React layer)
// ---------------------------------------------------------------------------

/** Auth state exposed by useAuth hook */
export interface AuthState {
  user: KandiLoginUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Login Chip Menu
// ---------------------------------------------------------------------------

/** Custom menu item for the login chip dropdown */
export interface LoginChipMenuItem {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  /** Position in menu: 'top' (after first item) or 'bottom' (before logout) */
  position?: 'top' | 'bottom';
  /** Add a divider after this item */
  dividerAfter?: boolean;
}

/** Visual variant for the login chip */
export type ChipVariant = 'glass' | 'flat';
