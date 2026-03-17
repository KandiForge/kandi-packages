/**
 * AuthService — Platform-agnostic authentication service
 *
 * Manages the full OAuth lifecycle: login, logout, token storage,
 * token refresh, user profile fetching, and auth state events.
 *
 * Not a singleton — instantiated with config and typically held in React context.
 */

import type {
  KandiLoginConfig,
  KandiLoginUser,
  PlatformAdapter,
  TokenStorageAdapter,
  AuthEvent,
  AuthEventListener,
  OAuthCallbackPayload,
} from './types.js';
import { detectPlatform } from './platform-detector.js';
import { createDefaultTokenStorage } from './token-storage.js';
import { TauriProvider } from './providers/tauri-provider.js';
import { ElectronProvider } from './providers/electron-provider.js';
import { WebProvider } from './providers/web-provider.js';

const DEFAULT_LOGIN_PATH = '/api/mobile/login';
const DEFAULT_REFRESH_PATH = '/api/mobile/refresh';
const DEFAULT_PROFILE_PATH = '/api/v1/users/me';
const DEFAULT_LOGOUT_PATH = '/api/mobile/logout';
const DEFAULT_WEB_CALLBACK_PATH = '/auth/callback';

export class AuthService {
  private config: KandiLoginConfig;
  private tokenStorage: TokenStorageAdapter;
  private platformAdapter: PlatformAdapter;
  private listeners: Set<AuthEventListener> = new Set();
  private cachedUser: KandiLoginUser | null = null;
  private unlistenCallback: (() => void) | null = null;

  constructor(config: KandiLoginConfig) {
    this.config = config;
    this.tokenStorage = config.tokenStorage ?? createDefaultTokenStorage(
      config.keychainService,
    );
    this.platformAdapter = config.platformAdapter ?? this.createDefaultPlatformAdapter();
  }

  // -------------------------------------------------------------------------
  // Platform adapter factory
  // -------------------------------------------------------------------------

  private createDefaultPlatformAdapter(): PlatformAdapter {
    const platform = detectPlatform();
    switch (platform) {
      case 'tauri':
        return new TauriProvider();
      case 'electron':
        return new ElectronProvider();
      case 'web':
        return new WebProvider(
          this.config.webCallbackPath ?? DEFAULT_WEB_CALLBACK_PATH,
        );
    }
  }

  // -------------------------------------------------------------------------
  // URL builders
  // -------------------------------------------------------------------------

  private buildLoginUrl(provider?: string): string {
    const base = this.config.authServerUrl;
    const path = this.config.loginPath ?? DEFAULT_LOGIN_PATH;
    const url = new URL(path, base);

    // For desktop apps, set the return URL to the deep link scheme
    if (this.config.deepLinkScheme) {
      url.searchParams.set('return_url', `${this.config.deepLinkScheme}://auth/callback`);
    } else {
      // Web: use the current origin + callback path
      const callbackPath = this.config.webCallbackPath ?? DEFAULT_WEB_CALLBACK_PATH;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      url.searchParams.set('return_url', `${origin}${callbackPath}`);
    }

    if (provider) {
      url.searchParams.set('provider', provider);
    }

    return url.toString();
  }

  // -------------------------------------------------------------------------
  // Auth lifecycle
  // -------------------------------------------------------------------------

  /** Start the OAuth login flow for the given provider */
  async login(provider?: string): Promise<void> {
    // Clean up any previous callback listener
    if (this.unlistenCallback) {
      this.unlistenCallback();
      this.unlistenCallback = null;
    }

    // Set up callback listener before starting OAuth
    this.unlistenCallback = await this.platformAdapter.onOAuthCallback(
      async (payload: OAuthCallbackPayload) => {
        // Clean up listener
        if (this.unlistenCallback) {
          this.unlistenCallback();
          this.unlistenCallback = null;
        }

        if (payload.error) {
          this.emit({ type: 'error', error: new Error(payload.error) });
          return;
        }

        if (!payload.access_token || !payload.refresh_token) {
          this.emit({
            type: 'error',
            error: new Error('OAuth did not return tokens'),
          });
          return;
        }

        await this.tokenStorage.storeTokens(
          payload.access_token,
          payload.refresh_token,
        );

        const user = await this.fetchUser();
        this.cachedUser = user;
        this.emit({ type: 'login', user });
      },
    );

    const authUrl = this.buildLoginUrl(provider);
    await this.platformAdapter.startOAuth(authUrl, provider);
  }

  /** Log out the current user */
  async logout(): Promise<void> {
    // Optionally call the server logout endpoint
    try {
      const token = await this.tokenStorage.getAccessToken();
      if (token) {
        const logoutPath = this.config.logoutPath ?? DEFAULT_LOGOUT_PATH;
        const url = `${this.config.authServerUrl}${logoutPath}`;
        await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => {
          // Server logout is best-effort
        });
      }
    } catch {
      // Ignore server logout errors
    }

    await this.tokenStorage.clearTokens();
    this.cachedUser = null;
    this.emit({ type: 'logout' });
  }

  /** Check if the user has a stored access token */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.tokenStorage.getAccessToken();
    return token !== null;
  }

  /** Get the current access token */
  async getToken(): Promise<string | null> {
    return this.tokenStorage.getAccessToken();
  }

  /** Get the cached user or fetch from API */
  async getUser(forceRefresh = false): Promise<KandiLoginUser | null> {
    if (this.cachedUser && !forceRefresh) {
      return this.cachedUser;
    }

    const isAuth = await this.isAuthenticated();
    if (!isAuth) return null;

    const user = await this.fetchUser();
    this.cachedUser = user;
    return user;
  }

  /** Get the cached user without making a network request */
  getCachedUser(): KandiLoginUser | null {
    return this.cachedUser;
  }

  /** Refresh the access token using the stored refresh token */
  async refreshToken(): Promise<string | null> {
    const refreshToken = await this.tokenStorage.getRefreshToken();
    if (!refreshToken) return null;

    const refreshPath = this.config.refreshPath ?? DEFAULT_REFRESH_PATH;
    const url = `${this.config.authServerUrl}${refreshPath}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed — clear tokens and emit logout
      await this.tokenStorage.clearTokens();
      this.cachedUser = null;
      this.emit({ type: 'logout' });
      return null;
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
    };

    await this.tokenStorage.storeTokens(
      data.access_token,
      data.refresh_token ?? refreshToken,
    );

    this.emit({ type: 'token_refresh' });
    return data.access_token;
  }

  /**
   * Make an authenticated fetch request with automatic token refresh on 401.
   * Useful for consumers who want token management without building their own client.
   */
  async authenticatedFetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    let token = await this.tokenStorage.getAccessToken();

    const makeRequest = (accessToken: string | null) => {
      const headers = new Headers(options.headers);
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      return fetch(url, { ...options, headers });
    };

    let response = await makeRequest(token);

    // On 401, try refreshing the token once
    if (response.status === 401) {
      token = await this.refreshToken();
      if (token) {
        response = await makeRequest(token);
      }
    }

    return response;
  }

  /**
   * Restore session from stored tokens on app startup.
   * Returns the user if tokens are valid, null otherwise.
   */
  async restoreSession(): Promise<KandiLoginUser | null> {
    const isAuth = await this.isAuthenticated();
    if (!isAuth) return null;

    try {
      const user = await this.fetchUser();
      this.cachedUser = user;
      this.emit({ type: 'login', user });
      return user;
    } catch {
      // Token might be expired — try refresh
      const newToken = await this.refreshToken();
      if (newToken) {
        try {
          const user = await this.fetchUser();
          this.cachedUser = user;
          this.emit({ type: 'login', user });
          return user;
        } catch {
          // Give up
        }
      }

      await this.tokenStorage.clearTokens();
      this.cachedUser = null;
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Event system
  // -------------------------------------------------------------------------

  /** Subscribe to auth events. Returns an unlisten function. */
  onAuthEvent(listener: AuthEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: AuthEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Listener errors should not break the auth flow
      }
    }
  }

  // -------------------------------------------------------------------------
  // API calls
  // -------------------------------------------------------------------------

  private async fetchUser(): Promise<KandiLoginUser> {
    const apiBase = this.config.apiServerUrl ?? this.config.authServerUrl;
    const profilePath = this.config.profilePath ?? DEFAULT_PROFILE_PATH;
    const url = `${apiBase}${profilePath}`;

    const response = await this.authenticatedFetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: HTTP ${response.status}`);
    }

    return response.json() as Promise<KandiLoginUser>;
  }

  /** Clean up listeners and resources */
  destroy(): void {
    if (this.unlistenCallback) {
      this.unlistenCallback();
      this.unlistenCallback = null;
    }
    this.listeners.clear();
    this.cachedUser = null;
  }
}
