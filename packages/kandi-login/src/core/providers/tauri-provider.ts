/**
 * Tauri platform adapter for OAuth
 * Opens in-app webview or external browser for OAuth, intercepts deep link callback.
 * Matches ta8er/studio's existing Rust command signatures exactly.
 */

import type { PlatformAdapter, OAuthCallbackPayload, Platform } from '../types.js';

export class TauriProvider implements PlatformAdapter {
  readonly platform: Platform = 'tauri';

  private getTauriAPI(): Record<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tauri = (window as any).__TAURI__ as Record<string, unknown> | undefined;
    if (!tauri) {
      throw new Error('Tauri API not available');
    }
    return tauri;
  }

  async startOAuth(_authUrl: string, provider?: string): Promise<void> {
    const tauri = this.getTauriAPI();
    const core = tauri.core as { invoke: (cmd: string, args: Record<string, unknown>) => Promise<void> };
    await core.invoke('start_oauth', { provider: provider ?? null });
  }

  async onOAuthCallback(
    handler: (payload: OAuthCallbackPayload) => void,
  ): Promise<() => void> {
    const tauri = this.getTauriAPI();
    const event = tauri.event as {
      listen: (
        event: string,
        handler: (event: { payload: OAuthCallbackPayload }) => void,
      ) => Promise<() => void>;
    };

    const unlisten = await event.listen('oauth-callback', (e) => {
      handler(e.payload);
    });

    return unlisten;
  }
}
