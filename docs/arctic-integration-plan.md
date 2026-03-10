# Arctic Integration Plan

Replace custom OAuth provider implementations in kandi-login's server SDK with [Arctic](https://github.com/pilcrowonpaper/arctic) (v3.7.0, MIT, ~61k weekly npm downloads).

## Current State

kandi-login's server SDK has 4 provider modules (~324 LOC total):

| File | Provider | Flow Type | LOC |
|---|---|---|---|
| `providers/hellocoop.ts` | Hello.coop | Authorization code (redirect) | ~103 |
| `providers/facebook.ts` | Facebook | Authorization code (redirect) | ~87 |
| `providers/google.ts` | Google | Native ID token verification (JWKS) | ~58 |
| `providers/apple.ts` | Apple | Native ID token verification (JWKS) | ~76 |

Supporting files:
- `security.ts` — State token generation (HMAC-SHA256), nonce generation (~93 LOC)
- `jwt.ts` — Access/refresh token signing via `jose` (~78 LOC)

## What Arctic Replaces (and What It Doesn't)

### Arctic REPLACES

| Component | Current Code | Arctic Replacement |
|---|---|---|
| Facebook auth URL building | `buildFacebookAuthUrl()` | `facebook.createAuthorizationURL(state, scopes)` |
| Facebook code → access_token | `exchangeFacebookCode()` | `facebook.validateAuthorizationCode(code)` |
| Facebook profile fetch | `fetchFacebookProfile()` | Keep — Arctic doesn't fetch profiles |
| State generation | Custom `generateNonce()` | `arctic.generateState()` |
| PKCE generation | Not implemented | `arctic.generateCodeVerifier()` (future) |

### Arctic DOES NOT Replace

| Component | Why |
|---|---|
| Hello.coop provider | Not in Arctic's 64 providers. Use `arctic.OAuth2Client` generic client. |
| Google native ID token verification | Arctic only handles redirect flows. kandi-login uses `jose` JWKS verification for native tokens from mobile/desktop clients. |
| Apple native ID token verification | Same — native flow, not redirect. `jose` JWKS stays. |
| HMAC-SHA256 state tokens | kandi-login's state tokens embed metadata (provider, returnUrl, nonce, clientType, TTL). Arctic's `generateState()` produces a bare random string. Keep custom state tokens. |
| JWT signing (access/refresh tokens) | Arctic is for provider OAuth only, not for signing kandi-login's own JWTs. `jose` stays. |
| AES-256-GCM encryption | Test persona encryption. Unrelated to OAuth. |

### Hello.coop via Generic OAuth2Client

Since Hello.coop is not a built-in Arctic provider, use `arctic.OAuth2Client`:

```typescript
import * as arctic from "arctic";

const hellocoop = new arctic.OAuth2Client(
  credentials.clientId,
  null,  // Hello.coop uses client_id only (no client_secret for public clients)
  redirectUri
);

// Auth URL
const state = arctic.generateState();
const url = hellocoop.createAuthorizationURL(
  "https://wallet.hello.coop/authorize",
  state,
  ["openid", "email", "profile", "picture"]
);
url.searchParams.set("provider_hint", "google"); // optional

// Code exchange
const tokens = await hellocoop.validateAuthorizationCode(
  "https://wallet.hello.coop/oauth/token",
  code,
  null // no PKCE currently
);
const accessToken = tokens.accessToken();
const idToken = tokens.idToken();
```

**Note**: Hello.coop's token exchange requires `client_id` in the POST body. Verify Arctic's generic client sends it. If not, keep the manual `fetch()` for token exchange only.

## Migration Strategy

**Approach: Incremental, not big-bang.** Replace one provider at a time, keeping tests green after each step.

### Phase 1: Add Arctic dependency + Facebook migration

Facebook is the simplest migration — standard OAuth 2.0 redirect flow, no PKCE, no OIDC.

#### Step 1.1: Install Arctic
```bash
cd packages/kandi-login
npm install arctic
```

#### Step 1.2: Rewrite `providers/facebook.ts`

**Before** (~87 LOC):
```typescript
// Manual URL construction
export function buildFacebookAuthUrl(credentials, params) {
  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id", credentials.appId);
  // ... 10 more lines
}

// Manual code exchange
export async function exchangeFacebookCode(credentials, code, redirectUri) {
  const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  const response = await fetch(url, { method: "POST", body: ... });
  // ... 15 more lines
}

// Manual profile fetch
export async function fetchFacebookProfile(accessToken) {
  const url = new URL("https://graph.facebook.com/v19.0/me");
  // ... 15 more lines
}
```

**After** (~45 LOC):
```typescript
import * as arctic from "arctic";

let facebookClient: arctic.Facebook | null = null;

export function getFacebookClient(appId: string, appSecret: string, redirectUri: string) {
  if (!facebookClient) {
    facebookClient = new arctic.Facebook(appId, appSecret, redirectUri);
  }
  return facebookClient;
}

export function buildFacebookAuthUrl(
  client: arctic.Facebook,
  state: string,
): string {
  const url = client.createAuthorizationURL(state, ["email", "public_profile"]);
  return url.toString();
}

export async function exchangeFacebookCode(
  client: arctic.Facebook,
  code: string,
): Promise<string> {
  const tokens = await client.validateAuthorizationCode(code);
  return tokens.accessToken();
}

// Profile fetch stays manual — Arctic doesn't fetch user profiles
export async function fetchFacebookProfile(accessToken: string): Promise<OAuthProfile> {
  const url = new URL("https://graph.facebook.com/v19.0/me");
  url.searchParams.set("fields", "id,email,name,picture.type(large)");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url);
  const data = await response.json();
  return {
    provider: "facebook",
    providerUserId: data.id,
    email: data.email,
    name: data.name,
    avatarUrl: data.picture?.data?.url ?? null,
    emailVerified: true,
  };
}
```

**Error handling note**: Facebook returns non-RFC-compliant error responses. Arctic throws `UnexpectedErrorResponseBodyError` instead of `OAuth2RequestError`. Catch both:
```typescript
try {
  const tokens = await client.validateAuthorizationCode(code);
} catch (e) {
  if (e instanceof arctic.OAuth2RequestError) { /* standard error */ }
  if (e instanceof arctic.UnexpectedErrorResponseBodyError) { /* Facebook quirk */ }
  throw e;
}
```

#### Step 1.3: Update `create-auth-server.ts` Facebook references

Change the `handleLogin` Facebook branch:
```typescript
// Before
const authUrl = buildFacebookAuthUrl(config.providers.facebook, { redirectUri, state });

// After
const client = getFacebookClient(
  config.providers.facebook.appId,
  config.providers.facebook.appSecret,
  redirectUri
);
const authUrl = buildFacebookAuthUrl(client, stateToken);
```

Change the `handleCallback` Facebook branch:
```typescript
// Before
const { accessToken } = await exchangeFacebookCode(config.providers.facebook, code, redirectUri);

// After
const client = getFacebookClient(
  config.providers.facebook.appId,
  config.providers.facebook.appSecret,
  redirectUri
);
const accessToken = await exchangeFacebookCode(client, code);
```

#### Step 1.4: Verify
- `npm run build` — zero errors
- `npx tsc --noEmit` — zero type errors
- Test Facebook login flow end-to-end against reference server

### Phase 2: Hello.coop migration via OAuth2Client

More complex because Hello.coop is not a built-in Arctic provider and has custom features (provider_hint, nonce in authorize URL).

#### Step 2.1: Rewrite `providers/hellocoop.ts`

**Before** (~103 LOC): Manual URL construction, manual code exchange via `fetch()`.

**After** (~65 LOC):
```typescript
import * as arctic from "arctic";

let hellocoopClient: arctic.OAuth2Client | null = null;

const HELLOCOOP_AUTH_URL = "https://wallet.hello.coop/authorize";
const HELLOCOOP_TOKEN_URL = "https://wallet.hello.coop/oauth/token";
const HELLOCOOP_USERINFO_URL = "https://wallet.hello.coop/oauth/userinfo";

export function getHelloCoopClient(clientId: string, redirectUri: string) {
  if (!hellocoopClient) {
    // Hello.coop is a public client — no client_secret needed for auth URL,
    // but token exchange may need client_id in body.
    hellocoopClient = new arctic.OAuth2Client(clientId, null, redirectUri);
  }
  return hellocoopClient;
}

export function buildHelloCoopAuthUrl(
  client: arctic.OAuth2Client,
  params: { state: string; nonce: string; scopes?: string; providerHint?: string },
): string {
  const scopes = (params.scopes ?? "openid email profile picture").split(" ");
  const url = client.createAuthorizationURL(HELLOCOOP_AUTH_URL, params.state, scopes);
  url.searchParams.set("nonce", params.nonce);
  if (params.providerHint) {
    url.searchParams.set("provider_hint", params.providerHint);
  }
  return url.toString();
}

export async function exchangeHelloCoopCode(
  client: arctic.OAuth2Client,
  code: string,
): Promise<{ accessToken: string; idToken: string }> {
  const tokens = await client.validateAuthorizationCode(HELLOCOOP_TOKEN_URL, code, null);
  return {
    accessToken: tokens.accessToken(),
    idToken: tokens.idToken(),
  };
}

// Userinfo fetch stays manual
export async function fetchHelloCoopProfile(accessToken: string): Promise<OAuthProfile> {
  const response = await fetch(HELLOCOOP_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Hello.coop userinfo failed: ${response.status}`);
  const data = await response.json();
  return {
    provider: "hellocoop",
    providerUserId: data.sub,
    email: data.email,
    name: data.name ?? data.nickname,
    avatarUrl: data.picture ?? null,
    emailVerified: data.email_verified ?? false,
    raw: data,
  };
}
```

**Risk**: Arctic's `OAuth2Client` may not send `client_id` in the POST body for token exchange (some providers need it, some don't). If Hello.coop requires it and Arctic doesn't send it, we need to either:
- Patch the request by adding it to the body manually
- Fall back to manual `fetch()` for token exchange only

**Mitigation**: Test the token exchange against Hello.coop's sandbox before committing. If it fails, keep the manual `fetch()` for `exchangeHelloCoopCode()` only and use Arctic for auth URL building.

#### Step 2.2: Update `create-auth-server.ts` Hello.coop references

Similar pattern to Facebook — swap function calls to use the Arctic client instance.

#### Step 2.3: Verify
- Build and type-check clean
- Test Hello.coop login flow (with and without provider_hint)
- Test nonce is correctly passed through

### Phase 3: Add PKCE support

Currently not implemented. Arctic makes this trivial.

#### Step 3.1: Update Hello.coop flow with PKCE

```typescript
const codeVerifier = arctic.generateCodeVerifier();

// Store codeVerifier alongside state in the HMAC state token payload
const statePayload = {
  provider,
  returnUrl,
  nonce,
  clientType,
  codeVerifier,  // NEW
  exp: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
};

// Auth URL with PKCE
const url = client.createAuthorizationURLWithPKCE(
  HELLOCOOP_AUTH_URL,
  state,
  arctic.CodeChallengeMethod.S256,
  codeVerifier,
  scopes
);

// Callback — extract codeVerifier from state, pass to token exchange
const tokens = await client.validateAuthorizationCode(
  HELLOCOOP_TOKEN_URL,
  code,
  codeVerifier  // NOW USED
);
```

#### Step 3.2: Update state token format

Add `codeVerifier` to the HMAC state payload in `security.ts`. The state token already embeds metadata — this is a natural extension.

#### Step 3.3: Update Facebook flow with PKCE (optional)

Facebook doesn't require PKCE, but adding it improves security for public clients. Low priority.

### Phase 4: Future provider additions

With Arctic, adding a new provider becomes trivial:

```typescript
// Adding GitHub login (example)
import * as arctic from "arctic";

const github = new arctic.GitHub(clientId, clientSecret, redirectUri);
const url = github.createAuthorizationURL(state, ["user:email"]);
const tokens = await github.validateAuthorizationCode(code);
// Fetch profile from GitHub API...
```

Arctic supports 64 providers out of the box. Adding any of them requires ~20 LOC instead of ~80 LOC.

## Files Modified

| File | Change | Risk |
|---|---|---|
| `package.json` | Add `arctic` dependency | None |
| `providers/facebook.ts` | Rewrite to use `arctic.Facebook` | Low — straightforward mapping |
| `providers/hellocoop.ts` | Rewrite to use `arctic.OAuth2Client` | Medium — generic client, test token exchange |
| `providers/google.ts` | **No change** — native ID token flow, not redirect | None |
| `providers/apple.ts` | **No change** — native ID token flow, not redirect | None |
| `create-auth-server.ts` | Update provider instantiation and function calls | Medium — central file, careful refactoring |
| `security.ts` | Add `codeVerifier` to state payload (Phase 3) | Low |
| `types.ts` | Update `FacebookCredentials` if field names change | Low |

## Files NOT Modified

| File | Why |
|---|---|
| `jwt.ts` | kandi-login's own JWT signing — unrelated to Arctic |
| `encryption.ts` | Test persona encryption — unrelated |
| `test-personas.ts` | Test system — unrelated |
| `callback-handler.ts` | Legacy compat — may be removed separately |

## Dependencies

### Added
- `arctic@^3.7.0` (MIT) — brings in `@oslojs/crypto`, `@oslojs/encoding`, `@oslojs/jwt`

### Kept
- `jose` — still needed for Google/Apple native JWKS verification and kandi-login's own JWT signing

### Potential future removal
- Custom `fetch()` calls in provider modules — replaced by Arctic's built-in HTTP handling

## LOC Impact Estimate

| Area | Before | After | Delta |
|---|---|---|---|
| `providers/facebook.ts` | ~87 | ~45 | -42 |
| `providers/hellocoop.ts` | ~103 | ~65 | -38 |
| `providers/google.ts` | ~58 | ~58 | 0 |
| `providers/apple.ts` | ~76 | ~76 | 0 |
| `security.ts` (Phase 3) | ~93 | ~100 | +7 |
| **Total** | ~417 | ~344 | **-73** |

Net reduction of ~73 LOC while gaining:
- PKCE support
- Battle-tested OAuth implementation
- Easier future provider additions (64 providers available)
- Reduced maintenance surface for HTTP/token exchange logic

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Arctic's generic `OAuth2Client` doesn't send `client_id` in token exchange body | Medium | Test against Hello.coop sandbox. Fallback: manual fetch for token exchange only. |
| Facebook's non-RFC error responses | Low | Arctic documents this. Catch `UnexpectedErrorResponseBodyError`. |
| Node.js 18 Web Crypto polyfill | Low | kandi-login targets Node 18+. Add polyfill in server entry if needed. |
| Arctic breaking changes in minor versions | Low | Pin to `~3.7.0`. Arctic is stable and widely used. |
| `jose` and `@oslojs/jwt` overlap | None | Different purposes — jose for JWKS verification, oslojs/jwt for Arctic's internal use. |

## Verification Checklist

After each phase:
- [ ] `npm run build` — zero errors
- [ ] `npx tsc --noEmit` — zero type errors
- [ ] Facebook redirect login works end-to-end
- [ ] Hello.coop login works (with and without provider_hint)
- [ ] Google native login works (unchanged)
- [ ] Apple native login works (unchanged)
- [ ] Test personas still work
- [ ] Token refresh still works
- [ ] Token validation still works
- [ ] All www and api apps still build clean
