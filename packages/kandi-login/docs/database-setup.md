# Database Setup Guide

kandi-login is database-agnostic. You implement a `UserAdapter` interface (5 functions) that connects to your database. This guide provides ready-to-use migration scripts and adapter implementations for every major database.

## Quick Reference

| Database | Migration File | Adapter Pattern |
|----------|---------------|-----------------|
| **PostgreSQL / Supabase** | [`migrations/001_users_table.sql`](./migrations/001_users_table.sql) | Column-per-provider on `users` table |
| **Prisma** (any SQL DB) | [`migrations/001_users_table.prisma`](./migrations/001_users_table.prisma) | Join table (`OAuthProvider`) |
| **Drizzle** (PostgreSQL) | [`migrations/001_users_table.drizzle.ts`](./migrations/001_users_table.drizzle.ts) | Column-per-provider on `users` table |
| **MongoDB / Mongoose** | [`migrations/001_users_table.mongo.ts`](./migrations/001_users_table.mongo.ts) | Fields on user document |

## Schema Design Patterns

### Pattern A: Column-per-provider (Supabase, Drizzle, raw SQL)

Each OAuth provider gets its own `_sub` column on the `users` table:

```
users
├── id (UUID, PK)
├── email (TEXT, UNIQUE)
├── name, display_name, avatar_url, role
├── google_sub (TEXT, UNIQUE)      ← Google's user ID
├── apple_sub (TEXT, UNIQUE)       ← Apple's user ID
├── facebook_sub (TEXT, UNIQUE)    ← Facebook's user ID
├── hellocoop_sub (TEXT, UNIQUE)   ← Hello.coop's user ID
├── test_sub (TEXT, UNIQUE)        ← Test persona ID
└── created_at, updated_at
```

**Pros:** Simple queries, single table, fast lookups.
**Cons:** Adding a new provider requires a migration (ALTER TABLE).

### Pattern B: Join table (Prisma)

Provider links stored in a separate `oauth_providers` table:

```
users                          oauth_providers
├── id (UUID, PK)              ├── id (UUID, PK)
├── email (UNIQUE)             ├── provider (TEXT)
├── name, role, etc.           ├── provider_user_id (TEXT)
└── ...                        ├── user_id (FK → users.id)
                               └── UNIQUE(provider, provider_user_id)
```

**Pros:** Adding new providers needs no migration. Cleaner normalization.
**Cons:** Extra join for provider lookups. Slightly more complex adapter.

## Step-by-Step Setup

### PostgreSQL / Supabase

```bash
# Option 1: Run migration directly
psql $DATABASE_URL -f docs/migrations/001_users_table.sql

# Option 2: Supabase SQL Editor
# Copy contents of 001_users_table.sql → paste into SQL Editor → Run
```

Then implement the adapter:

```ts
// lib/user-adapter.ts
import { createClient } from '@supabase/supabase-js';
import type { UserAdapter, OAuthProfile } from 'kandi-login/server';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export const userAdapter: UserAdapter = {
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
    const { data } = await supabase.from('users').insert({
      email: profile.email,
      name: profile.name,
      display_name: profile.name ?? profile.email.split('@')[0],
      avatar_url: profile.avatarUrl,
      role: (profile.raw?.role as string) ?? 'user',
      [`${profile.provider}_sub`]: profile.providerUserId,
    }).select().single();
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

### Prisma

```bash
# 1. Add schema to prisma/schema.prisma (copy from 001_users_table.prisma)

# 2. Run migration
npx prisma migrate dev --name add-kandi-login-users

# 3. Generate client
npx prisma generate
```

Then implement the adapter:

```ts
// lib/user-adapter.ts
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

### Drizzle

```bash
# 1. Copy 001_users_table.drizzle.ts into your schema directory

# 2. Generate and run migration
npx drizzle-kit generate
npx drizzle-kit migrate
```

The adapter implementation is included in the migration file as a commented example.

### MongoDB / Mongoose

```bash
# No migration needed — MongoDB creates collections on first write.
# Just ensure your Mongoose connection is configured.
```

The schema and adapter implementation are in `001_users_table.mongo.ts` as a commented example.

## UserAdapter Interface

Every adapter must implement these 5 methods:

```ts
interface UserAdapter {
  // Called first during login — find by provider's unique user ID
  findByProviderId(provider: string, providerUserId: string): Promise<KandiLoginUser | null>;

  // Called second — find by email for cross-provider account linking
  findByEmail(email: string): Promise<KandiLoginUser | null>;

  // Called when linking a new provider to an existing user (found by email)
  linkProvider(userId: string, provider: string, providerUserId: string): Promise<void>;

  // Called when no existing user found — create a new user
  createUser(profile: OAuthProfile): Promise<KandiLoginUser>;

  // Called during token refresh and validation — look up user by ID
  getUserById(id: string): Promise<KandiLoginUser | null>;
}
```

### OAuthProfile (input to createUser)

```ts
interface OAuthProfile {
  provider: string;          // "google", "apple", "facebook", "hellocoop", "test"
  providerUserId: string;    // The provider's unique ID for this user
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  raw?: Record<string, unknown>;  // Full provider response
}
```

### KandiLoginUser (what your adapter returns)

```ts
interface KandiLoginUser {
  id: string;                      // Your database user ID (required)
  email: string;                   // Required
  name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  email_verified?: boolean;
  [key: string]: unknown;          // Any extra fields you want
}
```

The `id` and `email` fields are required. Everything else is optional. kandi-login uses `name`, `display_name`, and `avatar_url` in JWT claims and UI components. Any additional fields you add are passed through to the client.

## Account Linking Flow

When a user signs in, kandi-login calls your adapter in this order:

```
1. findByProviderId("google", "goog-sub-123")
   └── Found? → return user, done

2. findByEmail("jane@example.com")
   └── Found? → linkProvider(user.id, "google", "goog-sub-123"), done
                 (user now has both providers linked)

3. createUser({ provider: "google", providerUserId: "goog-sub-123", email: "jane@example.com", ... })
   └── New user created, done
```

This means if a user signs in with Google first, then Apple with the same email, both providers automatically link to the same account. No user action needed.

## Adding a Custom Provider

To support a provider not built into kandi-login (e.g., GitHub, Discord):

### Pattern A (column-per-provider):
```sql
ALTER TABLE users ADD COLUMN github_sub TEXT UNIQUE;
CREATE INDEX idx_users_github_sub ON users(github_sub) WHERE github_sub IS NOT NULL;
```

### Pattern B (join table):
No migration needed — just pass `provider: "github"` and it works automatically.

### In your adapter:
The adapter code already handles any provider string. For Pattern A, your `findByProviderId` dynamically builds the column name (`${provider}_sub`). For Pattern B, the join table stores any provider string.

## Verification Checklist

After setting up your database and adapter:

- [ ] `findByProviderId("test", "admin-alex")` returns `null` (no test users yet)
- [ ] `createUser({ provider: "test", providerUserId: "test-1", email: "test@example.com", ... })` returns a user with an `id`
- [ ] `findByProviderId("test", "test-1")` returns the created user
- [ ] `findByEmail("test@example.com")` returns the same user
- [ ] `linkProvider(user.id, "google", "goog-123")` succeeds without error
- [ ] `findByProviderId("google", "goog-123")` returns the same user (linked)
- [ ] `getUserById(user.id)` returns the user
- [ ] `getUserById("nonexistent-id")` returns `null`
