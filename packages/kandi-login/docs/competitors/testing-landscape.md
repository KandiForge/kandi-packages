# Authentication Testing Landscape

How the industry handles auth testing, and where kandi-login's test persona approach wins.

## How Major Platforms Handle Testing

### Auth0
- No built-in sandbox mode. Teams create separate dev/staging/prod tenants manually.
- CLI `auth0 test login` and `auth0 test token` commands exist but are developer tools, not CI-friendly.
- E2E guide recommends programmatic login via `cy.request()` using Resource Owner Password Grant -- a grant many orgs disable for security.
- Community-built "Auth0 Simulator" exists for local dev (by Frontside).

### Clerk
- **Closest competitor to kandi-login's test approach.**
- `@clerk/testing` npm package with first-class Playwright and Cypress support.
- `setupClerkTestingToken({ page })` bypasses bot detection for automated browsers.
- `clerk.signIn()` helper signs in programmatically but still requires real credentials.
- Fake emails (`+clerk_test` subaddress) and phones verified with hardcoded OTP `424242`.
- **Limitation**: Does NOT support OAuth-based sign-in in tests -- only email/password. No role-based personas.
- Known [issue #7891](https://github.com/clerk/javascript/issues/7891) where `signIn()` times out with concurrent Playwright workers.

### Firebase
- **Gold standard local emulator.** Full local auth service with web UI for mock users.
- `initializeTestApp({ auth })` passes arbitrary auth claims to simulate any user.
- Emulator is local-only -- no "test mode" on production Firebase Auth.
- CI pipelines must spin up emulator as a service.
- No built-in personas.

### Supabase
- No dedicated test mode. Community [discussion #10298](https://github.com/orgs/supabase/discussions/10298) shows users requesting this.
- Workaround: `signInWithPassword()` with pre-seeded accounts or direct `auth.users` table inserts.
- `supabase_test_helpers` for database-level pgTAP tests only (not UI/E2E).
- Playwright pattern: authenticate via REST API, inject session into `localStorage`.

### Keycloak
- Test realms with pre-configured users exported/imported as JSON.
- Service accounts with `client_credentials` grant for machine-to-machine testing.
- Testcontainers for disposable Keycloak instances per test run.
- No bypass mechanism -- every test goes through a real OAuth flow.

## Common Testing Patterns

| Pattern | Description | Adoption | Drawbacks |
|---|---|---|---|
| **Programmatic login via API** | Call `/oauth/token` or `/login` directly, skip UI | Very common (Cypress best practice) | Requires Resource Owner Password Grant; many providers disable this |
| **Session/storage injection** | Auth once, save cookies/localStorage, reuse across tests | Playwright recommended (`storageState`) | State becomes stale; doesn't test auth flow |
| **Mock OAuth server** | Run oauth2-mock-server or mock-oauth2-server alongside app | Growing in CI/CD | Extra infrastructure; diverges from production |
| **Test tenants/realms** | Separate Auth0 tenant, Keycloak realm, or Firebase project | Enterprise standard | Tenant management overhead; environment drift |
| **Credentials provider in dev** | Auth.js: add `Credentials` provider gated on `NODE_ENV` | Common in Next.js | Security risk if gate leaks to prod; not real JWTs |
| **Route interception** | Playwright `page.route()` / Cypress `cy.intercept()` | Common for unit-level E2E | Server-side OAuth redirects cannot be intercepted |
| **Token generation utilities** | MockJwtIssuer, ASP.NET `user-jwts` tool | Backend testing | Synthetic tokens may not match production JWKS/claims |

## Test Framework Integration Status

| Framework | Platform | Auth Library Support |
|---|---|---|
| **Playwright** | Web | Clerk (`@clerk/testing/playwright`). No other auth library has a dedicated package. |
| **Cypress** | Web | Clerk (`@clerk/testing/cypress`). Auth0 has a guide but no package. |
| **XCTest / XCUITest** | iOS | **Nobody.** Testing OAuth requires driving the web view (fragile) or a test backdoor. |
| **Espresso** | Android | **Nobody.** Teams use Dagger + Mockito fakes or backend test login APIs. |
| **Playwright for Electron** | Desktop | No auth library support. |
| **WebDriver for Tauri** | Desktop | No auth library support. |

**Mobile and desktop are completely unserved.** This is kandi-login's largest opportunity.

## Developer Pain Points

1. **OAuth in E2E tests is the #1 pain point.** Spring Security [issue #6557](https://github.com/spring-projects/spring-security/issues/6557): "Unit testing controllers in apps secured with OAuth2 is commonly considered a painful task."

2. **Third-party login pages break automation.** Cypress best practices explicitly warn: never visit third-party sites -- they detect bots, enforce CAPTCHAs, ban automated accounts.

3. **Flaky tests from shared environments.** Shared staging auth servers cause random failures from rate limits, expired tokens, infrastructure changes.

4. **Mobile is especially painful.** [AppAuth-Android issue #492](https://github.com/openid/AppAuth-Android/issues/492) shows developers struggling to test OAuth intents with Espresso with no good solution.

5. **Role/persona testing requires manual setup.** No platform provides built-in personas with different permission levels. Teams manually create admin/editor/viewer users, seed databases, maintain credentials in CI secrets.

6. **Session state management is brittle.** Playwright's `storageState` requires careful maintenance -- tokens expire, cookie formats change, state files become stale.

7. **Mock servers diverge from production.** Teams running oauth2-mock-server gain speed but lose confidence that integration actually works with the real provider.

## kandi-login's Competitive Advantages

| Advantage | Why It Matters |
|---|---|
| **API key/secret bypass producing real JWTs** | Unlike Clerk (requires real credentials) or mock servers (synthetic tokens), kandi-login issues real, valid JWTs via API key -- no OAuth dance, no mock divergence |
| **Built-in personas with roles** | No competitor offers pre-configured role-based personas. Eliminates the "create admin, create viewer, seed database" ceremony |
| **Cross-framework coverage** | Clerk only supports Playwright + Cypress. Firebase/Supabase have zero test packages. Mobile is unserved by everyone. |
| **No infrastructure to manage** | Unlike Firebase Emulator (local process) or mock servers (Docker), API key bypass is stateless and works anywhere |
| **Eliminates flaky OAuth tests** | Deterministic bypass. No third-party login pages, CAPTCHAs, rate limits, or token expiry issues |
| **Parallel test support** | Stateless API key approach inherently supports concurrent Playwright workers (Clerk has a known timeout bug with this) |

## Competitive Positioning

| vs Competitor | kandi-login Message |
|---|---|
| vs Auth0 | No separate tenant needed. No Resource Owner Password Grant to enable. |
| vs Clerk | Works with OAuth flows, not just email/password. Works on mobile. No concurrent worker bugs. |
| vs Firebase Emulator | No local service to run. Real JWTs, not emulated ones. |
| vs Mock OAuth servers | Production-identical tokens. Zero infrastructure. |
| vs Everyone | First auth system with native mobile test framework support (XCTest + Espresso). |

## Sources

- Auth0 Community sandbox discussion: community.auth0.com/t/is-it-possible-to-use-a-sandbox/36382
- Auth0 CLI test token: auth0.github.io/auth0-cli/auth0_test_token.html
- Auth0 E2E with Cypress: auth0.com/blog/end-to-end-testing-with-cypress-and-auth0/
- Clerk Testing: clerk.com/docs/guides/development/testing/overview
- @clerk/testing: npmjs.com/package/@clerk/testing
- Clerk signIn timeout: github.com/clerk/javascript/issues/7891
- Firebase Auth Emulator: firebase.google.com/docs/emulator-suite/connect_auth
- Supabase test user discussion: github.com/orgs/supabase/discussions/10298
- Supabase Playwright pattern: mokkapps.de/blog/login-at-supabase-via-rest-api-in-playwright-e2e-test
- Playwright Auth: playwright.dev/docs/auth
- Cypress Best Practices: docs.cypress.io/app/core-concepts/best-practices
- Spring Security OAuth2 testing: github.com/spring-projects/spring-security/issues/6557
- AppAuth-Android Espresso: github.com/openid/AppAuth-Android/issues/492
- iOS OAuth testing: mobot.io/blog/how-to-test-oauth-sign-in-on-ios
- Espresso login patterns: repeato.app/optimizing-android-espresso-tests-reusing-login-credentials-across-tests/
- NextAuth test mode request: github.com/nextauthjs/next-auth/issues/7924
- oauth2-mock-server: github.com/axa-group/oauth2-mock-server
- mock-oauth2-server: github.com/navikt/mock-oauth2-server
