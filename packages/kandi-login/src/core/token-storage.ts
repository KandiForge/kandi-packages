/**
 * Token storage adapters for different platforms
 */

import type { TokenStorageAdapter } from './types.js';
import { detectPlatform } from './platform-detector.js';

// ---------------------------------------------------------------------------
// Tauri Keychain Storage
// ---------------------------------------------------------------------------

/**
 * Stores tokens in the OS keychain via Tauri invoke commands.
 * Requires the consumer's Tauri app to expose these commands:
 *   - get_token(service, key) -> string | null
 *   - store_token(service, key, value) -> void
 *   - clear_tokens(service) -> void
 */
export class TauriKeychainStorage implements TokenStorageAdapter {
  private service: string;

  constructor(service: string) {
    this.service = service;
  }

  private async invoke<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
    if (typeof window === 'undefined') {
      throw new Error('Tauri API not available (server environment)');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tauri = (window as any).__TAURI__ as Record<string, unknown> | undefined;
    if (!tauri) {
      throw new Error('Tauri API not available');
    }
    const core = tauri.core as { invoke: (cmd: string, args: Record<string, unknown>) => Promise<T> };
    return core.invoke(cmd, args);
  }

  async getAccessToken(): Promise<string | null> {
    return this.invoke<string | null>('get_token', {
      service: this.service,
      key: 'access_token',
    });
  }

  async getRefreshToken(): Promise<string | null> {
    return this.invoke<string | null>('get_token', {
      service: this.service,
      key: 'refresh_token',
    });
  }

  async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.invoke('store_token', {
      service: this.service,
      key: 'access_token',
      value: accessToken,
    });
    await this.invoke('store_token', {
      service: this.service,
      key: 'refresh_token',
      value: refreshToken,
    });
  }

  async clearTokens(): Promise<void> {
    await this.invoke('clear_tokens', { service: this.service });
  }
}

// ---------------------------------------------------------------------------
// Web Storage (localStorage)
// ---------------------------------------------------------------------------

const DEFAULT_PREFIX = 'kandi_login_';

/**
 * Stores tokens in localStorage with a configurable key prefix.
 * Suitable for web applications. For production use, consider HttpOnly cookies
 * or a more secure approach depending on your threat model.
 */
export class WebLocalStorage implements TokenStorageAdapter {
  private prefix: string;

  constructor(prefix: string = DEFAULT_PREFIX) {
    this.prefix = prefix;
  }

  async getAccessToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`${this.prefix}access_token`);
  }

  async getRefreshToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`${this.prefix}refresh_token`);
  }

  async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${this.prefix}access_token`, accessToken);
    localStorage.setItem(`${this.prefix}refresh_token`, refreshToken);
  }

  async clearTokens(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`${this.prefix}access_token`);
    localStorage.removeItem(`${this.prefix}refresh_token`);
  }
}

// ---------------------------------------------------------------------------
// Electron Secure Storage
// ---------------------------------------------------------------------------

interface ElectronAPI {
  secureStorage: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
}

/**
 * Stores tokens via Electron's preload-exposed secureStorage API.
 * Requires the Electron app to expose `window.electronAPI.secureStorage`.
 */
export class ElectronSecureStorage implements TokenStorageAdapter {
  private get api(): ElectronAPI {
    if (typeof window === 'undefined') {
      throw new Error('Electron secureStorage API not available (server environment)');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electronAPI = (window as any).electronAPI as ElectronAPI | undefined;
    if (!electronAPI?.secureStorage) {
      throw new Error(
        'Electron secureStorage API not available. ' +
        'Expose it via contextBridge in your preload script.',
      );
    }
    return electronAPI;
  }

  async getAccessToken(): Promise<string | null> {
    return this.api.secureStorage.get('access_token');
  }

  async getRefreshToken(): Promise<string | null> {
    return this.api.secureStorage.get('refresh_token');
  }

  async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.api.secureStorage.set('access_token', accessToken);
    await this.api.secureStorage.set('refresh_token', refreshToken);
  }

  async clearTokens(): Promise<void> {
    await this.api.secureStorage.delete('access_token');
    await this.api.secureStorage.delete('refresh_token');
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Create the default token storage adapter for the current platform */
export function createDefaultTokenStorage(
  keychainService?: string,
  storagePrefix?: string,
): TokenStorageAdapter {
  const platform = detectPlatform();
  switch (platform) {
    case 'tauri':
      return new TauriKeychainStorage(keychainService ?? 'kandi-login');
    case 'electron':
      return new ElectronSecureStorage();
    case 'web':
      return new WebLocalStorage(storagePrefix);
  }
}
