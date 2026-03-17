/**
 * createAuthServer — Factory that produces a complete OAuth auth server.
 *
 * Returns framework-agnostic handlers for login, callback, native login,
 * refresh, validate, and logout. Mount them on Express, Next.js, Vercel,
 * Fastify, or any Node.js HTTP framework.
 *
 * @example
 * ```ts
 * import { createAuthServer } from 'kandi-login/server';
 *
 * const auth = createAuthServer({
 *   jwt: { secret: process.env.JWT_SECRET!, issuer: 'auth.myapp.com' },
 *   providers: {
 *     google: { clientId: process.env.GOOGLE_CLIENT_ID! },
 *     apple: { clientId: process.env.APPLE_BUNDLE_ID! },
 *     hellocoop: { clientId: process.env.HELLO_CLIENT_ID! },
 *   },
 *   userAdapter: myDatabaseAdapter,
 *   deepLinkScheme: 'myapp',
 *   baseUrl: 'https://auth.myapp.com',
 * });
 *
 * // Express
 * app.get('/auth/login', auth.handleLogin);
 * app.get('/auth/callback', auth.handleCallback);
 * app.post('/auth/native', auth.handleNativeLogin);
 * app.post('/auth/refresh', auth.handleRefresh);
 * app.get('/auth/validate', auth.handleValidate);
 * app.post('/auth/logout', auth.handleLogout);
 * ```
 */

import type {
  AuthServerConfig,
  AuthServer,
  AuthRequest,
  AuthResponse,
  OAuthProfile,
} from './types.js';
import type { KandiLoginUser } from '../core/types.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './jwt.js';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { generateState, verifyState, generateNonce, extractBearerToken } from './security.js';
import {
  createHelloCoopClient,
  buildHelloCoopAuthUrlWithHint,
  exchangeHelloCoopCode,
  fetchHelloCoopProfile,
} from './providers/hellocoop.js';
import { verifyAppleIdToken } from './providers/apple.js';
import { verifyGoogleIdToken } from './providers/google.js';
import {
  createFacebookClient,
  buildFacebookAuthUrl,
  exchangeFacebookCode,
  fetchFacebookProfile,
} from './providers/facebook.js';
import {
  createSeedHandler,
  createListPersonasHandler,
  createLoginAsHandler,
} from './test-personas.js';

function getQueryParam(
  query: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = query[key];
  return Array.isArray(value) ? value[0] : value;
}

function getBody(req: AuthRequest): Record<string, unknown> {
  if (typeof req.body === 'object' && req.body !== null) {
    return req.body as Record<string, unknown>;
  }
  return {};
}

/** Validate return_url against the configured allowlist to prevent open redirects.
 *  Deep link schemes are not validated here — desktop flows construct their own
 *  redirect URL server-side and never use the client-supplied return_url. */
function isAllowedReturnUrl(url: string, config: AuthServerConfig): boolean {
  // Parse as http/https URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  // Only allow http/https protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  // Check against successRedirectUrl origin
  if (config.successRedirectUrl) {
    try {
      const successOrigin = new URL(config.successRedirectUrl).origin;
      if (parsed.origin === successOrigin) return true;
    } catch {
      // invalid successRedirectUrl, skip
    }
  }

  // Check against corsOrigins
  if (config.corsOrigins) {
    for (const origin of config.corsOrigins) {
      try {
        const allowedOrigin = new URL(origin).origin;
        if (parsed.origin === allowedOrigin) return true;
      } catch {
        // corsOrigins may be bare origins like "https://example.com"
        if (parsed.origin === origin) return true;
      }
    }
  }

  return false;
}

/** Build the deep link redirect HTML page */
function deepLinkRedirectHtml(url: string, scheme: string): string {
  const safeUrl = url.replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Redirecting...</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#111;color:#fff">
<div style="text-align:center">
<p>Redirecting to app...</p>
<p style="margin-top:1rem"><a href="${safeUrl}" style="color:#60a5fa">Open ${scheme}:// manually</a></p>
</div>
<script>window.location.href=${JSON.stringify(url)};</script>
</body></html>`;
}

/** Set CORS headers if the request origin matches config.corsOrigins. */
function setCorsHeaders(
  req: AuthRequest,
  res: AuthResponse,
  config: AuthServerConfig,
): void {
  if (!config.corsOrigins || config.corsOrigins.length === 0) return;

  const rawOrigin = req.headers['origin'];
  const origin = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin;

  if (config.corsOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    return; // no match — don't set any CORS headers
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function createAuthServer(config: AuthServerConfig): AuthServer {
  const stateSecret = config.stateSecret ?? config.jwt.secret;
  const callbackPath = config.callbackPath ?? '/callback';

  function getRedirectUri(): string {
    if (!config.baseUrl) {
      throw new Error('baseUrl is required for redirect-based OAuth flows');
    }
    return `${config.baseUrl}${callbackPath}`;
  }

  // --- Arctic client instances (lazy, created once) ---

  const facebookClient = config.providers.facebook
    ? createFacebookClient(config.providers.facebook, getRedirectUri())
    : null;

  const hellocoopClient = config.providers.hellocoop
    ? createHelloCoopClient(config.providers.hellocoop, getRedirectUri())
    : null;

  // --- User upsert with account linking ---

  async function upsertUser(profile: OAuthProfile): Promise<KandiLoginUser> {
    // Stage 1: Find by provider ID
    const existingByProvider = await config.userAdapter.findByProviderId(
      profile.provider,
      profile.providerUserId,
    );
    if (existingByProvider) return existingByProvider;

    // Stage 2: Find by email (cross-provider account linking)
    if (profile.email) {
      const existingByEmail = await config.userAdapter.findByEmail(profile.email);
      if (existingByEmail) {
        await config.userAdapter.linkProvider(
          existingByEmail.id,
          profile.provider,
          profile.providerUserId,
        );
        return existingByEmail;
      }
    }

    // Stage 3: Create new user
    const newUser = await config.userAdapter.createUser(profile);

    if (config.onUserCreated) {
      await config.onUserCreated(newUser, profile.provider);
    }

    return newUser;
  }

  // --- Token signing ---

  async function signTokensForUser(
    user: KandiLoginUser,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const [access_token, refresh_token] = await Promise.all([
      signAccessToken(config.jwt, {
        sub: user.id,
        email: user.email,
        role: (user.role as string) ?? 'user',
        display_name: user.display_name ?? user.name ?? undefined,
        avatar_url: user.avatar_url ?? undefined,
      }),
      signRefreshToken(config.jwt, user.id),
    ]);
    return { access_token, refresh_token };
  }

  // --- Redirect helpers ---

  function redirectWithTokens(
    res: AuthResponse,
    tokens: { access_token: string; refresh_token: string },
    returnUrl?: string,
    clientType?: string,
  ): void {
    // Desktop deep link
    if (clientType === 'desktop' && config.deepLinkScheme) {
      const url = new URL(`${config.deepLinkScheme}://auth/callback`);
      url.searchParams.set('access_token', tokens.access_token);
      url.searchParams.set('refresh_token', tokens.refresh_token);
      res.setHeader('Content-Type', 'text/html');
      res.send(deepLinkRedirectHtml(url.toString(), config.deepLinkScheme));
      return;
    }

    // Web redirect
    const redirectUrl = returnUrl ?? config.successRedirectUrl;
    if (redirectUrl) {
      const url = new URL(redirectUrl);
      url.searchParams.set('access_token', tokens.access_token);
      url.searchParams.set('refresh_token', tokens.refresh_token);
      res.redirect(url.toString());
      return;
    }

    // No redirect URL — return JSON
    res.json({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
  }

  function redirectWithError(
    res: AuthResponse,
    error: string,
    returnUrl?: string,
    clientType?: string,
  ): void {
    if (clientType === 'desktop' && config.deepLinkScheme) {
      const url = new URL(`${config.deepLinkScheme}://auth/callback`);
      url.searchParams.set('error', error);
      res.setHeader('Content-Type', 'text/html');
      res.send(deepLinkRedirectHtml(url.toString(), config.deepLinkScheme));
      return;
    }

    const errorUrl = config.errorRedirectUrl ?? config.successRedirectUrl ?? returnUrl;
    if (errorUrl) {
      const url = new URL(errorUrl);
      url.searchParams.set('error', error);
      res.redirect(url.toString());
      return;
    }

    res.status(400).json({ error });
  }

  // =========================================================================
  // HANDLERS
  // =========================================================================

  /**
   * GET /login?provider=google&return_url=...&client_type=desktop
   *
   * Initiates the OAuth flow by redirecting to the provider's authorization URL.
   * For Hello.coop, uses provider_hint to route to the right upstream provider.
   * For Facebook, redirects directly to Facebook's OAuth dialog.
   * For Apple/Google native flows, returns a JSON error (use /native instead).
   */
  async function handleLogin(req: AuthRequest, res: AuthResponse): Promise<void> {
    const provider = getQueryParam(req.query, 'provider') ?? 'hellocoop';
    const rawReturnUrl = getQueryParam(req.query, 'return_url');
    const clientType = getQueryParam(req.query, 'client_type');

    // Validate return_url against allowlist to prevent open redirects
    const returnUrl =
      rawReturnUrl && isAllowedReturnUrl(rawReturnUrl, config)
        ? rawReturnUrl
        : config.successRedirectUrl;

    const nonce = generateNonce();
    const state = generateState(stateSecret, {
      provider,
      returnUrl,
      nonce,
      clientType,
    });

    // Hello.coop handles all providers via provider_hint
    if (hellocoopClient && config.providers.hellocoop && provider !== 'facebook') {
      const providerHint = provider === 'hellocoop' ? undefined : provider;
      const authUrl = buildHelloCoopAuthUrlWithHint(
        hellocoopClient,
        config.providers.hellocoop,
        { state, nonce, providerHint },
      );
      res.redirect(authUrl);
      return;
    }

    // Direct Facebook OAuth via Arctic
    if (provider === 'facebook' && facebookClient) {
      const authUrl = buildFacebookAuthUrl(facebookClient, state);
      res.redirect(authUrl);
      return;
    }

    // Apple/Google without Hello.coop — these use native ID tokens, not redirect flow
    if ((provider === 'apple' || provider === 'google') && !config.providers.hellocoop) {
      res.status(400).json({
        error: `${provider} requires native ID token flow. POST to /native instead.`,
      });
      return;
    }

    res.status(400).json({ error: `Provider "${provider}" is not configured` });
  }

  /**
   * GET /callback?code=...&state=...
   *
   * OAuth redirect callback. Verifies state, exchanges code for tokens,
   * upserts user, signs JWTs, and redirects with tokens.
   */
  async function handleCallback(req: AuthRequest, res: AuthResponse): Promise<void> {
    const code = getQueryParam(req.query, 'code');
    const stateParam = getQueryParam(req.query, 'state');
    const errorParam = getQueryParam(req.query, 'error');

    if (errorParam) {
      const desc = getQueryParam(req.query, 'error_description') ?? errorParam;
      redirectWithError(res, desc);
      return;
    }

    if (!code || !stateParam) {
      redirectWithError(res, 'Missing code or state parameter');
      return;
    }

    // Verify HMAC state
    const stateData = verifyState(stateSecret, stateParam);
    if (!stateData) {
      redirectWithError(res, 'Invalid or expired state token');
      return;
    }

    try {
      let profile: OAuthProfile;

      if (stateData.provider === 'facebook' && facebookClient) {
        // Facebook: exchange code via Arctic, then fetch profile
        const fbToken = await exchangeFacebookCode(facebookClient, code);
        profile = await fetchFacebookProfile(fbToken);
      } else if (hellocoopClient) {
        // Hello.coop: exchange code via Arctic, then fetch userinfo
        const tokens = await exchangeHelloCoopCode(hellocoopClient, code);

        // Verify ID token signature and nonce claim
        if (stateData.nonce && tokens.id_token) {
          try {
            const JWKS = createRemoteJWKSet(new URL('https://issuer.hello.coop/.well-known/jwks'));
            const { payload } = await jwtVerify(tokens.id_token, JWKS, {
              issuer: 'https://issuer.hello.coop',
            });
            if (payload.nonce !== stateData.nonce) {
              redirectWithError(res, 'Nonce mismatch — possible replay attack', stateData.returnUrl, stateData.clientType);
              return;
            }
          } catch {
            redirectWithError(res, 'ID token verification failed', stateData.returnUrl, stateData.clientType);
            return;
          }
        }

        profile = await fetchHelloCoopProfile(tokens.access_token);
      } else {
        redirectWithError(res, 'No provider configured for callback', stateData.returnUrl, stateData.clientType);
        return;
      }

      const user = await upsertUser(profile);

      if (config.onLogin) {
        await config.onLogin(user, profile.provider);
      }

      const tokens = await signTokensForUser(user);
      redirectWithTokens(res, tokens, stateData.returnUrl, stateData.clientType);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      redirectWithError(res, message, stateData.returnUrl, stateData.clientType);
    }
  }

  /**
   * POST /native
   * Body: { provider: "apple"|"google", id_token: "...", email?, name?, picture?, nonce? }
   *
   * Verifies a native ID token (from Apple/Google SDKs) directly.
   * No redirect — returns JSON with JWTs.
   */
  async function handleNativeLogin(req: AuthRequest, res: AuthResponse): Promise<void> {
    setCorsHeaders(req, res, config);
    const body = getBody(req);
    const provider = body.provider as string | undefined;
    const idToken = body.id_token as string | undefined;

    if (!provider || !idToken) {
      res.status(400).json({ error: 'Missing provider or id_token' });
      return;
    }

    try {
      let profile: OAuthProfile;

      if (provider === 'apple' && config.providers.apple) {
        profile = await verifyAppleIdToken(config.providers.apple, idToken, {
          email: body.email as string | undefined,
          givenName: body.given_name as string | undefined,
          familyName: body.family_name as string | undefined,
          nonce: body.nonce as string | undefined,
        });
      } else if (provider === 'google' && config.providers.google) {
        profile = await verifyGoogleIdToken(config.providers.google, idToken, {
          email: body.email as string | undefined,
          name: body.name as string | undefined,
          picture: body.picture as string | undefined,
        });
      } else {
        res.status(400).json({ error: `Native login not supported for "${provider}"` });
        return;
      }

      const user = await upsertUser(profile);

      if (config.onLogin) {
        await config.onLogin(user, profile.provider);
      }

      const tokens = await signTokensForUser(user);
      res.json({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: 3600,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token verification failed';
      res.status(401).json({ error: message });
    }
  }

  /**
   * POST /refresh
   * Body: { refresh_token: "..." }
   *
   * Verifies the refresh token, fetches the latest user, and issues new tokens.
   * Rolling refresh — a new refresh token is always issued.
   */
  async function handleRefresh(req: AuthRequest, res: AuthResponse): Promise<void> {
    setCorsHeaders(req, res, config);
    const body = getBody(req);
    const refreshTokenValue = body.refresh_token as string | undefined;

    if (!refreshTokenValue) {
      res.status(400).json({ error: 'Missing refresh_token' });
      return;
    }

    try {
      const userId = await verifyRefreshToken(config.jwt, refreshTokenValue);
      const user = await config.userAdapter.getUserById(userId);

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      const tokens = await signTokensForUser(user);
      res.json({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: 3600,
      });
    } catch {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  }

  /**
   * GET /validate
   * Header: Authorization: Bearer <access_token>
   *
   * Validates the access token and returns the user profile.
   */
  async function handleValidate(req: AuthRequest, res: AuthResponse): Promise<void> {
    setCorsHeaders(req, res, config);
    const token = extractBearerToken(req.headers);
    if (!token) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    try {
      const payload = await verifyAccessToken(config.jwt, token);
      const user = await config.userAdapter.getUserById(payload.sub);

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      res.json({ valid: true, user });
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  /**
   * POST /logout
   * Header: Authorization: Bearer <access_token>
   *
   * Stateless logout acknowledgement. Since JWTs are stateless,
   * the token remains valid until expiration. Client should discard tokens.
   */
  async function handleLogout(req: AuthRequest, res: AuthResponse): Promise<void> {
    setCorsHeaders(req, res, config);
    res.json({ success: true });
  }

  // --- Test Persona Handlers (guarded) ---

  /** Wrap a handler so CORS headers are set before delegation. */
  function withCors(
    handler: (req: AuthRequest, res: AuthResponse) => Promise<void>,
  ): (req: AuthRequest, res: AuthResponse) => Promise<void> {
    return async (req, res) => {
      setCorsHeaders(req, res, config);
      return handler(req, res);
    };
  }

  const testHandlers = config.enableTestPersonas
    ? {
        handleSeedPersonas: withCors(createSeedHandler(
          config.userAdapter,
          config.jwt,
          config.testTokenEncryptionSecret ?? config.jwt.secret,
          config.testPersonas,
        )),
        handleListPersonas: withCors(createListPersonasHandler(config.testPersonas)),
        handleLoginAs: withCors(createLoginAsHandler(
          config.userAdapter,
          config.jwt,
          config.testTokenEncryptionSecret ?? config.jwt.secret,
          config.testPersonas,
        )),
      }
    : {};

  // --- Public API ---

  return {
    handleLogin,
    handleCallback,
    handleNativeLogin,
    handleRefresh,
    handleValidate,
    handleLogout,
    verifyToken: (token: string) => verifyAccessToken(config.jwt, token),
    signTokens: signTokensForUser,
    ...testHandlers,
  };
}
