# kandi-login Implementation Examples

## Example 1: Next.js App Router + Supabase

### Database Schema

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  display_name text,
  avatar_url text,
  email_verified boolean default false,
  role text default 'user',
  google_sub text unique,
  apple_sub text unique,
  facebook_sub text unique,
  hellocoop_sub text unique,
  test_sub text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Environment Variables

```env
JWT_SECRET=your-min-32-char-secret-key-here-change-me
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
HELLO_CLIENT_ID=xxx
NEXT_PUBLIC_URL=http://localhost:3000
```

### User Adapter (`lib/user-adapter.ts`)

```ts
import { createClient } from '@supabase/supabase-js';
import type { UserAdapter, OAuthProfile } from 'kandi-login/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

export const userAdapter: UserAdapter = {
  async findByProviderId(provider, providerUserId) {
    const column = `${provider}_sub`;
    const { data } = await supabase
      .from('users').select('*')
      .eq(column, providerUserId).single();
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
        role: (profile.raw?.role as string) ?? 'user',
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
```

### Auth Server (`app/api/auth/[...path]/route.ts`)

```ts
import { createAuthServer } from 'kandi-login/server';
import { userAdapter } from '@/lib/user-adapter';

const isDev = process.env.NODE_ENV === 'development';

const auth = createAuthServer({
  jwt: { secret: process.env.JWT_SECRET!, issuer: 'auth.myapp.com' },
  providers: {
    google: { clientId: process.env.GOOGLE_CLIENT_ID! },
    hellocoop: { clientId: process.env.HELLO_CLIENT_ID! },
  },
  userAdapter,
  baseUrl: process.env.NEXT_PUBLIC_URL + '/api/auth',
  successRedirectUrl: process.env.NEXT_PUBLIC_URL + '/dashboard',
  enableTestPersonas: isDev,
});

function adaptRequest(req: Request) {
  const url = new URL(req.url);
  return {
    method: req.method,
    url: req.url,
    query: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries(req.headers),
  };
}

function createRes() {
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
    setHeader: () => res,
  };
  return { res, getResult: () => result! };
}

const routes: Record<string, Record<string, Function>> = {
  GET: {
    login: auth.handleLogin,
    callback: auth.handleCallback,
    validate: auth.handleValidate,
    personas: auth.handleListPersonas,
  },
  POST: {
    native: auth.handleNativeLogin,
    refresh: auth.handleRefresh,
    logout: auth.handleLogout,
    seed: auth.handleSeedPersonas,
    'login-as': auth.handleLoginAs,
  },
};

async function handle(req: Request) {
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const action = segments[segments.length - 1];

  const handler = routes[req.method]?.[action];
  if (!handler) return Response.json({ error: 'Not found' }, { status: 404 });

  const adapted = adaptRequest(req);
  if (req.method === 'POST') {
    try { (adapted as any).body = await req.json(); } catch { (adapted as any).body = {}; }
  }

  const { res, getResult } = createRes();
  await handler(adapted as any, res as any);
  return getResult();
}

export { handle as GET, handle as POST };
```

### Client Layout (`app/layout.tsx`)

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

### Login Page with MUI (`app/page.tsx`)

```tsx
'use client';
import { MuiLoginChip } from 'kandi-login/react/mui';

export default function Home() {
  return (
    <header style={{ display: 'flex', justifyContent: 'flex-end', padding: 16 }}>
      <MuiLoginChip variant="glass" />
    </header>
  );
}
```

---

## Example 2: Express + Prisma

### Prisma Schema (`prisma/schema.prisma`)

```prisma
model User {
  id          String          @id @default(uuid())
  email       String          @unique
  name        String?
  displayName String?
  avatarUrl   String?
  role        String          @default("user")
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

### User Adapter (`src/user-adapter.ts`)

```ts
import { PrismaClient } from '@prisma/client';
import type { UserAdapter, OAuthProfile } from 'kandi-login/server';

const prisma = new PrismaClient();

export const userAdapter: UserAdapter = {
  async findByProviderId(provider, providerUserId) {
    const link = await prisma.oAuthProvider.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      include: { user: true },
    });
    return link?.user ?? null;
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
        role: (profile.raw?.role as string) ?? 'user',
        providers: {
          create: { provider: profile.provider, providerUserId: profile.providerUserId },
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

### Express Server (`src/server.ts`)

```ts
import express from 'express';
import cors from 'cors';
import { createAuthServer } from 'kandi-login/server';
import { userAdapter } from './user-adapter';

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
  enableTestPersonas: process.env.NODE_ENV === 'development',
});

// Production auth routes
app.get('/auth/login',    auth.handleLogin);
app.get('/auth/callback', auth.handleCallback);
app.post('/auth/native',  auth.handleNativeLogin);
app.post('/auth/refresh', auth.handleRefresh);
app.get('/auth/validate', auth.handleValidate);
app.post('/auth/logout',  auth.handleLogout);

// Test persona routes (only exist when enableTestPersonas: true)
if (auth.handleSeedPersonas) {
  app.post('/test/seed',      auth.handleSeedPersonas);
  app.get('/test/personas',   auth.handleListPersonas!);
  app.post('/test/login-as',  auth.handleLoginAs!);
}

app.listen(3001, () => console.log('Auth server on :3001'));
```

---

## Example 3: Test Personas Usage

### Seeding personas (dev startup script)

```ts
// scripts/seed-test-users.ts
const response = await fetch('http://localhost:3001/test/seed', { method: 'POST' });
const result = await response.json();
console.log('Seeded:', result.seeded.length, 'Skipped:', result.skipped.length);
```

### Login as a test persona (from tests or dev tools)

```ts
// In your test setup or dev console
const response = await fetch('http://localhost:3001/test/login-as', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ personaId: 'admin-alex' }),
});

const { access_token, refresh_token, persona } = await response.json();
// access_token is a REAL JWT — use it exactly like a production token
// persona: { id: "admin-alex", name: "Alex Admin", email: "alex@test.kandi.dev", role: "admin" }
```

### Custom personas

```ts
const auth = createAuthServer({
  // ...
  enableTestPersonas: true,
  testPersonas: [
    { id: 'qa-lead', name: 'QA Lead', email: 'qa@mycompany.com', role: 'admin' },
    { id: 'beta-tester', name: 'Beta User', email: 'beta@mycompany.com', role: 'user' },
    { id: 'free-tier', name: 'Free User', email: 'free@mycompany.com', role: 'free' },
  ],
});
```

### Integration test example (Vitest)

```ts
import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'http://localhost:3001';

describe('Auth with test personas', () => {
  beforeAll(async () => {
    await fetch(`${BASE}/test/seed`, { method: 'POST' });
  });

  it('can login as admin persona', async () => {
    const res = await fetch(`${BASE}/test/login-as`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId: 'admin-alex' }),
    });
    const data = await res.json();
    expect(data.access_token).toBeDefined();
    expect(data.persona.role).toBe('admin');
  });

  it('admin token validates successfully', async () => {
    const login = await fetch(`${BASE}/test/login-as`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId: 'admin-alex' }),
    });
    const { access_token } = await login.json();

    const validate = await fetch(`${BASE}/auth/validate`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const result = await validate.json();
    expect(result.valid).toBe(true);
    expect(result.user.email).toBe('alex@test.kandi.dev');
  });

  it('can refresh a test persona token', async () => {
    const login = await fetch(`${BASE}/test/login-as`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId: 'designer-dana' }),
    });
    const { refresh_token } = await login.json();

    const refresh = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token }),
    });
    const data = await refresh.json();
    expect(data.access_token).toBeDefined();
    expect(data.refresh_token).toBeDefined();
  });

  it('rejects unknown persona', async () => {
    const res = await fetch(`${BASE}/test/login-as`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId: 'nobody' }),
    });
    expect(res.status).toBe(404);
  });
});
```

---

## Example 4: Tauri Desktop App

### Client Config

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

### Tauri Rust Commands

Generate with: `npx kandi-login` → "Check/Generate Tauri Rust commands"

Required commands:
- `start_oauth(provider: Option<String>)` — Opens OAuth webview
- `get_token(service: String, key: String)` — Reads OS keychain
- `store_token(service: String, key: String, value: String)` — Writes OS keychain
- `clear_tokens(service: String)` — Clears keychain entries

### Desktop Login Flow

1. User clicks "Sign in with Google" on `MuiLoginChip`
2. Client `AuthService` detects Tauri, calls `invoke('start_oauth', { provider: 'google' })`
3. Rust opens a webview to `https://auth.myapp.com/auth/login?provider=google&client_type=desktop&return_url=myapp://auth/callback`
4. User authenticates, server redirects to `myapp://auth/callback?access_token=...&refresh_token=...`
5. Tauri intercepts the deep link, fires `oauth-callback` event
6. Client receives tokens, stores in OS keychain via `invoke('store_token', ...)`
