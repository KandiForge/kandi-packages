# kandi-login Tauri Example

A complete Tauri v2 + React desktop app demonstrating **kandi-login** integration with a Rust backend for OS keychain storage and deep link OAuth callbacks.

Pre-configured against `https://kandi-packages-api.vercel.app`.

## Prerequisites

- **Node.js** >= 18
- **Rust** (latest stable) — install via [rustup.rs](https://rustup.rs)
- **Tauri CLI v2** — `cargo install tauri-cli@^2`
- Platform dependencies for Tauri: see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

## Setup

```bash
# Install frontend dependencies
npm install

# Run in development mode (opens the Tauri window with hot-reload)
cargo tauri dev
```

## Build for Production

```bash
cargo tauri build
```

The built application bundle will be in `src-tauri/target/release/bundle/`.

## How It Works

### Frontend (React + MUI)

- `AuthProvider` from `kandi-login/react` wraps the app with authentication state.
- `MuiLoginChip` renders a sign-in button (unauthenticated) or user avatar chip (authenticated).
- `useAuth` hook provides `user`, `isAuthenticated`, `login()`, `logout()`, and `getToken()`.

### Backend (Rust)

The Tauri Rust backend exposes four commands that `kandi-login` calls via `window.__TAURI__.core.invoke()`:

| Command        | Description                                      |
| -------------- | ------------------------------------------------ |
| `start_oauth`  | Builds the OAuth URL and opens the default browser |
| `get_token`    | Reads a token from the OS keychain via `keyring`  |
| `store_token`  | Writes a token to the OS keychain                 |
| `clear_tokens` | Deletes tokens from the OS keychain               |

### OAuth Flow

1. User clicks **Sign In** → `MuiLoginChip` calls `login('google')`.
2. `kandi-login` invokes the `start_oauth` Tauri command.
3. The Rust backend opens `https://kandi-packages-api.vercel.app/api/mobile/login?provider=google&return_url=kandi-example://auth/callback` in the default browser.
4. After authentication, the auth server redirects to `kandi-example://auth/callback?access_token=...&refresh_token=...`.
5. The Tauri deep link handler catches the URL, parses the tokens, and emits an `oauth-callback` event.
6. `kandi-login` receives the event, stores tokens in the OS keychain, fetches the user profile, and updates React state.

## Using your own auth server

Change `AUTH_SERVER_URL` in `src/App.tsx`:

```ts
const AUTH_SERVER_URL = 'https://your-auth-server.example.com';
```

You will also need to update the base URL in `src-tauri/src/lib.rs` if the Rust `start_oauth` command builds URLs directly.

## Test personas

The app includes a **Test Personas** panel below the user info area. Expand it to log in as one of the pre-built test users without needing a real OAuth provider:

| Persona       | Email                   | Role   |
| ------------- | ----------------------- | ------ |
| Alex Admin    | alex@test.kandi.dev     | admin  |
| Dana Designer | dana@test.kandi.dev     | user   |
| Val Viewer    | val@test.kandi.dev      | viewer |
| Naya Newbie   | naya@test.kandi.dev     | user   |

Each button calls `POST /test/login-as` on the auth server, receives real JWTs, stores them in the OS keychain via the Tauri `store_token` command, and reloads the app to restore the session.

## Deep Link Scheme

The app registers `kandi-example://` as a custom URL scheme. On macOS this is handled automatically by Tauri. On Linux, `tauri-plugin-deep-link` registers the scheme at runtime in debug builds.

## License

MIT — KandiForge
