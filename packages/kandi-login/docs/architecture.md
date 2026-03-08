# kandi-login Architecture

## System Overview

```
┌─────────────────────────────────────┐     ┌──────────────────────────────────┐
│           BROWSER (Client)          │     │       YOUR SERVER (Node.js)      │
│                                     │     │                                  │
│  kandi-login                        │     │  kandi-login/server              │
│  kandi-login/react                  │     │                                  │
│  kandi-login/react/mui              │     │  createAuthServer({              │
│  kandi-login/tailwind               │     │    jwt, providers, userAdapter   │
│  kandi-login/react/headless         │     │  })                              │
│                                     │     │                                  │
│  ┌───────────────┐                  │     │  ┌─────────────────────────┐     │
│  │ AuthProvider   │ ← config        │     │  │ OAuth Providers         │     │
│  │  └─ useAuth()  │                 │     │  │  Hello.coop (OIDC)     │     │
│  │  └─ LoginChip  │                 │     │  │  Apple (JWKS)          │     │
│  └───────────────┘                  │     │  │  Google (JWKS)         │     │
│                                     │     │  │  Facebook (code flow)  │     │
│  Token Storage:                     │     │  └─────────────────────────┘     │
│  ┌────────────────────────┐         │     │                                  │
│  │ Tauri  → OS keychain   │         │     │  ┌─────────────────────────┐     │
│  │ Electron → secureStore │         │     │  │ JWT Module (jose)       │     │
│  │ Web    → localStorage  │         │     │  │  HS256 access tokens   │     │
│  └────────────────────────┘         │     │  │  HS256 refresh tokens  │     │
│                                     │     │  └─────────────────────────┘     │
└──────────────┬──────────────────────┘     │                                  │
               │                            │  ┌─────────────────────────┐     │
               │  HTTP                      │  │ Security                │     │
               │                            │  │  HMAC state tokens     │     │
               │                            │  │  Nonce generation      │     │
               │                            │  │  AES-256-GCM encrypt   │     │
               │                            │  └─────────────────────────┘     │
               │                            │                                  │
               └────────────────────────────┤  ┌─────────────────────────┐     │
                                            │  │ UserAdapter (your code) │     │
                                            │  │  findByProviderId()    │     │
                                            │  │  findByEmail()         │     │
                                            │  │  createUser()          │     │
                                            │  │  linkProvider()        │     │
                                            │  │  getUserById()         │     │
                                            │  └───────────┬─────────────┘     │
                                            └──────────────┼──────────────────┘
                                                           │
                                            ┌──────────────▼──────────────────┐
                                            │         YOUR DATABASE            │
                                            └──────────────────────────────────┘
```

## Module Dependency Graph

```
kandi-login (main entry)
├── core/
│   ├── types.ts           ← shared interfaces (no runtime deps)
│   ├── platform-detector  ← isTauri(), isElectron(), isWeb()
│   ├── token-storage      ← Tauri keychain, Electron secure, Web localStorage
│   ├── auth-service       ← orchestrates login/logout/refresh/profile
│   └── providers/
│       ├── tauri-provider    ← invoke('start_oauth'), listen('oauth-callback')
│       ├── electron-provider ← shell.openExternal + CustomEvent
│       └── web-provider      ← popup window + postMessage
│
├── react/
│   ├── AuthProvider.tsx   ← creates AuthService, provides via context
│   ├── useAuth.ts         ← hook: user, login, logout, etc.
│   ├── useLoginOverlay.ts ← overlay state management
│   ├── mui/               ← MUI-styled: LoginChip, Overlay, Avatar
│   └── headless/          ← render-prop component, zero styling
│
├── tailwind/
│   ├── TailwindLoginChip  ← Tailwind-styled chip
│   ├── TailwindOverlay    ← Tailwind-styled overlay
│   └── kandi-login.css    ← CSS custom properties for theming
│
├── server/
│   ├── create-auth-server ← factory: config → 6+ handlers
│   ├── jwt                ← signAccessToken, signRefreshToken, verify*
│   ├── security           ← HMAC state tokens, nonce, bearer extraction
│   ├── encryption         ← AES-256-GCM encrypt/decrypt
│   ├── test-personas      ← seed, list, login-as handlers
│   ├── callback-handler   ← legacy v0 callback handler
│   └── providers/
│       ├── hellocoop      ← OIDC authorize + code exchange + userinfo
│       ├── apple           ← JWKS verification of id_token
│       ├── google          ← JWKS verification of id_token
│       └── facebook        ← code exchange + Graph API profile
│
└── cli/
    ├── init              ← first-time interactive setup wizard
    └── dev               ← re-runnable diagnostic wizard
```

## OAuth Flow: Redirect (Hello.coop, Facebook)

```
Client                          Your Server                      Provider
  │                                │                                │
  │ GET /auth/login?provider=google│                                │
  │──────────────────────────────→│                                │
  │                                │ Generate HMAC state token      │
  │                                │ Build authorize URL             │
  │ 302 Redirect                   │                                │
  │←──────────────────────────────│                                │
  │                                                                 │
  │ User authenticates at provider                                  │
  │──────────────────────────────────────────────────────────────→│
  │                                                                 │
  │                                │ GET /auth/callback?code=&state=│
  │                                │←────────────────────────────── │
  │                                │                                │
  │                                │ 1. Verify HMAC state           │
  │                                │ 2. Exchange code for tokens    │
  │                                │ 3. Fetch user profile          │
  │                                │ 4. Upsert user (UserAdapter)   │
  │                                │ 5. Sign JWTs                   │
  │                                │                                │
  │ 302 Redirect with tokens       │                                │
  │←──────────────────────────────│                                │
  │                                                                 │
  │ Store tokens locally           │                                │
  │ Fetch user profile             │                                │
```

## OAuth Flow: Native ID Token (Apple, Google)

```
Client (iOS/Android SDK)        Your Server
  │                                │
  │ Native SDK returns id_token    │
  │                                │
  │ POST /auth/native              │
  │ { provider, id_token }         │
  │──────────────────────────────→│
  │                                │ 1. Verify id_token via JWKS
  │                                │    (Apple: appleid.apple.com/auth/keys)
  │                                │    (Google: googleapis.com/oauth2/v3/certs)
  │                                │ 2. Extract user profile from claims
  │                                │ 3. Upsert user (UserAdapter)
  │                                │ 4. Sign JWTs
  │                                │
  │ { access_token, refresh_token }│
  │←──────────────────────────────│
```

## User Upsert (3-Stage Account Linking)

```
New login arrives with: { provider: "google", providerUserId: "goog-123", email: "jane@x.com" }

Stage 1: findByProviderId("google", "goog-123")
  ├── Found → return existing user, done
  └── Not found → continue

Stage 2: findByEmail("jane@x.com")
  ├── Found → linkProvider(existingUser.id, "google", "goog-123"), done
  │            (automatic cross-provider account linking)
  └── Not found → continue

Stage 3: createUser({ provider: "google", providerUserId: "goog-123", email: "jane@x.com", ... })
  └── Brand new user created, done
```

## JWT Token Architecture

```
Access Token (HS256, 1h TTL)
┌─────────────────────────────────┐
│ Header: { alg: "HS256", typ: "JWT" }
│ Payload: {
│   sub: "user-uuid",
│   email: "user@example.com",
│   role: "user",
│   aud: "authenticated",
│   display_name: "Jane Doe",
│   avatar_url: "https://...",
│   iss: "auth.myapp.com",
│   iat: 1709900000,
│   exp: 1709903600
│ }
│ Signature: HMAC-SHA256(header.payload, secret)
└─────────────────────────────────┘

Refresh Token (HS256, 30d TTL)
┌─────────────────────────────────┐
│ Payload: {
│   sub: "user-uuid",
│   type: "refresh",
│   iss: "auth.myapp.com",
│   iat: 1709900000,
│   exp: 1712492000
│ }
└─────────────────────────────────┘

Rolling refresh: every /refresh call issues new access + refresh tokens.
No server-side token blacklist (stateless).
```

## Test Personas Architecture

```
┌──────────────────────────────────────────────────────┐
│                 Test Persona System                    │
│                                                        │
│  POST /test/seed                                       │
│  ┌──────────────────────────────────────────┐          │
│  │ For each persona definition:              │          │
│  │  1. Check findByProviderId("test", id)   │          │
│  │  2. If not found, createUser(profile)     │          │
│  │  3. Sign JWT access + refresh tokens      │          │
│  │  4. Encrypt tokens with AES-256-GCM       │          │
│  │  5. Store encrypted tokens in memory       │          │
│  └──────────────────────────────────────────┘          │
│                                                        │
│  POST /test/login-as { personaId: "admin-alex" }       │
│  ┌──────────────────────────────────────────┐          │
│  │ 1. Find persona in definitions            │          │
│  │ 2. Find/create user via UserAdapter       │          │
│  │ 3. Sign FRESH JWTs (real, valid tokens)   │          │
│  │ 4. Encrypt and store updated tokens       │          │
│  │ 5. Return { access_token, refresh_token } │          │
│  └──────────────────────────────────────────┘          │
│                                                        │
│  Encrypted Token Store (in-memory):                    │
│  ┌──────────────────────────────────────────┐          │
│  │ Map<personaId, {                          │          │
│  │   encryptedAccessToken: AES-256-GCM,      │          │
│  │   encryptedRefreshToken: AES-256-GCM,     │          │
│  │   createdAt: ISO timestamp                │          │
│  │ }>                                        │          │
│  └──────────────────────────────────────────┘          │
│                                                        │
│  Security:                                             │
│  • Guarded by enableTestPersonas: true                 │
│  • Tokens encrypted at rest even in dev                │
│  • Uses same UserAdapter code path as production       │
│  • Signs real JWTs — identical to OAuth flow           │
└──────────────────────────────────────────────────────┘
```

## AES-256-GCM Encryption (Token Storage)

```
Encryption:
  plaintext → SHA-256(secret) → AES key (32 bytes)
            → randomBytes(16) → IV
            → AES-256-GCM(key, iv, plaintext) → ciphertext + authTag(16 bytes)
            → base64(iv + authTag + ciphertext) → stored string

Decryption:
  stored string → base64 decode → packed buffer
                → iv = buffer[0:16]
                → authTag = buffer[16:32]
                → ciphertext = buffer[32:]
                → AES-256-GCM.decrypt(key, iv, authTag, ciphertext) → plaintext

Key properties:
  • Random IV per encryption — same input produces different output each time
  • Auth tag prevents tampering — decryption fails if any bit is altered
  • SHA-256 key derivation — any length secret becomes a valid 256-bit key
```

## Platform Detection

```
Detection order (first match wins):

1. Tauri: window.__TAURI__ exists
   → Token storage: OS keychain via invoke('get_token', 'store_token')
   → OAuth: invoke('start_oauth') opens webview, listen('oauth-callback')

2. Electron: navigator.userAgent includes "electron"
   → Token storage: window.electronAPI.secureStorage
   → OAuth: shell.openExternal(), CustomEvent listener

3. Web (default):
   → Token storage: localStorage with kandi_login_ prefix
   → OAuth: popup window (500x700) with polling, fallback to redirect
```
