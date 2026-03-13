# kandi-login Electron Example

A minimal Electron + React desktop app demonstrating kandi-login integration with OAuth deep links and secure token storage.

Pre-configured against `https://kandi-packages-api.vercel.app`.

## Prerequisites

- Node.js >= 18
- npm

## Setup

From the monorepo root:

```bash
npm install
npm run build --workspace=packages/kandi-login
```

Then install the example dependencies:

```bash
cd examples/electron
npm install
```

## Development

```bash
npm run dev
```

This starts both Vite (renderer) and Electron concurrently. The app opens automatically once Vite is ready.

## How it works

1. **Main process** (`main.ts`) registers the `kandi-example://` deep link protocol and creates a `BrowserWindow` with context isolation enabled.

2. **Preload script** (`preload.ts`) exposes `window.electronAPI` to the renderer:
   - `openExternal(url)` — opens the system browser for OAuth
   - `onOAuthCallback(cb)` — listens for deep link tokens forwarded from main
   - `secureStorage` — get/set/delete tokens via Electron `safeStorage`

3. **Renderer** (`src/App.tsx`) uses kandi-login's `AuthProvider` and `MuiLoginChip`. Platform detection is automatic — kandi-login sees the Electron user-agent and uses `ElectronProvider` + `ElectronSecureStorage`.

## OAuth flow

1. User clicks **Sign In** in the `MuiLoginChip`
2. kandi-login calls `window.electronAPI.openExternal(authUrl)` to open the browser
3. The auth server completes OAuth and redirects to `kandi-example://callback?access_token=...&refresh_token=...`
4. The OS routes the deep link to the Electron app
5. Main process parses the URL and sends tokens to the renderer via IPC
6. The `ElectronProvider` dispatches a `kandi-login-callback` custom event
7. `AuthProvider` picks up the tokens and fetches the user profile

## Using your own auth server

Change `AUTH_SERVER_URL` in `src/App.tsx`:

```ts
const AUTH_SERVER_URL = 'https://your-auth-server.example.com';
```

## Test personas

The app includes a **Test Personas** panel at the bottom of the page. Expand it to log in as one of the pre-built test users without needing a real OAuth provider:

| Persona       | Email                   | Role   |
| ------------- | ----------------------- | ------ |
| Alex Admin    | alex@test.kandi.dev     | admin  |
| Dana Designer | dana@test.kandi.dev     | user   |
| Val Viewer    | val@test.kandi.dev      | viewer |
| Naya Newbie   | naya@test.kandi.dev     | user   |

Each button calls `POST /test/login-as` on the auth server, receives real JWTs, stores them in secure storage, and reloads the app to restore the session.

## Production build

```bash
npm run build
npm run preview
```

## Packaging

Use `electron-builder` to create distributable packages:

```bash
npx electron-builder --mac
npx electron-builder --win
npx electron-builder --linux
```

## License

MIT
