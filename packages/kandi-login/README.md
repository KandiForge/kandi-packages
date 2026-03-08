# kandi-login

Universal OAuth login for React + Node.js. Complete client components AND bundled auth server — no separate backend needed.

Works in **Tauri**, **Electron**, and **Web** with **MUI**, **Tailwind**, or **headless** rendering. Supports **Apple**, **Google**, **Facebook**, and **Hello.coop** OAuth providers.

---

## Architecture

```
┌─────────────────────────────────────┐     ┌──────────────────────────────────┐
│           BROWSER (Client)          │     │       YOUR SERVER (Node.js)      │
│                                     │     │                                  │
│  kandi-login                        │     │  kandi-login/server              │
│  kandi-login/react                  │     │                                  │
│  kandi-login/react/mui              │     │  createAuthServer({              │
│  kandi-login/tailwind               │     │    jwt: { ... },                 │
│  kandi-login/react/headless         │     │    providers: { ... },           │
│                                     │     │    userAdapter: { ... },  ←──── YOUR DB QUERIES │
│  ┌───────────────┐                  │     │  })                              │
│  │ AuthProvider   │ ← config        │     │                                  │
│  │  └─ useAuth()  │                 │     │  Handles:                        │
│  │  └─ LoginChip  │                 │     │  • OAuth redirect flow           │
│  └───────────────┘                  │     │  • JWKS token verification       │
│                                     │     │  • JWT signing (jose/HS256)      │
│  Stores JWT in:                     │     │  • User upsert + account linking │
│  • Tauri: OS keychain               │     │  • Token refresh (rolling)       │
│  • Electron: secureStorage          │     │                                  │
│  • Web: localStorage                │     │                                  │
└──────────────┬──────────────────────┘     └───────────────┬──────────────────┘
               │  HTTP requests                             │
               │  GET  /auth/login?provider=google          │
               │  GET  /auth/callback?code=...&state=...    │
               │  POST /auth/native {provider, id_token}    │
               │  POST /auth/refresh {refresh_token}        │
               │  GET  /auth/validate (Bearer token)        │
               │  POST /auth/logout                         │
               └────────────────────────────────────────────┘
                                                            │
                                            ┌───────────────▼──────────────────┐
                                            │         YOUR DATABASE            │
                                            │  (Supabase, Prisma, Drizzle,    │
                                            │   Mongo, raw SQL — anything)     │
                                            └──────────────────────────────────┘
```

**Key concept:** The client-side React components (`kandi-login`) know nothing about your database. They store JWTs locally and talk to your server over HTTP. The server-side module (`kandi-login/server`) handles all OAuth complexity. You provide a `UserAdapter` — 5 database query functions — and kandi-login does everything else.

---

## Quick Start

### 1. Install

```bash
npm install kandi-login
```

`jose` is bundled as a dependency — no extra install needed.

### 2. Server — Create auth endpoints

```ts
// server/auth.ts
import { createAuthServer } from 'kandi-login/server';

const auth = createAuthServer({
  jwt: {
    secret: process.env.JWT_SECRET!,       // min 32 chars, HMAC key
    issuer: 'auth.myapp.com',              // your domain
  },
  providers: {
    google: { clientId: process.env.GOOGLE_CLIENT_ID! },
    apple: { clientId: process.env.APPLE_CLIENT_ID! },
    hellocoop: { clientId: process.env.HELLO_CLIENT_ID! },
    facebook: { appId: process.env.FB_APP_ID!, appSecret: process.env.FB_APP_SECRET! },
  },
  userAdapter: myAdapter,   // see "User Adapter" section below
  baseUrl: 'https://auth.myapp.com',
  successRedirectUrl: 'https://myapp.com/dashboard',
  deepLinkScheme: 'myapp',  // for Tauri/Electron desktop apps
});

// Express
app.get('/auth/login',    auth.handleLogin);
app.get('/auth/callback', auth.handleCallback);
app.post('/auth/native',  auth.handleNativeLogin);
app.post('/auth/refresh', auth.handleRefresh);
app.get('/auth/validate', auth.handleValidate);
app.post('/auth/logout',  auth.handleLogout);
```

### 3. Client — Add auth to your React app

```tsx
// App.tsx
import { AuthProvider } from 'kandi-login';
import { MuiLoginChip } from 'kandi-login/react/mui';

const authConfig = {
  authServerUrl: 'https://auth.myapp.com',
  providers: [
    { id: 'google', name: 'Google' },
    { id: 'apple', name: 'Apple' },
  ],
};

function App() {
  return (
    <AuthProvider config={authConfig}>
      <Header />
    </AuthProvider>
  );
}

function Header() {
  return <MuiLoginChip variant="glass" />;
}
```

---

## Import Paths

| Path | Exports | Peer Dependencies |
|------|---------|-------------------|
| `kandi-login` | Core types + React hooks (`AuthProvider`, `useAuth`) | `react` |
| `kandi-login/core` | `AuthService`, types, platform detection (no React) | None |
| `kandi-login/react` | `AuthProvider`, `useAuth`, `useLoginOverlay` | `react` |
| `kandi-login/react/mui` | `MuiLoginChip`, `MuiLoginOverlay`, `MuiUserAvatar` | `react`, `@mui/material`, `@emotion/react`, `@emotion/styled` |
| `kandi-login/react/headless` | `HeadlessLoginChip` (render-prop, zero styling) | `react` |
| `kandi-login/tailwind` | `TailwindLoginChip`, `TailwindLoginOverlay` | `react` |
| `kandi-login/tailwind/kandi-login.css` | CSS custom properties for theming | None |
| `kandi-login/server` | `createAuthServer`, `createCallbackHandler`, JWT utils, provider utils | Node.js 18+ |

MUI, Emotion, and `@tauri-apps/api` are **optional** peer dependencies — only needed if you use those entry points.

---

## Server API Reference

`createAuthServer(config)` returns an `AuthServer` object with 6 request handlers and 2 utility functions.

### Endpoints

#### `GET /login`

Initiates OAuth by redirecting to the provider's authorization page.

| Query param | Type | Required | Description |
|-------------|------|----------|-------------|
| `provider` | string | No (default: `"hellocoop"`) | Provider id: `"google"`, `"apple"`, `"facebook"`, `"hellocoop"` |
| `return_url` | string | No | Where to redirect after auth (overrides `successRedirectUrl`) |
| `client_type` | string | No | Set to `"desktop"` for deep link redirect |

**Response:** HTTP 302 redirect to provider's authorization URL.

**Flow:** When Hello.coop is configured, all providers route through Hello.coop using `provider_hint` (except Facebook which goes direct). This means you only need a Hello.coop client ID to support Google, Apple, and Hello.coop.

#### `GET /callback`

OAuth redirect callback — **fully automatic**, no consumer code needed. Receives the authorization code from the provider, exchanges it for tokens, upserts the user via your `UserAdapter`, signs JWTs, and redirects.

| Query param | Type | Description |
|-------------|------|-------------|
| `code` | string | Authorization code from provider |
| `state` | string | HMAC-signed state token (verified automatically) |
| `error` | string | Error from provider (if auth failed) |

**Response on success:**
- Web: HTTP 302 to `{successRedirectUrl}?access_token=...&refresh_token=...`
- Desktop (`client_type=desktop`): HTML page that redirects to `{deepLinkScheme}://auth/callback?access_token=...&refresh_token=...`

**Response on error:** Redirects with `?error=...` instead.

#### `POST /native`

Verifies a native ID token from Apple or Google SDKs (no redirect flow needed).

**Request body:**
```json
{
  "provider": "apple",
  "id_token": "eyJ...",
  "email": "user@example.com",
  "name": "Jane Doe",
  "given_name": "Jane",
  "family_name": "Doe",
  "picture": "https://...",
  "nonce": "abc123"
}
```

Only `provider` and `id_token` are required. Other fields are supplemental (Apple only provides name on first sign-in).

**Response (200):**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in": 3600
}
```

**Response (401):** `{ "error": "Token verification failed" }`

**Verification:** Apple tokens verified against `https://appleid.apple.com/auth/keys` JWKS. Google tokens verified against `https://www.googleapis.com/oauth2/v3/certs` JWKS.

#### `POST /refresh`

Issues new access + refresh tokens (rolling refresh).

**Request body:**
```json
{ "refresh_token": "eyJ..." }
```

**Response (200):**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in": 3600
}
```

**Response (401):** `{ "error": "Invalid or expired refresh token" }`

#### `GET /validate`

Validates an access token and returns the user profile.

**Request header:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Doe",
    "avatar_url": "https://..."
  }
}
```

**Response (401):** `{ "error": "Invalid or expired token" }`

#### `POST /logout`

Stateless logout acknowledgement. JWTs are stateless — the client should discard tokens.

**Response (200):** `{ "success": true }`

### JWT Details

- Algorithm: **HS256** (HMAC-SHA256) via `jose`
- Access token: default TTL **1 hour**, contains `{ sub, email, role, aud, display_name, avatar_url }`
- Refresh token: default TTL **30 days**, contains `{ sub, type: "refresh" }`
- Issuer: your configured `jwt.issuer` value
- Audience: `"authenticated"` (configurable)

### Security

- **State tokens:** HMAC-SHA256 signed with 10-minute expiration, constant-time comparison via `timingSafeEqual`
- **JWKS verification:** Apple and Google ID tokens verified against provider public keys (automatic key rotation)
- **Nonce:** Generated per login for OIDC flows (Hello.coop)
- **No token blacklist:** JWTs are fully stateless. Refresh is rolling (new refresh token on each use).

---

## User Adapter — The Only Code You Write

The `UserAdapter` interface connects kandi-login to your database. It has 5 methods:

```ts
interface UserAdapter {
  /** Find user by OAuth provider + provider's user ID */
  findByProviderId(provider: string, providerUserId: string): Promise<KandiLoginUser | null>;

  /** Find user by email (for cross-provider account linking) */
  findByEmail(email: string): Promise<KandiLoginUser | null>;

  /** Create a new user. Return the created user with an `id` field. */
  createUser(profile: OAuthProfile): Promise<KandiLoginUser>;

  /** Link an additional OAuth provider to an existing user */
  linkProvider(userId: string, provider: string, providerUserId: string): Promise<void>;

  /** Get user by ID (for token refresh and validation) */
  getUserById(id: string): Promise<KandiLoginUser | null>;
}
```

### How kandi-login uses it (3-stage upsert)

When a user authenticates, kandi-login calls your adapter in order:

1. **`findByProviderId(provider, sub)`** — Has this provider+ID been seen before?
   - If found → return existing user. Done.
2. **`findByEmail(email)`** — Does a user with this email exist (different provider)?
   - If found → call **`linkProvider(userId, provider, sub)`** to link the new provider. Done.
3. **`createUser(profile)`** — Brand new user. Insert and return.

This gives you automatic cross-provider account linking: if a user signs in with Google, then later with Apple using the same email, both are linked to one account.

### OAuthProfile (what createUser receives)

```ts
interface OAuthProfile {
  provider: string;          // "google", "apple", "facebook", "hellocoop"
  providerUserId: string;    // Provider's unique user ID (sub claim)
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  raw?: Record<string, unknown>;  // Full provider response for custom extraction
}
```

### KandiLoginUser (what your adapter must return)

```ts
interface KandiLoginUser {
  id: string;                      // Your database user ID
  email: string;
  name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  email_verified?: boolean;
  [key: string]: unknown;          // Any additional fields you want
}
```

### Example: Supabase adapter

```ts
import { createClient } from '@supabase/supabase-js';
import type { UserAdapter, OAuthProfile } from 'kandi-login/server';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export const userAdapter: UserAdapter = {
  async findByProviderId(provider, providerUserId) {
    const column = `${provider}_sub`;  // google_sub, apple_sub, etc.
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq(column, providerUserId)
      .single();
    return data;
  },

  async findByEmail(email) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    return data;
  },

  async createUser(profile: OAuthProfile) {
    const { data } = await supabase
      .from('users')
      .insert({
        email: profile.email,
        name: profile.name,
        display_name: profile.name ?? profile.email.split('@')[0],
        avatar_url: profile.avatarUrl,
        [`${profile.provider}_sub`]: profile.providerUserId,
      })
      .select()
      .single();
    return data!;
  },

  async linkProvider(userId, provider, providerUserId) {
    await supabase
      .from('users')
      .update({ [`${provider}_sub`]: providerUserId })
      .eq('id', userId);
  },

  async getUserById(id) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    return data;
  },
};
```

**Required database schema (Supabase/Postgres):**

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  display_name text,
  avatar_url text,
  email_verified boolean default false,
  google_sub text unique,
  apple_sub text unique,
  facebook_sub text unique,
  hellocoop_sub text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Example: Prisma adapter

```ts
import { PrismaClient } from '@prisma/client';
import type { UserAdapter, OAuthProfile } from 'kandi-login/server';

const prisma = new PrismaClient();

export const userAdapter: UserAdapter = {
  async findByProviderId(provider, providerUserId) {
    return prisma.user.findFirst({
      where: { providers: { some: { provider, providerUserId } } },
    });
  },

  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  },

  async createUser(profile: OAuthProfile) {
    return prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        displayName: profile.name ?? profile.email.split('@')[0],
        avatarUrl: profile.avatarUrl,
        providers: {
          create: {
            provider: profile.provider,
            providerUserId: profile.providerUserId,
          },
        },
      },
    });
  },

  async linkProvider(userId, provider, providerUserId) {
    await prisma.oAuthProvider.create({
      data: { userId, provider, providerUserId },
    });
  },

  async getUserById(id) {
    return prisma.user.findUnique({ where: { id } });
  },
};
```

**Required Prisma schema:**

```prisma
model User {
  id          String          @id @default(uuid())
  email       String          @unique
  name        String?
  displayName String?
  avatarUrl   String?
  providers   OAuthProvider[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

model OAuthProvider {
  id             String @id @default(uuid())
  provider       String
  providerUserId String
  userId         String
  user           User   @relation(fields: [userId], references: [id])

  @@unique([provider, providerUserId])
}
```

---

## Server Configuration Reference

```ts
interface AuthServerConfig {
  jwt: {
    secret: string;              // HMAC secret (min 32 chars)
    issuer: string;              // Token issuer claim (e.g., "auth.myapp.com")
    accessTokenTtl?: string;     // Default: "1h" (jose duration string)
    refreshTokenTtl?: string;    // Default: "30d"
    audience?: string;           // Default: "authenticated"
  };

  providers: {
    hellocoop?: { clientId: string; scopes?: string };
    google?: { clientId: string; clientSecret?: string; webClientId?: string };
    apple?: { clientId: string; additionalClientIds?: string[] };
    facebook?: { appId: string; appSecret: string };
  };

  userAdapter: UserAdapter;      // Your 5 database functions (see above)

  baseUrl?: string;              // Auth server URL (required for redirect flows)
  callbackPath?: string;         // Default: "/callback"
  successRedirectUrl?: string;   // Where to redirect after login (web)
  errorRedirectUrl?: string;     // Where to redirect on error
  deepLinkScheme?: string;       // For desktop apps (e.g., "myapp")
  corsOrigins?: string[];        // Default: ["*"]
  stateSecret?: string;          // Default: derives from jwt.secret

  onLogin?: (user: KandiLoginUser, provider: string) => Promise<void>;
  onUserCreated?: (user: KandiLoginUser, provider: string) => Promise<void>;
}
```

---

## Client Configuration Reference

```ts
interface KandiLoginConfig {
  authServerUrl: string;           // Your auth server URL
  apiServerUrl?: string;           // API server for profile endpoint
  providers: OAuthProviderConfig[];
  deepLinkScheme?: string;         // For Tauri/Electron
  keychainService?: string;        // For Tauri OS keychain

  // Path overrides (rarely needed)
  loginPath?: string;              // Default: "/api/mobile/login"
  refreshPath?: string;            // Default: "/api/mobile/refresh"
  profilePath?: string;            // Default: "/api/v1/users/me"
  webCallbackPath?: string;        // Default: "/auth/callback"
  logoutPath?: string;             // Default: "/api/mobile/logout"

  // Advanced
  tokenStorage?: TokenStorageAdapter;   // Override platform-based storage
  platformAdapter?: PlatformAdapter;    // Override platform detection
}

interface OAuthProviderConfig {
  id: string;        // "google", "apple", "facebook", "hellocoop", or custom
  name: string;      // Display name on buttons
  icon?: ReactNode;  // Custom icon
  enabled?: boolean; // Default: true
}
```

---

## Client Components

### MUI

```tsx
import { AuthProvider } from 'kandi-login';
import { MuiLoginChip, MuiLoginOverlay, MuiUserAvatar } from 'kandi-login/react/mui';

// Login chip with glass or flat variant
<MuiLoginChip
  variant="glass"              // "glass" | "flat" (default: "glass")
  providers={config.providers} // shows provider buttons in overlay
  menuItems={[                 // custom dropdown items when authenticated
    { icon: <SettingsIcon />, label: 'Settings', onClick: openSettings },
  ]}
  showOverlayWhenUnauthenticated={true}  // auto-show login overlay
  appName="My App"
  borderRadius={6}
/>

// Full-screen login overlay (standalone)
<MuiLoginOverlay
  open={true}
  providers={config.providers}
  appName="My App"
  onClose={() => {}}
/>

// Avatar component
<MuiUserAvatar user={user} size="medium" />  // "small" | "medium" | "large"
```

### Tailwind

```tsx
import { TailwindLoginChip, TailwindLoginOverlay } from 'kandi-login/tailwind';
import 'kandi-login/tailwind/kandi-login.css';

<TailwindLoginChip variant="glass" providers={config.providers} />
```

Override CSS variables for theming:

```css
:root {
  --kl-primary: #667eea;
  --kl-primary-hover: #5a6fd6;
  --kl-text: #1a1a2e;
  --kl-text-secondary: #6b7280;
  --kl-text-on-primary: #ffffff;
  --kl-bg: #ffffff;
  --kl-bg-elevated: #f9fafb;
  --kl-border: rgba(0, 0, 0, 0.1);
  --kl-border-hover: rgba(0, 0, 0, 0.2);
  --kl-error: #ef4444;
  --kl-error-bg: #fef2f2;
  --kl-glass-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(245, 245, 245, 0.6) 100%);
  --kl-glass-blur: blur(32px) saturate(160%);
  --kl-glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  --kl-glass-shadow-hover: 0 10px 40px 0 rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  --kl-menu-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 250, 0.9) 100%);
  --kl-menu-shadow: 0 16px 48px 0 rgba(0, 0, 0, 0.15);
  --kl-radius: 6px;
  --kl-chip-height: 32px;
  --kl-avatar-default-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Dark mode (auto or .dark class) */
.dark {
  --kl-text: #e5e7eb;
  --kl-bg: #111827;
  --kl-bg-elevated: #1f2937;
  --kl-border: rgba(255, 255, 255, 0.1);
  --kl-glass-bg: linear-gradient(135deg, rgba(45, 45, 45, 0.6) 0%, rgba(25, 25, 25, 0.4) 100%);
  --kl-glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  --kl-menu-bg: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.85) 100%);
}
```

### Headless (bring your own UI)

```tsx
import { HeadlessLoginChip } from 'kandi-login/react/headless';

<HeadlessLoginChip providers={config.providers}>
  {({
    user,              // KandiLoginUser | null
    isAuthenticated,   // boolean
    isLoading,         // boolean
    isLoggingIn,       // boolean
    error,             // string | null
    login,             // (provider?: string) => Promise<void>
    logout,            // () => Promise<void>
    menuOpen,          // boolean
    openMenu,          // (event: MouseEvent<HTMLElement>) => void
    closeMenu,         // () => void
    anchorEl,          // HTMLElement | null
    displayName,       // string
    email,             // string
  }) => (
    isAuthenticated
      ? <button onClick={logout}>Hi, {displayName}</button>
      : <button onClick={() => login('google')}>Sign In with Google</button>
  )}
</HeadlessLoginChip>
```

### Hook only

```tsx
import { useAuth } from 'kandi-login';

function MyComponent() {
  const {
    user,             // KandiLoginUser | null
    isAuthenticated,  // boolean
    isLoading,        // boolean
    error,            // string | null
    login,            // (provider?: string) => Promise<void>
    logout,           // () => Promise<void>
    refreshUser,      // () => Promise<void>
    getToken,         // () => Promise<string | null>
  } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <button onClick={() => login('google')}>Sign In</button>;
  return <div>Hello, {user?.name}</div>;
}
```

---

## Platform Support

### Web (default)

Uses popup window (500x700) for OAuth. Falls back to redirect if popups are blocked. Tokens stored in `localStorage` with `kandi_login_` prefix. Listens for `postMessage` from popup or checks URL query params after redirect.

No special setup needed.

### Tauri

kandi-login calls these Tauri commands (your Rust backend must expose them):

| Command | Signature | Purpose |
|---------|-----------|---------|
| `start_oauth` | `(provider: Option<String>) -> ()` | Opens OAuth webview |
| `get_token` | `(service: String, key: String) -> Option<String>` | Reads from OS keychain |
| `store_token` | `(service: String, key: String, value: String) -> ()` | Writes to OS keychain |
| `clear_tokens` | `(service: String) -> ()` | Clears keychain entries |

Detection: `window.__TAURI__` exists.

Generate the Rust template:
```bash
npx kandi-login
# Select "Check/Generate Tauri Rust commands"
```

Client config:
```ts
const authConfig = {
  authServerUrl: 'https://auth.myapp.com',
  providers: [{ id: 'google', name: 'Google' }],
  deepLinkScheme: 'myapp',
  keychainService: 'com.myapp.app',
};
```

### Electron

Requires `window.electronAPI.secureStorage` exposed via `contextBridge`:

```js
// preload.js
const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  secureStorage: {
    get: (key) => ipcRenderer.invoke('secure-storage:get', key),
    set: (key, value) => ipcRenderer.invoke('secure-storage:set', key, value),
    delete: (key) => ipcRenderer.invoke('secure-storage:delete', key),
  },
  openExternal: (url) => shell.openExternal(url),
});
```

Detection: `navigator.userAgent` includes `"electron"`.

OAuth callback: Dispatch a `CustomEvent` named `kandi-login-callback` with `{ detail: { access_token, refresh_token } }` from your main process deep link handler.

---

## Environment Variables

```env
# ── Required (server-side) ──
JWT_SECRET=your-min-32-char-secret-key-here

# ── Provider credentials (server-side, only those you use) ──
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
HELLO_COOP_CLIENT_ID=

# ── Client-side (optional, for CLI wizard .env generation) ──
KANDI_LOGIN_AUTH_SERVER_URL=https://auth.myapp.com
KANDI_LOGIN_API_SERVER_URL=https://api.myapp.com
KANDI_LOGIN_DEEP_LINK_SCHEME=myapp
KANDI_LOGIN_KEYCHAIN_SERVICE=com.myapp
```

---

## OAuth Provider Setup

### Google
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application type)
3. Add authorized redirect URI: `{baseUrl}/callback`
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Apple
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list/serviceId)
2. Create a Services ID with "Sign In with Apple" enabled
3. Add return URL: `{baseUrl}/callback`
4. Set `APPLE_CLIENT_ID` (Services ID or Bundle ID)

### Facebook
1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Create an app with Facebook Login product
3. Add Valid OAuth Redirect URI: `{baseUrl}/callback`
4. Set `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`

### Hello.coop
1. Go to [Hello Console](https://console.hello.coop/)
2. Create an application
3. Add redirect URI: `{baseUrl}/callback`
4. Set `HELLO_COOP_CLIENT_ID`

**Tip:** If you configure Hello.coop, you can route Google and Apple through it using `provider_hint` — no separate Google/Apple OAuth apps needed for the redirect flow. You'd still need Apple/Google client IDs for native ID token verification on mobile.

---

## CLI Wizard

```bash
# First-time interactive setup
npx kandi-login init

# Dev/debug wizard (re-runnable)
npx kandi-login
```

**`init` wizard:**
- Select platforms (Tauri/Electron/Web)
- Enter auth server URL, API server URL
- Enter deep link scheme, keychain service name
- Select OAuth providers
- Select UI framework (MUI/Tailwind/Headless)
- Opens browser to each provider's developer console
- Generates `.env.kandi-login` and `src/auth-config.ts`
- Checks Tauri Rust commands (if applicable)

**Dev wizard:**
- Tests auth server connection
- Tests OAuth flow end-to-end
- Validates `.env` configuration
- Generates/checks Tauri Rust commands
- Shows current config summary

---

## Lifecycle Hooks

```ts
const auth = createAuthServer({
  // ... jwt, providers, userAdapter, etc.

  onLogin: async (user, provider) => {
    // Called after every successful login.
    // Use for analytics, logging, or custom validation.
    // Throw an error to REJECT the login.
    console.log(`User ${user.email} logged in via ${provider}`);
  },

  onUserCreated: async (user, provider) => {
    // Called once when a brand-new user is created.
    // Use for welcome emails, team provisioning, etc.
    await sendWelcomeEmail(user.email);
  },
});
```

---

## Advanced: Utility Exports

The auth server instance also exposes utilities:

```ts
// Verify any access token and get its payload
const payload = await auth.verifyToken(someToken);
// payload: { sub, email, role, aud, display_name, avatar_url }

// Sign tokens for a user (e.g., after manual registration)
const { access_token, refresh_token } = await auth.signTokens(user);
```

Individual functions are also exported for advanced use:

```ts
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateState,
  verifyState,
  generateNonce,
  extractBearerToken,
  verifyAppleIdToken,
  verifyGoogleIdToken,
} from 'kandi-login/server';
```

---

## Full Working Examples

### Example 1: Next.js App Router + Supabase

**`app/api/auth/[...path]/route.ts`** — Server:

```ts
import { createAuthServer } from 'kandi-login/server';
import { createClient } from '@supabase/supabase-js';
import type { UserAdapter, OAuthProfile } from 'kandi-login/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const userAdapter: UserAdapter = {
  async findByProviderId(provider, providerUserId) {
    const { data } = await supabase
      .from('users').select('*')
      .eq(`${provider}_sub`, providerUserId).single();
    return data;
  },
  async findByEmail(email) {
    const { data } = await supabase
      .from('users').select('*')
      .eq('email', email).single();
    return data;
  },
  async createUser(profile: OAuthProfile) {
    const { data } = await supabase
      .from('users')
      .insert({
        email: profile.email,
        name: profile.name,
        display_name: profile.name ?? profile.email.split('@')[0],
        avatar_url: profile.avatarUrl,
        [`${profile.provider}_sub`]: profile.providerUserId,
      })
      .select().single();
    return data!;
  },
  async linkProvider(userId, provider, providerUserId) {
    await supabase.from('users')
      .update({ [`${provider}_sub`]: providerUserId })
      .eq('id', userId);
  },
  async getUserById(id) {
    const { data } = await supabase
      .from('users').select('*').eq('id', id).single();
    return data;
  },
};

const auth = createAuthServer({
  jwt: { secret: process.env.JWT_SECRET!, issuer: 'auth.myapp.com' },
  providers: {
    google: { clientId: process.env.GOOGLE_CLIENT_ID! },
    hellocoop: { clientId: process.env.HELLO_CLIENT_ID! },
  },
  userAdapter,
  baseUrl: process.env.NEXT_PUBLIC_URL + '/api/auth',
  successRedirectUrl: process.env.NEXT_PUBLIC_URL + '/dashboard',
});

// Adapt Next.js Request to kandi-login's AuthRequest
function adaptRequest(req: Request) {
  const url = new URL(req.url);
  return {
    method: req.method,
    url: req.url,
    query: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries(req.headers),
  };
}

function createResponseAdapter() {
  let result: Response;
  const res = {
    status: (code: number) => { (res as any)._status = code; return res; },
    json: (data: unknown) => {
      result = Response.json(data, { status: (res as any)._status ?? 200 });
    },
    redirect: (url: string) => { result = Response.redirect(url, 302); },
    send: (body: string) => {
      result = new Response(body, {
        status: (res as any)._status ?? 200,
        headers: { 'Content-Type': 'text/html' },
      });
    },
    setHeader: (_name: string, _value: string) => res,
  };
  return { res, getResult: () => result! };
}

// Route dispatch
const handlers: Record<string, Record<string, typeof auth.handleLogin>> = {
  GET: { login: auth.handleLogin, callback: auth.handleCallback, validate: auth.handleValidate },
  POST: { native: auth.handleNativeLogin, refresh: auth.handleRefresh, logout: auth.handleLogout },
};

async function handle(req: Request) {
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const action = segments[segments.length - 1];
  const handler = handlers[req.method]?.[action];
  if (!handler) return Response.json({ error: 'Not found' }, { status: 404 });

  const adapted = adaptRequest(req);
  if (req.method === 'POST') {
    try { (adapted as any).body = await req.json(); } catch { (adapted as any).body = {}; }
  }
  const { res, getResult } = createResponseAdapter();
  await handler(adapted as any, res as any);
  return getResult();
}

export { handle as GET, handle as POST };
```

**`app/layout.tsx`** — Client:

```tsx
'use client';
import { AuthProvider } from 'kandi-login';

const authConfig = {
  authServerUrl: process.env.NEXT_PUBLIC_URL + '/api/auth',
  providers: [
    { id: 'google', name: 'Google' },
    { id: 'hellocoop', name: 'Hello.coop' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html><body>
      <AuthProvider config={authConfig}>
        {children}
      </AuthProvider>
    </body></html>
  );
}
```

**`app/page.tsx`** — Using the login chip:

```tsx
'use client';
import { MuiLoginChip } from 'kandi-login/react/mui';

export default function Home() {
  return (
    <header>
      <MuiLoginChip variant="glass" />
    </header>
  );
}
```

### Example 2: Express + Prisma

**`server.ts`:**

```ts
import express from 'express';
import cors from 'cors';
import { createAuthServer } from 'kandi-login/server';
import { userAdapter } from './user-adapter';  // Prisma adapter from above

const app = express();
app.use(cors());
app.use(express.json());

const auth = createAuthServer({
  jwt: { secret: process.env.JWT_SECRET!, issuer: 'auth.myapp.com' },
  providers: {
    google: { clientId: process.env.GOOGLE_CLIENT_ID! },
    apple: { clientId: process.env.APPLE_CLIENT_ID! },
    facebook: { appId: process.env.FB_APP_ID!, appSecret: process.env.FB_APP_SECRET! },
  },
  userAdapter,
  baseUrl: 'https://auth.myapp.com',
  successRedirectUrl: 'https://myapp.com/dashboard',
});

app.get('/auth/login',    auth.handleLogin);
app.get('/auth/callback', auth.handleCallback);
app.post('/auth/native',  auth.handleNativeLogin);
app.post('/auth/refresh', auth.handleRefresh);
app.get('/auth/validate', auth.handleValidate);
app.post('/auth/logout',  auth.handleLogout);

app.listen(3001);
```

### Example 3: Tauri desktop

Client config with deep link + keychain:

```tsx
import { AuthProvider } from 'kandi-login';
import { MuiLoginChip } from 'kandi-login/react/mui';

const authConfig = {
  authServerUrl: 'https://auth.myapp.com',
  providers: [
    { id: 'google', name: 'Google' },
    { id: 'apple', name: 'Apple' },
  ],
  deepLinkScheme: 'myapp',
  keychainService: 'com.myapp.app',
};

function App() {
  return (
    <AuthProvider config={authConfig}>
      <MuiLoginChip variant="glass" />
    </AuthProvider>
  );
}
```

Tauri login flow:
1. `MuiLoginChip` calls `login('google')`
2. Client `AuthService` calls Tauri's `start_oauth` command
3. Rust opens a webview to `{authServerUrl}/auth/login?provider=google&client_type=desktop&return_url=myapp://auth/callback`
4. User authenticates, server redirects to `myapp://auth/callback?access_token=...&refresh_token=...`
5. Tauri intercepts the deep link, fires `oauth-callback` event
6. Client `AuthService` receives tokens, stores in OS keychain via `store_token`

---

## AI Agent Integration Spec

The following XML block is a complete specification for generating a kandi-login integration. An AI coding agent can use this as a prompt template — fill in the placeholder values and generate all files.

```xml
<kandi-login-integration>
  <project>
    <name><!-- your app name --></name>
    <framework><!-- "nextjs" | "express" | "fastify" --></framework>
    <database><!-- "supabase" | "prisma" | "drizzle" | "mongo" --></database>
    <ui><!-- "mui" | "tailwind" | "headless" --></ui>
    <platform><!-- "web" | "tauri" | "electron" --></platform>
  </project>

  <providers>
    <!-- Include only providers you need. Remove unused ones. -->
    <google client-id="GOOGLE_CLIENT_ID" />
    <apple client-id="APPLE_CLIENT_ID" />
    <facebook app-id="FB_APP_ID" app-secret="FB_APP_SECRET" />
    <hellocoop client-id="HELLO_CLIENT_ID" />
  </providers>

  <server>
    <description>
      Create an auth server using kandi-login/server's createAuthServer().
      Mount 6 handlers: handleLogin (GET), handleCallback (GET),
      handleNativeLogin (POST), handleRefresh (POST),
      handleValidate (GET), handleLogout (POST).
    </description>
    <config>
      <jwt secret="JWT_SECRET" issuer="auth.YOURDOMAIN.com"
           access-ttl="1h" refresh-ttl="30d" />
      <base-url>https://auth.YOURDOMAIN.com</base-url>
      <success-redirect>https://YOURDOMAIN.com/dashboard</success-redirect>
      <deep-link-scheme><!-- omit for web-only --></deep-link-scheme>
    </config>
  </server>

  <user-adapter>
    <description>
      Implement the UserAdapter interface with 5 methods that query your database.
      kandi-login calls them in this order during login:
      1. findByProviderId(provider, providerUserId) → existing user or null
      2. findByEmail(email) → existing user or null (for account linking)
      3. createUser(profile: OAuthProfile) → new user with id field
      Also: linkProvider(userId, provider, providerUserId) → void
      Also: getUserById(id) → user or null (for token refresh/validate)
    </description>
    <oauth-profile-shape>
      { provider: string, providerUserId: string, email: string,
        name?: string, avatarUrl?: string, emailVerified?: boolean,
        raw?: Record }
    </oauth-profile-shape>
    <user-shape>
      { id: string, email: string, name?: string, display_name?: string,
        avatar_url?: string, email_verified?: boolean, [key: string]: unknown }
    </user-shape>
  </user-adapter>

  <database-schema>
    <description>
      Create a users table with columns for each OAuth provider's subject ID.
      Account linking works by matching on email across providers.
    </description>
    <table name="users">
      <column name="id" type="uuid" primary-key="true" />
      <column name="email" type="text" unique="true" not-null="true" />
      <column name="name" type="text" />
      <column name="display_name" type="text" />
      <column name="avatar_url" type="text" />
      <column name="email_verified" type="boolean" default="false" />
      <column name="google_sub" type="text" unique="true" />
      <column name="apple_sub" type="text" unique="true" />
      <column name="facebook_sub" type="text" unique="true" />
      <column name="hellocoop_sub" type="text" unique="true" />
      <column name="created_at" type="timestamptz" default="now()" />
      <column name="updated_at" type="timestamptz" default="now()" />
    </table>
  </database-schema>

  <client>
    <description>
      Wrap your React app with AuthProvider from kandi-login.
      Use MuiLoginChip, TailwindLoginChip, HeadlessLoginChip, or useAuth hook.
    </description>
    <auth-provider>
      <config>
        authServerUrl: "https://auth.YOURDOMAIN.com"
        providers: [{ id: "google", name: "Google" }, ...]
        deepLinkScheme: "myapp"         (Tauri/Electron only)
        keychainService: "com.myapp"    (Tauri only)
      </config>
    </auth-provider>
    <components>
      <mui import="kandi-login/react/mui" requires="@mui/material @emotion/react @emotion/styled">
        MuiLoginChip: variant="glass"|"flat", providers, menuItems, showOverlayWhenUnauthenticated
        MuiLoginOverlay: open, providers, appName, onClose
        MuiUserAvatar: user, size="small"|"medium"|"large"
      </mui>
      <tailwind import="kandi-login/tailwind" css="kandi-login/tailwind/kandi-login.css">
        TailwindLoginChip: variant, providers, menuItems, className
        TailwindLoginOverlay: open, providers, appName, onClose
      </tailwind>
      <headless import="kandi-login/react/headless">
        HeadlessLoginChip: children render prop receives { user, isAuthenticated,
          isLoading, isLoggingIn, error, login, logout, menuOpen, openMenu,
          closeMenu, anchorEl, displayName, email }
      </headless>
      <hook import="kandi-login">
        useAuth(): { user, isAuthenticated, isLoading, error, login, logout,
          refreshUser, getToken }
      </hook>
    </components>
  </client>

  <env>
    JWT_SECRET=generate-a-random-32-char-secret
    GOOGLE_CLIENT_ID=from-google-cloud-console
    GOOGLE_CLIENT_SECRET=from-google-cloud-console
    APPLE_CLIENT_ID=your-bundle-id-or-services-id
    FACEBOOK_APP_ID=from-facebook-developers
    FACEBOOK_APP_SECRET=from-facebook-developers
    HELLO_COOP_CLIENT_ID=from-hello-console
  </env>

  <tests>
    <test-personas enabled="development-only">
      <persona id="admin-alex" name="Alex Admin" role="admin" email="alex@test.kandi.dev" />
      <persona id="designer-dana" name="Dana Designer" role="user" email="dana@test.kandi.dev" />
      <persona id="viewer-val" name="Val Viewer" role="viewer" email="val@test.kandi.dev" />
      <persona id="new-user-naya" name="Naya Newbie" role="user" email="naya@test.kandi.dev" />
      <endpoints>
        POST /test/seed — creates personas in DB via UserAdapter
        GET /test/personas — lists available personas
        POST /test/login-as { personaId } — signs real JWTs for persona
      </endpoints>
      <token-encryption>AES-256-GCM, same pattern as production</token-encryption>
    </test-personas>

    <server-tests>
      <test name="login-redirect">
        GET /auth/login?provider=google → expect 302 redirect to Hello.coop/authorize
      </test>
      <test name="callback-invalid-state">
        GET /auth/callback?code=x&state=invalid → expect redirect with ?error=
      </test>
      <test name="native-google-verify">
        POST /auth/native { provider: "google", id_token: "valid-token" }
        → expect 200 with { access_token, refresh_token, expires_in }
      </test>
      <test name="native-missing-token">
        POST /auth/native { provider: "google" }
        → expect 400 { error: "Missing provider or id_token" }
      </test>
      <test name="refresh-valid">
        POST /auth/refresh { refresh_token: "valid" }
        → expect 200 with new { access_token, refresh_token }
      </test>
      <test name="refresh-expired">
        POST /auth/refresh { refresh_token: "expired" }
        → expect 401 { error: "Invalid or expired refresh token" }
      </test>
      <test name="validate-valid">
        GET /auth/validate with Bearer valid-token
        → expect 200 { valid: true, user: { id, email, ... } }
      </test>
      <test name="validate-no-token">
        GET /auth/validate without Authorization header
        → expect 401 { error: "Missing or invalid Authorization header" }
      </test>
      <test name="logout">
        POST /auth/logout → expect 200 { success: true }
      </test>
    </server-tests>
    <adapter-tests>
      <test name="create-and-find">
        createUser(profile) → returns user with id
        findByProviderId(provider, sub) → returns same user
      </test>
      <test name="account-linking">
        createUser({ provider: "google", email: "a@b.com" })
        findByEmail("a@b.com") → returns user
        linkProvider(user.id, "apple", "apple-sub")
        findByProviderId("apple", "apple-sub") → returns same user
      </test>
    </adapter-tests>
    <persona-tests>
      <test name="seed-personas">
        POST /test/seed → expect 200 { success: true, seeded: [...], total: 4 }
      </test>
      <test name="list-personas">
        GET /test/personas → expect 200 { personas: [{ id, name, email, role }...] }
      </test>
      <test name="login-as-valid">
        POST /test/login-as { personaId: "admin-alex" }
        → expect 200 { access_token, refresh_token, expires_in, persona: { role: "admin" } }
      </test>
      <test name="login-as-unknown">
        POST /test/login-as { personaId: "nobody" }
        → expect 404 { error: "Unknown persona", available: [...] }
      </test>
      <test name="login-as-token-validates">
        Login as admin-alex, then GET /auth/validate with Bearer token
        → expect 200 { valid: true, user: { email: "alex@test.kandi.dev" } }
      </test>
    </persona-tests>
    <client-tests>
      <test name="auth-provider-renders">
        Render AuthProvider with config → children render without error
      </test>
      <test name="useAuth-unauthenticated">
        useAuth() → { isAuthenticated: false, user: null, isLoading: false }
      </test>
      <test name="login-chip-renders">
        Render MuiLoginChip → shows login button when unauthenticated
      </test>
    </client-tests>
  </tests>

  <verification>
    <step>npm run build → zero errors and warnings</step>
    <step>npx tsc --noEmit → zero type errors</step>
    <step>npm test → all tests pass</step>
    <step>Start server, open browser, click "Sign in with Google"</step>
    <step>Verify redirect to provider, callback, JWT issued, user created in DB</step>
    <step>Verify token refresh works (POST /auth/refresh)</step>
    <step>Verify validate returns user (GET /auth/validate with Bearer token)</step>
  </verification>
</kandi-login-integration>
```

---

## Test Personas

kandi-login includes a test persona system for development and integration testing. Test personas are real users created via your `UserAdapter` with encrypted mock OAuth tokens stored using **AES-256-GCM** — the same encryption pattern used by KandiForge's production API servers.

### Enable

```ts
const auth = createAuthServer({
  // ... jwt, providers, userAdapter
  enableTestPersonas: true,  // MUST be explicit. Never enable in production.
});
```

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/test/seed` | Create test personas in DB + generate encrypted tokens |
| GET | `/test/personas` | List available personas (no secrets) |
| POST | `/test/login-as` `{ personaId }` | Sign real JWTs for a persona |

These endpoints **only exist** when `enableTestPersonas: true`. They are not mounted otherwise.

### Built-in Personas

| ID | Name | Role | Email |
|----|------|------|-------|
| `admin-alex` | Alex Admin | admin | alex@test.kandi.dev |
| `designer-dana` | Dana Designer | user | dana@test.kandi.dev |
| `viewer-val` | Val Viewer | viewer | val@test.kandi.dev |
| `new-user-naya` | Naya Newbie | user | naya@test.kandi.dev |

### Usage

```bash
# Seed personas into DB
curl -X POST http://localhost:3001/test/seed

# List personas
curl http://localhost:3001/test/personas

# Login as admin — returns real JWTs
curl -X POST http://localhost:3001/test/login-as \
  -H "Content-Type: application/json" \
  -d '{"personaId": "admin-alex"}'
# → { "access_token": "eyJ...", "refresh_token": "eyJ...", "expires_in": 3600, "persona": {...} }
```

The returned `access_token` is a real JWT — identical to what OAuth login produces. Use it with `/auth/validate`, `/auth/refresh`, or any endpoint that accepts Bearer tokens.

### Custom Personas

```ts
const auth = createAuthServer({
  enableTestPersonas: true,
  testPersonas: [
    { id: 'qa-lead', name: 'QA Lead', email: 'qa@mycompany.com', role: 'admin' },
    { id: 'free-tier', name: 'Free User', email: 'free@mycompany.com', role: 'free' },
  ],
});
```

### How Tokens Are Stored

Test persona tokens are encrypted at rest using AES-256-GCM:
- **Key**: SHA-256 hash of `testTokenEncryptionSecret` (defaults to `jwt.secret`)
- **IV**: 16 random bytes per encryption
- **Auth tag**: 16 bytes for integrity verification
- **Format**: `base64(iv + authTag + ciphertext)`

Even in development, tokens are never stored in plaintext.

### Integration Test Example

```ts
describe('Auth', () => {
  beforeAll(async () => {
    await fetch('http://localhost:3001/test/seed', { method: 'POST' });
  });

  it('admin can access protected resource', async () => {
    const login = await fetch('http://localhost:3001/test/login-as', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId: 'admin-alex' }),
    });
    const { access_token } = await login.json();

    const res = await fetch('http://localhost:3001/auth/validate', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.user.email).toBe('alex@test.kandi.dev');
  });
});
```

---

## Documentation

Detailed architecture diagrams, flow charts, and additional implementation examples are in the [`docs/`](./docs/) folder:

- **[Architecture](./docs/architecture.md)** — System overview, module dependency graph, OAuth flow diagrams, JWT structure, encryption details, platform detection
- **[Examples](./docs/examples.md)** — Complete working implementations for Next.js + Supabase, Express + Prisma, Tauri desktop, and test persona integration tests

---

## License

MIT - KandiForge
