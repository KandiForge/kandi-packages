/**
 * kandi-login: Drizzle ORM schema for user table with OAuth provider linking
 *
 * Usage:
 *   1. Copy this into your drizzle schema directory
 *   2. Run: npx drizzle-kit generate && npx drizzle-kit migrate
 *   3. Implement UserAdapter using drizzle queries (see example below)
 */

import { pgTable, uuid, text, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  name: text('name'),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  emailVerified: boolean('email_verified').default(false),
  role: text('role').default('user'),

  // OAuth provider subject IDs
  googleSub: text('google_sub').unique(),
  appleSub: text('apple_sub').unique(),
  facebookSub: text('facebook_sub').unique(),
  hellocoopSub: text('hellocoop_sub').unique(),
  testSub: text('test_sub').unique(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
}));

// ---------------------------------------------------------------------------
// Example UserAdapter implementation for Drizzle
// ---------------------------------------------------------------------------

/*
import { eq } from 'drizzle-orm';
import { db } from './db';  // your drizzle instance
import { users } from './schema';
import type { UserAdapter, OAuthProfile } from 'kandi-login/server';

// Maps provider name to the column in the users table
const providerColumns = {
  google: users.googleSub,
  apple: users.appleSub,
  facebook: users.facebookSub,
  hellocoop: users.hellocoopSub,
  test: users.testSub,
} as const;

export const userAdapter: UserAdapter = {
  async findByProviderId(provider, providerUserId) {
    const column = providerColumns[provider as keyof typeof providerColumns];
    if (!column) return null;
    const [user] = await db.select().from(users).where(eq(column, providerUserId)).limit(1);
    return user ?? null;
  },

  async findByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  },

  async createUser(profile: OAuthProfile) {
    const column = providerColumns[profile.provider as keyof typeof providerColumns];
    const [user] = await db.insert(users).values({
      email: profile.email,
      name: profile.name,
      displayName: profile.name ?? profile.email.split('@')[0],
      avatarUrl: profile.avatarUrl,
      role: (profile.raw?.role as string) ?? 'user',
      ...(column ? { [column.name]: profile.providerUserId } : {}),
    }).returning();
    return user!;
  },

  async linkProvider(userId, provider, providerUserId) {
    const column = providerColumns[provider as keyof typeof providerColumns];
    if (!column) return;
    await db.update(users).set({ [column.name]: providerUserId }).where(eq(users.id, userId));
  },

  async getUserById(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  },
};
*/
