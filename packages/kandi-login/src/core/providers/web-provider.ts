/**
 * Web platform adapter for OAuth
 * Supports popup window or full-page redirect flows.
 */

import type { PlatformAdapter, OAuthCallbackPayload, Platform } from '../types.js';

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 700;
const POPUP_POLL_INTERVAL = 500;

export class WebProvider implements PlatformAdapter {
  readonly platform: Platform = 'web';
  private callbackPath: string;
  private pendingHandler: ((payload: OAuthCallbackPayload) => void) | null = null;
  private popupWindow: Window | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(callbackPath: string = '/auth/callback') {
    this.callbackPath = callbackPath;
    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('message', (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string } & OAuthCallbackPayload;
      if (data?.type === 'kandi-login-callback' && this.pendingHandler) {
        this.pendingHandler({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          error: data.error,
        });
        this.cleanup();
      }
    });
  }

  async startOAuth(authUrl: string, _provider?: string): Promise<void> {
    const left = window.screenX + (window.innerWidth - POPUP_WIDTH) / 2;
    const top = window.screenY + (window.innerHeight - POPUP_HEIGHT) / 2;
    const features = `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},popup=true`;

    this.popupWindow = window.open(authUrl, 'kandi-login-oauth', features);

    if (!this.popupWindow) {
      // Popup blocked — fall back to redirect
      window.location.href = authUrl;
      return;
    }

    // Poll for popup close (user cancelled)
    this.pollTimer = setInterval(() => {
      if (this.popupWindow?.closed) {
        if (this.pendingHandler) {
          this.pendingHandler({
            access_token: null,
            refresh_token: null,
            error: 'Login cancelled',
          });
        }
        this.cleanup();
      }
    }, POPUP_POLL_INTERVAL);
  }

  async onOAuthCallback(
    handler: (payload: OAuthCallbackPayload) => void,
  ): Promise<() => void> {
    this.pendingHandler = handler;

    // Also check URL params for redirect-based flow
    if (typeof window !== 'undefined' && window.location.pathname === this.callbackPath) {
      const params = new URLSearchParams(window.location.search);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const error = params.get('error');

      if (accessToken || error) {
        handler({
          access_token: accessToken,
          refresh_token: refreshToken,
          error,
        });

        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    return () => {
      this.pendingHandler = null;
      this.cleanup();
    };
  }

  private cleanup(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.popupWindow = null;
  }
}
