/**
 * Electron platform adapter for OAuth
 * Opens external browser for OAuth, listens for deep link callback
 * via custom events dispatched by the Electron main process.
 */

import type { PlatformAdapter, OAuthCallbackPayload, Platform } from '../types.js';

export class ElectronProvider implements PlatformAdapter {
  readonly platform: Platform = 'electron';

  async startOAuth(authUrl: string, _provider?: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electronAPI = (window as any).electronAPI as
      { openExternal?: (url: string) => Promise<void> } | undefined;

    if (electronAPI?.openExternal) {
      await electronAPI.openExternal(authUrl);
    } else {
      window.open(authUrl, '_blank');
    }
  }

  async onOAuthCallback(
    handler: (payload: OAuthCallbackPayload) => void,
  ): Promise<() => void> {
    const onLogin = ((event: CustomEvent<OAuthCallbackPayload>) => {
      handler(event.detail);
    }) as EventListener;

    const onError = ((event: CustomEvent<{ error: string }>) => {
      handler({
        access_token: null,
        refresh_token: null,
        error: event.detail.error,
      });
    }) as EventListener;

    window.addEventListener('kandi-login-callback', onLogin);
    window.addEventListener('kandi-login-error', onError);

    return () => {
      window.removeEventListener('kandi-login-callback', onLogin);
      window.removeEventListener('kandi-login-error', onError);
    };
  }
}
