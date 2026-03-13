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
| `kandi-login/core` | Platform-agnostic core only |
| `kandi-login/react` | React components |
| `kandi-login/react/mui` | MUI-styled components |
| `kandi-login/react/headless` | Render-prop headless components |
| `kandi-login/tailwind` | Tailwind-styled components |
| `kandi-login/server` | Server SDK (createAuthServer) |

## Build

- Build tool: `tsup` (see `tsup.config.ts`)
- `npm run build` — builds ESM + CJS + types, copies CSS
- `npm run dev` — watch mode
- Output: `dist/`

## Key Design Decisions

- **OAuth uses Arctic library** for provider implementations (Hello.coop, Apple, Google, Facebook)
- **JWT tokens are HS256** — access tokens (1h TTL), refresh tokens (30d TTL), stateless (no server-side blacklist)
- **3-stage user upsert**: findByProviderId → findByEmail (cross-provider linking) → createUser
- **Platform detection order**: Tauri (window.__TAURI__) → Electron (userAgent) → Web (default)
- **Token storage per platform**: Tauri=OS keychain, Electron=secureStorage, Web=localStorage

## Examples

The `examples/` directory contains full working apps for each platform:
- `nextjs/` — Next.js web app
- `vite/` — Vite SPA
- `electron/` — Electron desktop app
- `tauri/` — Tauri desktop app
- `ios/` — Swift iOS app
- `android/` — Kotlin/Compose Android app

## Development Notes

- Peer dependencies are optional: MUI, Emotion, Tauri API, React
- Published to npm as `kandi-login`
- CLI binary: `kandi-login` (init + dev commands)
- Tauri plugin template in `tauri-plugin/`
