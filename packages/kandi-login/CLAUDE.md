# kandi-login

Multi-platform OAuth authentication framework. 5 client SDKs connect to 1 Node.js server SDK.

## What This Package Does

Provides complete client-side OAuth components AND a bundled auth server for Web (React), Electron, Tauri, iOS (Swift), and Android (Kotlin/Compose). Supports Apple, Google, Facebook, and Hello.coop providers. Rendering options: MUI, Tailwind, or headless.

## Architecture

```
Client SDKs (Web/Electron/Tauri/iOS/Android)
    │ HTTPS
    ▼
Node.js Server SDK (kandi-login/server)
    │ createAuthServer({ jwt, providers, userAdapter })
    ▼
Your Database (via UserAdapter interface)
```

### Key Modules

- `core/` — types, platform detection, token storage adapters, AuthService orchestrator
- `react/` — AuthProvider, useAuth hook, useLoginOverlay; sub-dirs `mui/` and `headless/`
- `tailwind/` — TailwindLoginChip, TailwindOverlay, kandi-login.css
- `server/` — createAuthServer factory, JWT (jose/HS256), HMAC state tokens, AES-256-GCM encryption, OAuth provider handlers (Arctic library), test personas
- `cli/` — init wizard, dev diagnostic wizard

### Entry Points (package.json exports)

| Import Path | Purpose |
|---|---|
| `kandi-login` | Core + React exports |
| `kandi-login/core` | Platform-agnostic core + platform adapters (TauriProvider, ElectronProvider, WebProvider) |
| `kandi-login/react` | AuthProvider, useAuth, useLoginOverlay |
| `kandi-login/react/mui` | MuiLoginChip, MuiLoginOverlay, MuiUserAvatar, provider icons |
| `kandi-login/react/headless` | HeadlessLoginChip (render-prop, zero styling) |
| `kandi-login/tailwind` | TailwindLoginChip, TailwindLoginOverlay |
| `kandi-login/server` | createAuthServer, JWT utils, security utils, test personas |

## Build

- Build tool: `tsup` (see `tsup.config.ts`)
- `npm run build` — builds ESM + CJS + types, copies CSS
- `npm run dev` — watch mode
- Output: `dist/`

## Key Design Decisions

- **OAuth uses Arctic library** for provider implementations (Hello.coop, Apple, Google, Facebook)
- **Hello.coop as OIDC gateway** — when configured, routes all non-Facebook providers through Hello.coop via `provider_hint`. One client ID covers Google, Apple, etc.
- **JWT tokens are HS256** — access tokens (1h TTL), refresh tokens (30d TTL), stateless (no server-side blacklist)
- **Rolling refresh** — handleRefresh issues both new access AND new refresh tokens
- **3-stage user upsert**: findByProviderId → findByEmail (cross-provider linking) → createUser
- **Platform detection order**: Tauri (window.__TAURI__) → Electron (userAgent) → Web (default)
- **Token storage per platform**: Tauri=OS keychain via Rust commands, Electron=safeStorage, Web=localStorage
- **Framework-agnostic server** — handlers use AuthRequest/AuthResponse interfaces, mountable on any Node.js framework
- **Two OAuth flows**: redirect (Hello.coop, Facebook) and native ID token (Apple, Google on mobile)

## Server Route Handlers

| Handler | Method | Description |
|---|---|---|
| `handleLogin` | GET | Initiates OAuth — generates HMAC state, redirects to provider |
| `handleCallback` | GET | OAuth callback — exchanges code, upserts user, issues JWTs |
| `handleNativeLogin` | POST | Mobile native ID token verification (Apple JWKS, Google JWKS) |
| `handleRefresh` | POST | Rolling token refresh |
| `handleValidate` | GET | Validates Bearer token |
| `handleLogout` | POST | Stateless acknowledgment |
| `handleSeedPersonas` | POST | Creates test users (when enableTestPersonas=true) |
| `handleListPersonas` | GET | Lists test personas |
| `handleLoginAs` | POST | Issues real JWTs for test persona |

## UserAdapter Interface (5 methods)

```
findByProviderId(provider, providerUserId) → user | null
findByEmail(email)                         → user | null
createUser(profile: OAuthProfile)          → user
linkProvider(userId, provider, providerUserId) → void
getUserById(id)                            → user | null
```

## Known Issues (v0.1.0)

- `return_url` parameter on `/login` is not validated against an allowlist — open redirect risk
- Nonce is generated in state token but not verified in Hello.coop callback path
- `corsOrigins` config field is declared but not implemented — no CORS headers are set by handlers
- Tokens delivered via URL query parameters in redirect flows (browser history, Referrer leakage)
- `window.location` accessed without SSR guard in `AuthService.buildLoginUrl`
- Test endpoints (`/test/*`) have no authentication — protect with network controls
- `AuthProvider` config must be a stable reference — inline objects cause re-creation on every render

## Examples

The `examples/` directory contains full working apps for each platform:
- `nextjs/` — Next.js web app
- `vite/` — Vite SPA
- `electron/` — Electron desktop app
- `tauri/` — Tauri desktop app
- `ios/` — Swift iOS app (standalone, not part of npm package)
- `android/` — Kotlin/Compose Android app (standalone, not part of npm package)

## Development Notes

- Peer dependencies are optional: MUI, Emotion, Tauri API; React is required for client components but not for server-only usage
- Published to npm as `kandi-login`
- CLI binary: `kandi-login` (init + dev commands)
- Tauri plugin template in `tauri-plugin/commands.rs.template`
