/**
 * Test Personas — pre-built user accounts for development and testing.
 *
 * Creates test users via the same UserAdapter used in production, and
 * stores encrypted mock OAuth tokens using AES-256-GCM. This ensures:
 * 1. Test code exercises the same code paths as production
 * 2. Tokens are never stored in plaintext, even in dev
 * 3. The login-as flow issues real JWTs identical to production
 *
 * Guarded by `enableTestPersonas: true` in AuthServerConfig.
 */

import { randomUUID } from 'crypto';
import type { KandiLoginUser } from '../core/types.js';
import type { UserAdapter, OAuthProfile, AuthRequest, AuthResponse, JwtConfig, TestPersonaDefinition } from './types.js';
import { encrypt } from './encryption.js';
import { signAccessToken, signRefreshToken } from './jwt.js';

// ---------------------------------------------------------------------------
// Default persona definitions
// ---------------------------------------------------------------------------

export const DEFAULT_PERSONAS: TestPersonaDefinition[] = [
  {
    id: 'admin-alex',
    name: 'Alex Admin',
    email: 'alex@test.kandi.dev',
    role: 'admin',
    avatarUrl: null,
    provider: 'test',
  },
  {
    id: 'designer-dana',
    name: 'Dana Designer',
    email: 'dana@test.kandi.dev',
    role: 'user',
    avatarUrl: null,
    provider: 'test',
  },
  {
    id: 'viewer-val',
    name: 'Val Viewer',
    email: 'val@test.kandi.dev',
    role: 'viewer',
    avatarUrl: null,
    provider: 'test',
  },
  {
    id: 'new-user-naya',
    name: 'Naya Newbie',
    email: 'naya@test.kandi.dev',
    role: 'user',
    avatarUrl: null,
    provider: 'test',
  },
];

// ---------------------------------------------------------------------------
// Encrypted token store (in-memory for the server process)
// ---------------------------------------------------------------------------

interface StoredTestToken {
  personaId: string;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  createdAt: string;
}

const tokenStore = new Map<string, StoredTestToken>();

// ---------------------------------------------------------------------------
// Seed personas
// ---------------------------------------------------------------------------

export async function seedTestPersonas(
  userAdapter: UserAdapter,
  jwtConfig: JwtConfig,
  encryptionSecret: string,
  personas?: TestPersonaDefinition[],
): Promise<{ seeded: KandiLoginUser[]; skipped: string[] }> {
  const defs = personas ?? DEFAULT_PERSONAS;
  const seeded: KandiLoginUser[] = [];
  const skipped: string[] = [];

  for (const persona of defs) {
    // Check if this persona already exists
    const existing = await userAdapter.findByProviderId('test', persona.id);
    if (existing) {
      // Re-generate tokens for the existing user
      await generateAndStoreTokens(existing, persona.id, jwtConfig, encryptionSecret);
      skipped.push(persona.id);
      continue;
    }

    // Also check by email to avoid duplicates
    const byEmail = await userAdapter.findByEmail(persona.email);
    if (byEmail) {
      await userAdapter.linkProvider(byEmail.id, 'test', persona.id);
      await generateAndStoreTokens(byEmail, persona.id, jwtConfig, encryptionSecret);
      skipped.push(persona.id);
      continue;
    }

    // Create the user via the real adapter
    const profile: OAuthProfile = {
      provider: 'test',
      providerUserId: persona.id,
      email: persona.email,
      name: persona.name,
      avatarUrl: persona.avatarUrl,
      emailVerified: true,
      raw: { role: persona.role, isTestPersona: true },
    };

    const user = await userAdapter.createUser(profile);
    await generateAndStoreTokens(user, persona.id, jwtConfig, encryptionSecret);
    seeded.push(user);
  }

  return { seeded, skipped };
}

async function generateAndStoreTokens(
  user: KandiLoginUser,
  personaId: string,
  jwtConfig: JwtConfig,
  encryptionSecret: string,
): Promise<void> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(jwtConfig, {
      sub: user.id,
      email: user.email,
      role: (user.role as string) ?? 'user',
      display_name: user.display_name ?? user.name ?? undefined,
      avatar_url: user.avatar_url ?? undefined,
    }),
    signRefreshToken(jwtConfig, user.id),
  ]);

  // Encrypt and store
  tokenStore.set(personaId, {
    personaId,
    encryptedAccessToken: encrypt(accessToken, encryptionSecret),
    encryptedRefreshToken: encrypt(refreshToken, encryptionSecret),
    createdAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function getBody(req: AuthRequest): Record<string, unknown> {
  if (typeof req.body === 'object' && req.body !== null) {
    return req.body as Record<string, unknown>;
  }
  return {};
}

/**
 * POST /test/seed
 * Body (optional): { personas: TestPersonaDefinition[] }
 *
 * Seeds test personas into the database and generates encrypted tokens.
 */
export function createSeedHandler(
  userAdapter: UserAdapter,
  jwtConfig: JwtConfig,
  encryptionSecret: string,
  customPersonas?: TestPersonaDefinition[],
) {
  return async function handleSeedPersonas(req: AuthRequest, res: AuthResponse): Promise<void> {
    try {
      const body = getBody(req);
      const personas = (body.personas as TestPersonaDefinition[] | undefined) ?? customPersonas;
      const result = await seedTestPersonas(userAdapter, jwtConfig, encryptionSecret, personas);

      res.json({
        success: true,
        seeded: result.seeded.map(u => ({ id: u.id, email: u.email, name: u.name })),
        skipped: result.skipped,
        total: (personas ?? DEFAULT_PERSONAS).length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to seed personas';
      res.status(500).json({ error: message });
    }
  };
}

/**
 * GET /test/personas
 *
 * Lists all available test personas (no secrets exposed).
 */
export function createListPersonasHandler(customPersonas?: TestPersonaDefinition[]) {
  const personas = customPersonas ?? DEFAULT_PERSONAS;

  return async function handleListPersonas(_req: AuthRequest, res: AuthResponse): Promise<void> {
    res.json({
      personas: personas.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role,
        hasTokens: tokenStore.has(p.id),
      })),
    });
  };
}

/**
 * POST /test/login-as
 * Body: { personaId: "admin-alex" }
 *
 * Signs fresh JWTs for a test persona — identical to a real OAuth login.
 * If tokens haven't been generated yet (no prior seed), seeds on-the-fly.
 */
export function createLoginAsHandler(
  userAdapter: UserAdapter,
  jwtConfig: JwtConfig,
  encryptionSecret: string,
  customPersonas?: TestPersonaDefinition[],
) {
  return async function handleLoginAs(req: AuthRequest, res: AuthResponse): Promise<void> {
    const body = getBody(req);
    const personaId = body.personaId as string | undefined;

    if (!personaId) {
      res.status(400).json({ error: 'Missing personaId' });
      return;
    }

    const defs = customPersonas ?? DEFAULT_PERSONAS;
    const persona = defs.find(p => p.id === personaId);
    if (!persona) {
      res.status(404).json({
        error: `Unknown persona "${personaId}"`,
        available: defs.map(p => p.id),
      });
      return;
    }

    try {
      // Find or create the user
      let user = await userAdapter.findByProviderId('test', persona.id);
      if (!user) {
        // Auto-seed this persona
        await seedTestPersonas(userAdapter, jwtConfig, encryptionSecret, [persona]);
        user = await userAdapter.findByProviderId('test', persona.id);
      }

      if (!user) {
        res.status(500).json({ error: 'Failed to create test persona' });
        return;
      }

      // Sign fresh tokens (not the stored ones — always fresh for login-as)
      const [accessToken, refreshToken] = await Promise.all([
        signAccessToken(jwtConfig, {
          sub: user.id,
          email: user.email,
          role: (user.role as string) ?? persona.role ?? 'user',
          display_name: user.display_name ?? user.name ?? persona.name ?? undefined,
          avatar_url: user.avatar_url ?? undefined,
        }),
        signRefreshToken(jwtConfig, user.id),
      ]);

      // Update encrypted store
      tokenStore.set(personaId, {
        personaId,
        encryptedAccessToken: encrypt(accessToken, encryptionSecret),
        encryptedRefreshToken: encrypt(refreshToken, encryptionSecret),
        createdAt: new Date().toISOString(),
      });

      res.json({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        persona: {
          id: persona.id,
          name: persona.name,
          email: persona.email,
          role: persona.role,
        },
        _tokenId: randomUUID(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login-as failed';
      res.status(500).json({ error: message });
    }
  };
}
