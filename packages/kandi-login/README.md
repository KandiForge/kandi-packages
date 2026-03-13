# kandi-login

Multi-platform OAuth authentication framework. 5 client SDKs connect to 1 Node.js server SDK.

Supports **Web (React)**, **Electron**, **Tauri**, **iOS (Swift)**, and **Android (Kotlin/Compose)**.
Works with **MUI**, **Tailwind**, or **headless** rendering.
Supports **Apple**, **Google**, **Facebook**, and **Hello.coop** OAuth providers.

```
npm install kandi-login
```

---

## Architecture

```
┌─────────────────────────────────────┐
│           CLIENT SDKs               │
│                                     │
│  Web (React)     → Next.js, Vite   │
│  Electron        → Desktop          │
│  Tauri           → Desktop (Rust)   │
│  iOS (Swift)     → iPhone, iPad     │
│  Android         → Kotlin/Compose   │
└──────────────┬──────────────────────┘
               │  HTTPS
┌──────────────▼──────────────────────┐
│        NODE.JS SERVER SDK           │
│  kandi-login/server                 │
│  createAuthServer()                 │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         YOUR DATABASE               │
└─────────────────────────────────────┘
```

The server SDK is framework-agnostic — it works with Next.js API routes, Express, Fastify, or any Node.js HTTP framework. The client SDK auto-detects the platform (Tauri, Electron, or Web) and uses the appropriate OAuth flow and token storage for each.

---

## Integration Guide

This guide walks through a complete integration into a monorepo project with a Next.js frontend and API server. Adapt the framework-specific parts for Express, Fastify, Vite, etc.

### Step 1: Install

```bash
npm install kandi-login
```

Peer dependencies (install only what you use):

```bash
# React (required for all client components)
npm install react react-dom

# MUI components (optional)
npm install @mui/material @emotion/react @emotion/styled

# Tauri (optional)
npm install @tauri-apps/api
```

### Step 2: Server — Implement the UserAdapter

The server SDK needs 5 database functions. This is the only code you write on the server side — everything else is handled by `createAuthServer`.

```typescript
// lib/user-adapter.ts
import type { UserAdapter, OAuthProfile } from 'kandi-login/server';

// Replace with your actual database client (Prisma, Drizzle, Supabase, etc.)
import { db } from './db';

export const userAdapter: UserAdapter = {
  // Called first: check if this provider+ID combo already exists
  async findByProviderId(provider, providerUserId) {
    return await db.user.findFirst({
      where: { [`${provider}_sub`]: providerUserId }
    });
  },

  // Called second: cross-provider account linking by email
  async findByEmail(email) {
    return await db.user.findFirst({ where: { email } });
  },

  // Called third: create new user if neither lookup found a match
  async createUser(profile: OAuthProfile) {
    return await db.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        avatar_url: profile.avatarUrl,
        [`${profile.provider}_sub`]: profile.providerUserId,
      }
    });
  },

  // Called when an existing user (found by email) logs in with a new provider
  async linkProvider(userId, provider, providerUserId) {
    await db.user.update({
      where: { id: userId },
      data: { [`${provider}_sub`]: providerUserId }
    });
  },

  // Called during token refresh and validation to get fresh user data
  async getUserById(id) {
    return await db.user.findUnique({ where: { id } });
  },
};
```

The user object you return must have at least `id` and `email`. Additional fields like `name`, `display_name`, `avatar_url`, and `role` are included in the JWT access token if present.

### Step 3: Server — Create the Auth Server

```typescript
// lib/auth-server.ts
import { createAuthServer } from 'kandi-login/server';
import { userAdapter } from './user-adapter';

export const auth = createAuthServer({
  // JWT configuration (required)
  jwt: {
    secret: process.env.JWT_SECRET!,       // min 32 chars, used for HS256
    issuer: 'auth.yourapp.com',            // iss claim
    accessTokenTtl: '1h',                  // default: 1h
    refreshTokenTtl: '30d',                // default: 30d
  },

  // OAuth providers — configure only the ones you use
  providers: {
    // Hello.coop acts as an OIDC gateway to Google, Apple, etc.
    // One client ID covers all upstream providers via provider_hint
    hellocoop: {
      clientId: process.env.HELLO_CLIENT_ID!,
    },

    // Direct Google integration (for native mobile ID token flow)
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
    },

    // Apple (native ID token flow only, no server redirect)
    apple: {
      clientId: process.env.APPLE_CLIENT_ID!, // iOS Bundle ID or Services ID
      additionalClientIds: ['com.yourapp.web'], // optional: web Services ID
    },

    // Facebook requires a server redirect flow with app secret
    facebook: {
      appId: process.env.FACEBOOK_APP_ID!,
      appSecret: process.env.FACEBOOK_APP_SECRET!,
    },
  },

  // Your database adapter (required)
  userAdapter,

  // Your server's public URL (required for redirect flows)
  baseUrl: process.env.BASE_URL!,

  // Where to redirect after successful web login
  successRedirectUrl: process.env.SUCCESS_REDIRECT_URL!,

  // Lifecycle hooks (optional)
  onLogin: async (user, provider) => {
    // Called before token issuance. Throw to reject login.
    console.log(`${user.email} logged in via ${provider}`);
  },
  onUserCreated: async (user, provider) => {
    // Called after a new user is created
    console.log(`New user: ${user.email}`);
  },

  // Test personas (development only — see Testing section)
  enableTestPersonas: process.env.NODE_ENV !== 'production',
});
```

### Step 4: Server — Mount the Route Handler

**Next.js App Router:**

```typescript
// app/api/auth/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import type { AuthRequest, AuthResponse } from 'kandi-login/server';

const routes: Record<string, { handler: typeof auth.handleLogin; methods: string[] }> = {
  login:    { handler: auth.handleLogin,    methods: ['GET'] },
  callback: { handler: auth.handleCallback, methods: ['GET'] },
  native:   { handler: auth.handleNativeLogin, methods: ['POST'] },
  refresh:  { handler: auth.handleRefresh,  methods: ['POST'] },
  validate: { handler: auth.handleValidate, methods: ['GET'] },
  logout:   { handler: auth.handleLogout,   methods: ['POST'] },
  // Test endpoints (only available when enableTestPersonas is true)
  ...(auth.handleSeedPersonas ? { 'test/seed': { handler: auth.handleSeedPersonas, methods: ['POST'] } } : {}),
  ...(auth.handleListPersonas ? { 'test/personas': { handler: auth.handleListPersonas, methods: ['GET'] } } : {}),
  ...(auth.handleLoginAs ? { 'test/login-as': { handler: auth.handleLoginAs, methods: ['POST'] } } : {}),
};

async function handle(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const route = routes[path.join('/')];
  if (!route) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!route.methods.includes(request.method)) return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });

  const url = new URL(request.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { query[k] = v; });
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k] = v; });

  let body: unknown;
  if (request.method === 'POST') {
    try { body = await request.json(); } catch { body = {}; }
  }

  const authReq: AuthRequest = { method: request.method, url: request.url, query, headers, body };
  let statusCode = 200;
  let responseBody: unknown = null;
  let redirectUrl: string | null = null;
  const resHeaders: Record<string, string> = {};

  const authRes: AuthResponse = {
    status(code) { statusCode = code; return authRes; },
    json(data) { responseBody = data; },
    redirect(url) { redirectUrl = url; statusCode = 302; },
    send(data) { responseBody = data; },
    setHeader(name, value) { resHeaders[name] = value; return authRes; },
  };

  await route.handler(authReq, authRes);

  let response: NextResponse;
  if (redirectUrl) response = NextResponse.redirect(redirectUrl, statusCode as 301 | 302 | 303 | 307 | 308);
  else if (typeof responseBody === 'string') response = new NextResponse(responseBody, { status: statusCode });
  else response = NextResponse.json(responseBody ?? {}, { status: statusCode });

  for (const [k, v] of Object.entries(resHeaders)) response.headers.set(k, v);
  return response;
}

export const GET = handle;
export const POST = handle;
export async function OPTIONS() { return new NextResponse(null, { status: 204 }); }
```

**Express:**

```typescript
// routes/auth.ts
import { Router } from 'express';
import { auth } from '../lib/auth-server';
import type { AuthRequest, AuthResponse } from 'kandi-login/server';

const router = Router();

function adapt(handler: typeof auth.handleLogin) {
  return async (req: any, res: any) => {
    const authReq: AuthRequest = {
      method: req.method,
      url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      query: req.query,
      headers: req.headers,
      body: req.body,
    };
    const authRes: AuthResponse = {
      status(code) { res.status(code); return authRes; },
      json(data) { res.json(data); },
      redirect(url) { res.redirect(url); },
      send(data) { res.send(data); },
      setHeader(name, value) { res.setHeader(name, value); return authRes; },
    };
    await handler(authReq, authRes);
  };
}

router.get('/login', adapt(auth.handleLogin));
router.get('/callback', adapt(auth.handleCallback));
router.post('/native', adapt(auth.handleNativeLogin));
router.post('/refresh', adapt(auth.handleRefresh));
router.get('/validate', adapt(auth.handleValidate));
router.post('/logout', adapt(auth.handleLogout));

export default router;
// Mount: app.use('/api/auth', authRouter);
```

### Step 5: Server — Protect Your API Routes

Use `auth.verifyToken()` in middleware to protect routes:

```typescript
// middleware/requireAuth.ts
import { auth } from '../lib/auth-server';

export async function requireAuth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const payload = await auth.verifyToken(token);
    req.user = payload; // { sub, email, role, display_name, avatar_url }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Step 6: Client — Configure and Wrap Your App

Define the config **outside** your component (or use `useMemo`) so the reference is stable:

```typescript
// lib/auth-config.ts
import type { KandiLoginConfig } from 'kandi-login';

export const authConfig: KandiLoginConfig = {
  // Required: your auth server URL
  authServerUrl: process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3000',

  // Optional: separate API server for user profile endpoint
  // Defaults to authServerUrl if not set
  apiServerUrl: process.env.NEXT_PUBLIC_API_URL,

  // OAuth providers to show in the UI
  providers: [
    { id: 'google', name: 'Google' },
    { id: 'apple', name: 'Apple' },
    { id: 'facebook', name: 'Facebook' },
  ],

  // Desktop apps only: custom URL scheme for deep link callbacks
  // deepLinkScheme: 'myapp',

  // All paths are configurable (these are the defaults):
  // loginPath: '/api/auth/login',
  // refreshPath: '/api/auth/refresh',
  // profilePath: '/api/v1/users/me',
  // logoutPath: '/api/auth/logout',
  // webCallbackPath: '/auth/callback',
};
```

Wrap your app with `AuthProvider`:

```tsx
// app/providers.tsx (or app/layout.tsx)
'use client';
import { AuthProvider } from 'kandi-login/react';
import { authConfig } from '@/lib/auth-config';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider
      config={authConfig}
      onLogin={(user) => console.log('Logged in:', user.email)}
      onLogout={() => console.log('Logged out')}
      onError={(err) => console.error('Auth error:', err)}
    >
      {children}
    </AuthProvider>
  );
}
```

### Step 7: Client — Add Login UI

Choose one of three rendering options:

**Option A: MUI Components**

```tsx
import { MuiLoginChip } from 'kandi-login/react/mui';
import { authConfig } from '@/lib/auth-config';

function Header() {
  return (
    <nav>
      <MuiLoginChip
        variant="glass"                           // 'glass' | 'flat'
        providers={authConfig.providers}
        showOverlayWhenUnauthenticated={true}      // auto-show login overlay
        appName="My App"
        menuItems={[
          { label: 'Profile', onClick: () => router.push('/profile') },
          { label: 'Settings', onClick: () => router.push('/settings'), position: 'bottom' },
        ]}
      />
    </nav>
  );
}
```

**Option B: Tailwind Components**

```tsx
import { TailwindLoginChip } from 'kandi-login/tailwind';
import 'kandi-login/tailwind/kandi-login.css'; // CSS custom properties for theming
import { authConfig } from '@/lib/auth-config';

function Header() {
  return (
    <nav>
      <TailwindLoginChip
        variant="glass"
        providers={authConfig.providers}
        showOverlayWhenUnauthenticated={true}
        appName="My App"
      />
    </nav>
  );
}
```

Override the theme via CSS custom properties:

```css
:root {
  --kl-primary: #667eea;
  --kl-text: #1a1a2e;
  --kl-bg: #ffffff;
  --kl-border: rgba(0,0,0,0.1);
  --kl-error: #ef4444;
  --kl-radius: 6px;
}
```

**Option C: Headless (Bring Your Own UI)**

```tsx
import { HeadlessLoginChip } from 'kandi-login/react/headless';

function Header() {
  return (
    <HeadlessLoginChip>
      {({ user, isAuthenticated, login, logout, isLoading, menuOpen, openMenu, closeMenu }) => (
        isAuthenticated ? (
          <div>
            <button onClick={openMenu}>{user?.name}</button>
            {menuOpen && (
              <div>
                <button onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => login('google')} disabled={isLoading}>
            Sign In
          </button>
        )
      )}
    </HeadlessLoginChip>
  );
}
```

**Option D: Direct Hook (Full Control)**

```tsx
import { useAuth } from 'kandi-login/react';

function MyComponent() {
  const { user, isAuthenticated, isLoading, login, logout, getToken } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <button onClick={() => login('google')}>Sign In with Google</button>;
  }

  return (
    <div>
      <p>Welcome, {user?.name}</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

### Step 8: Client — Make Authenticated API Calls

The `AuthService` (accessible via context) provides `authenticatedFetch` which automatically attaches the Bearer token and retries once on 401 after refreshing:

```tsx
import { useAuth } from 'kandi-login/react';

function Dashboard() {
  const { getToken } = useAuth();

  async function fetchData() {
    const token = await getToken();
    const res = await fetch('/api/data', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  }

  // ...
}
```

---

## Server API Reference

### Route Handlers

`createAuthServer()` returns an object with these handlers. Mount them at your preferred paths.

| Handler | Method | Path (suggested) | Description |
|---|---|---|---|
| `handleLogin` | GET | `/api/auth/login` | Initiates OAuth flow. Query: `provider`, `return_url`, `client_type` |
| `handleCallback` | GET | `/api/auth/callback` | Receives OAuth redirect. Exchanges code, upserts user, issues tokens |
| `handleNativeLogin` | POST | `/api/auth/native` | Native mobile ID token flow. Body: `{ provider, id_token }` |
| `handleRefresh` | POST | `/api/auth/refresh` | Rolling token refresh. Body: `{ refresh_token }` |
| `handleValidate` | GET | `/api/auth/validate` | Validates access token. Header: `Authorization: Bearer <token>` |
| `handleLogout` | POST | `/api/auth/logout` | Acknowledges logout (stateless — tokens are not blacklisted) |

### Utility Methods

| Method | Signature | Description |
|---|---|---|
| `verifyToken` | `(token: string) => Promise<AccessTokenPayload>` | Verify any access token for middleware use |
| `signTokens` | `(user: KandiLoginUser) => Promise<{ access_token, refresh_token }>` | Sign tokens for custom flows |

### UserAdapter Interface

You implement all 5 methods. The server SDK calls them in this order during login:

```
1. findByProviderId(provider, providerUserId) → user or null
2. findByEmail(email)                         → user or null (triggers linkProvider if found)
3. createUser(profile)                        → new user
```

| Method | Called When |
|---|---|
| `findByProviderId(provider, id)` | Every login — primary lookup |
| `findByEmail(email)` | When findByProviderId returns null — cross-provider linking |
| `createUser(profile)` | When both lookups return null — new user |
| `linkProvider(userId, provider, id)` | When findByEmail matched — links new provider to existing user |
| `getUserById(id)` | Token refresh and validation — fetches fresh user data |

### JWT Access Token Payload

```typescript
{
  sub: string;           // user ID
  email: string;
  role: string;          // from your user record
  display_name: string;
  avatar_url: string;
  aud: string;           // default: 'authenticated'
  iss: string;           // your configured issuer
  iat: number;
  exp: number;
}
```

---

## Client API Reference

### `useAuth()` Hook

```typescript
const {
  user,            // KandiLoginUser | null
  isAuthenticated, // boolean
  isLoading,       // true during initial session restore
  error,           // string | null
  login,           // (provider?: string) => Promise<void>
  logout,          // () => Promise<void>
  refreshUser,     // () => Promise<void> — force-refresh from API
  getToken,        // () => Promise<string | null>
} = useAuth();
```

### `useLoginOverlay()` Hook

For building custom overlay UIs:

```typescript
const {
  showOverlay,  // true when not authenticated
  isLoggingIn,  // true during active login attempt
  error,        // string | null
  handleLogin,  // (provider?: string) => Promise<void>
  clearError,   // () => void
} = useLoginOverlay();
```

### `KandiLoginConfig`

| Field | Type | Required | Default |
|---|---|---|---|
| `authServerUrl` | `string` | Yes | — |
| `apiServerUrl` | `string` | No | `authServerUrl` |
| `providers` | `OAuthProviderConfig[]` | Yes | — |
| `deepLinkScheme` | `string` | No | — |
| `keychainService` | `string` | No | `'kandi-login'` |
| `tokenStorage` | `TokenStorageAdapter` | No | auto-detected |
| `platformAdapter` | `PlatformAdapter` | No | auto-detected |
| `loginPath` | `string` | No | `'/api/mobile/login'` |
| `refreshPath` | `string` | No | `'/api/mobile/refresh'` |
| `profilePath` | `string` | No | `'/api/v1/users/me'` |
| `webCallbackPath` | `string` | No | `'/auth/callback'` |
| `logoutPath` | `string` | No | `'/api/mobile/logout'` |

### Platform Behavior

| Platform | Detection | OAuth Flow | Token Storage |
|---|---|---|---|
| **Web** | Default | Popup window (fallback: redirect) | localStorage |
| **Tauri** | `window.__TAURI__` | In-app WebviewWindow + deep link | OS Keychain (via Rust) |
| **Electron** | userAgent check | System browser + deep link | safeStorage (encrypted) |
| **iOS** | Native SDK | ASWebAuthenticationSession | iOS Keychain |
| **Android** | Native SDK | Chrome Custom Tabs + intent filter | EncryptedSharedPreferences |

---

## Electron Setup

```typescript
// main.ts
import { app, BrowserWindow, shell, ipcMain, safeStorage } from 'electron';

const PROTOCOL = 'myapp';
app.setAsDefaultProtocolClient(PROTOCOL);

// Single instance lock (required for deep links on Windows/Linux)
if (!app.requestSingleInstanceLock()) { app.quit(); }

// Handle deep link callback
function handleDeepLink(url: string) {
  const parsed = new URL(url);
  const accessToken = parsed.searchParams.get('access_token');
  const refreshToken = parsed.searchParams.get('refresh_token');
  const error = parsed.searchParams.get('error');

  if (error) mainWindow?.webContents.send('oauth-error', { error });
  else mainWindow?.webContents.send('oauth-callback', { access_token: accessToken, refresh_token: refreshToken });
}

app.on('open-url', (_, url) => handleDeepLink(url));               // macOS
app.on('second-instance', (_, argv) => {                            // Windows/Linux
  const url = argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
  if (url) handleDeepLink(url);
});

// Expose APIs to renderer via preload
ipcMain.handle('open-external', (_, url) => shell.openExternal(url));
```

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  onOAuthCallback: (cb: (data: any) => void) => {
    ipcRenderer.on('oauth-callback', (_, data) => cb(data));
  },
  onOAuthError: (cb: (data: any) => void) => {
    ipcRenderer.on('oauth-error', (_, data) => cb(data));
  },
  secureStorage: {
    get: (key: string) => ipcRenderer.invoke('secure-get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('secure-set', key, value),
    delete: (key: string) => ipcRenderer.invoke('secure-delete', key),
  },
});
```

---

## Tauri Setup

1. Add the deep link scheme to `tauri.conf.json`:

```json
{
  "app": {
    "security": {
      "dangerousRemoteDomainIpcAccess": [
        { "domain": "wallet.hello.coop", "enableTauriAPI": false, "windows": ["login"] }
      ]
    }
  }
}
```

2. Implement the Rust commands (see `tauri-plugin/commands.rs.template` for a starter):

```rust
// src-tauri/src/commands/auth.rs
#[tauri::command]
pub async fn start_oauth(app: tauri::AppHandle, provider: String) -> Result<(), String> {
    // Create WebviewWindow, intercept deep link navigation
}

#[tauri::command]
pub async fn get_token(service: String, key: String) -> Result<Option<String>, String> {
    // Read from OS keychain (use keyring crate)
}

#[tauri::command]
pub async fn store_token(service: String, key: String, value: String) -> Result<(), String> {
    // Write to OS keychain
}

#[tauri::command]
pub async fn clear_tokens(service: String) -> Result<(), String> {
    // Delete from OS keychain
}
```

---

## Testing

### Test Personas

Enable test personas for development and integration testing:

```typescript
const auth = createAuthServer({
  // ... your config
  enableTestPersonas: true, // NEVER enable in production
});
```

This exposes three additional endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/test/seed` | POST | Creates test users in your real database |
| `/test/personas` | GET | Lists available test personas |
| `/test/login-as` | POST | Returns real JWT tokens for a persona |

```bash
# Seed test users
curl -X POST http://localhost:3000/api/auth/test/seed

# List personas
curl http://localhost:3000/api/auth/test/personas

# Get tokens for a test user
curl -X POST http://localhost:3000/api/auth/test/login-as \
  -H 'Content-Type: application/json' \
  -d '{"personaId": "alice"}'
```

> **Warning:** Test endpoints issue real JWT tokens with no authentication. They must be protected by network-layer controls or disabled entirely in production.

### Built-in Personas

| ID | Name | Email | Role |
|---|---|---|---|
| `alice` | Alice Tester | alice@test.kandiforge.com | admin |
| `bob` | Bob Developer | bob@test.kandiforge.com | user |
| `charlie` | Charlie Viewer | charlie@test.kandiforge.com | viewer |
| `diana` | Diana Manager | diana@test.kandiforge.com | manager |

---

## Environment Variables

```bash
# Required
JWT_SECRET=                     # min 32 chars, HS256 signing key
BASE_URL=https://yourapp.com    # your server's public URL

# OAuth Providers (configure the ones you use)
HELLO_CLIENT_ID=                # Hello.coop client ID
GOOGLE_CLIENT_ID=               # Google OAuth client ID
APPLE_CLIENT_ID=                # Apple Services ID or Bundle ID
FACEBOOK_APP_ID=                # Facebook App ID
FACEBOOK_APP_SECRET=            # Facebook App Secret

# Optional
JWT_ISSUER=auth.yourapp.com     # JWT issuer claim
SUCCESS_REDIRECT_URL=           # where to redirect after web login
```

---

## CLI

```bash
npx kandi-login init    # Interactive setup wizard
npx kandi-login         # Development diagnostic tool
```

The `init` wizard generates:
- `.env.kandi-login` with all required environment variable stubs
- `src/auth-config.ts` with a complete client configuration

The dev tool provides:
- Auth server connection testing
- OAuth flow testing
- Environment validation
- Tauri Rust command generation

---

## Entry Points

| Import | Contents |
|---|---|
| `kandi-login` | Core + React (convenience re-export) |
| `kandi-login/core` | Platform detection, token storage, AuthService, platform adapters |
| `kandi-login/react` | AuthProvider, useAuth, useLoginOverlay |
| `kandi-login/react/mui` | MuiLoginChip, MuiLoginOverlay, MuiUserAvatar, icons |
| `kandi-login/react/headless` | HeadlessLoginChip (render props) |
| `kandi-login/tailwind` | TailwindLoginChip, TailwindLoginOverlay |
| `kandi-login/server` | createAuthServer, JWT utils, security utils, test personas |
| `kandi-login/tailwind/kandi-login.css` | CSS custom properties for Tailwind theming |

---

## Known Limitations (v0.1.0)

- **Stateless logout**: Tokens are HS256 with no server-side blacklist. `handleLogout` acknowledges the request but tokens remain valid until expiration. Clients must discard stored tokens.
- **Token delivery**: Web redirect and desktop deep link flows deliver tokens via URL query parameters. Strip tokens from browser history with `window.history.replaceState` after receipt.
- **React peer dependency**: The package lists `react` and `react-dom` as peer dependencies even for server-only usage (`kandi-login/server`). You can safely ignore the peer dependency warnings.

---

## License

MIT
