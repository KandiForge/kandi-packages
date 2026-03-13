/**
 * Electron preload script
 *
 * Exposes a safe API to the renderer process via contextBridge.
 * This is what kandi-login's ElectronProvider and ElectronSecureStorage
 * expect to find on `window.electronAPI`.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  /** Open a URL in the system browser (used for OAuth flow) */
  openExternal: (url: string): Promise<void> => {
    return ipcRenderer.invoke('open-external', url);
  },

  /** Listen for OAuth callback from deep link */
  onOAuthCallback: (
    callback: (payload: { access_token: string; refresh_token: string | null }) => void,
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { access_token: string; refresh_token: string | null },
    ) => {
      callback(payload);
    };
    ipcRenderer.on('oauth-callback', handler);
    return () => {
      ipcRenderer.removeListener('oauth-callback', handler);
    };
  },

  /** Listen for OAuth errors from deep link */
  onOAuthError: (
    callback: (payload: { error: string }) => void,
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { error: string },
    ) => {
      callback(payload);
    };
    ipcRenderer.on('oauth-error', handler);
    return () => {
      ipcRenderer.removeListener('oauth-error', handler);
    };
  },

  /** Secure token storage backed by Electron safeStorage */
  secureStorage: {
    get: (key: string): Promise<string | null> => {
      return ipcRenderer.invoke('secure-storage:get', key);
    },
    set: (key: string, value: string): Promise<void> => {
      return ipcRenderer.invoke('secure-storage:set', key, value);
    },
    delete: (key: string): Promise<void> => {
      return ipcRenderer.invoke('secure-storage:delete', key);
    },
  },
});
