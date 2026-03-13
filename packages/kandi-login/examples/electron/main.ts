/**
 * Electron main process
 *
 * Creates the BrowserWindow, registers the deep link protocol,
 * and forwards OAuth callbacks to the renderer process.
 */

import { app, BrowserWindow, shell, safeStorage, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTOCOL = 'kandi-example';
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

// ---------------------------------------------------------------------------
// Deep link protocol registration
// ---------------------------------------------------------------------------

if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
    path.resolve(process.argv[1]),
  ]);
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// ---------------------------------------------------------------------------
// Single instance lock — required for deep links on Windows/Linux
// ---------------------------------------------------------------------------

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    // Deep link received while app was already running (Windows/Linux)
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const deepLinkUrl = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (deepLinkUrl) {
      handleDeepLink(deepLinkUrl);
    }
  });
}

// ---------------------------------------------------------------------------
// macOS: open-url event fires for deep links
// ---------------------------------------------------------------------------

app.on('open-url', (_event, url) => {
  if (url.startsWith(`${PROTOCOL}://`)) {
    handleDeepLink(url);
  }
});

// ---------------------------------------------------------------------------
// Deep link handler — parse tokens and forward to renderer
// ---------------------------------------------------------------------------

function handleDeepLink(url: string): void {
  if (!mainWindow) return;

  try {
    const parsed = new URL(url);
    const accessToken = parsed.searchParams.get('access_token');
    const refreshToken = parsed.searchParams.get('refresh_token');
    const error = parsed.searchParams.get('error');

    if (error) {
      mainWindow.webContents.send('oauth-error', { error });
    } else if (accessToken) {
      mainWindow.webContents.send('oauth-callback', {
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  } catch {
    mainWindow.webContents.send('oauth-error', {
      error: 'Failed to parse deep link URL',
    });
  }
}

// ---------------------------------------------------------------------------
// IPC handlers for secure storage
// ---------------------------------------------------------------------------

const tokenStore = new Map<string, string>();

ipcMain.handle('secure-storage:get', (_event, key: string): string | null => {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = tokenStore.get(key);
    if (!encrypted) return null;
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
  }
  return tokenStore.get(key) ?? null;
});

ipcMain.handle('secure-storage:set', (_event, key: string, value: string): void => {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value).toString('base64');
    tokenStore.set(key, encrypted);
  } else {
    tokenStore.set(key, value);
  }
});

ipcMain.handle('secure-storage:delete', (_event, key: string): void => {
  tokenStore.delete(key);
});

// IPC handler for opening external URLs
ipcMain.handle('open-external', (_event, url: string): Promise<void> => {
  return shell.openExternal(url);
});

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
