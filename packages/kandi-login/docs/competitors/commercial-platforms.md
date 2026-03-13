# Commercial / SaaS Authentication Platforms

Competitive analysis for kandi-login vs commercial auth platforms.

## Comparison Table

| Platform | Pricing Model | Free Tier | Server SDKs | Client/Mobile SDKs | Electron | Tauri | Built-in Test Tooling | Open Source | License |
|---|---|---|---|---|---|---|---|---|---|
| **kandi-login** | Free / OSS | Unlimited | 1 (Node.js) | 5 (Web, Electron, Tauri, iOS, Android) | Yes (native) | Yes (native) | Built-in test personas | Yes | MIT |
| **Auth0** | MAU-based | 25,000 MAU | Node, Python, Java, Go, Ruby, PHP, .NET, Laravel | React, Vue, Angular, JS SPA, iOS, Android, Flutter, React Native | Via SPA SDK | No | Dev tenant + manual test users | No | Proprietary |
| **Clerk** | MAU-based | 50,000 MAU | Node/Next.js, Ruby, Go, Python | React, Next.js, Remix, iOS, Android (v1 Feb 2026), Expo | No | Community plugin | Testing tokens, fake OTP for Playwright/Cypress | No | Proprietary |
| **Supabase Auth** | MAU-based (bundled) | 50,000 MAU | JS, Python, Go, Dart, Kotlin, Swift, C# | JS, React, Vue, Next.js, Flutter, Swift, Kotlin | Via JS SDK | Via JS SDK | None | Yes (GoTrue fork) | Apache 2.0 |
| **Firebase Auth** | MAU-based | 50,000 MAU | Node, Python, Java, Go, C#/.NET | JS, iOS, Android, Flutter, Unity, C++ | Via JS SDK | No | Local Auth Emulator with UI | Partial (client SDKs) | Proprietary |
| **Stytch** | MAU-based | 10,000 MAU | Node, Python, Ruby, Go, Java | JS, React, iOS, Android | No | No | Sandbox emails/phones, fixed test tokens | No | Proprietary |
| **WorkOS** | Connection-based + MAU | 1M MAU (User Mgmt) | Node, Python, Ruby, Go, Java, .NET | JS (AuthKit) | No | No | None | Partial (AuthKit) | Proprietary |
| **Descope** | MAU + tenant-based | 7,500 MAU | Node, Python, Java, Go, PHP, Ruby, .NET | React, Next.js, Vue, Angular, JS, Kotlin, Swift, React Native, Flutter | No | No | None | No | Proprietary |
| **FusionAuth** | Flat-rate tiers | Unlimited (Community) | Java, Node, Python, Ruby, Go, .NET, PHP | JS, React, Angular, Vue, iOS, Android, Flutter, React Native | Via web SDK | No | Kickstart JSON seeding | No (free Community, not OSS) | Proprietary |
| **Keycloak** | Free (self-hosted) | Unlimited | Java (native); REST API | No official SDKs (adapters deprecated 2022) | Via OIDC | Via OIDC | Test realms; JSON import/export | Yes | Apache 2.0 |

## Detailed Notes

### Auth0 (by Okta)

**Pricing**: MAU-based. Free at 25,000 MAU. Essentials, Professional, Enterprise tiers. Costs escalate significantly at scale -- commonly described as a "growth penalty." B2B-specific tier launched 2026.

**SDKs**: Broadest SDK coverage of any commercial platform. Official SDKs for React, Vue, Angular, vanilla JS (SPA), iOS (Swift), Android (Kotlin/Java), Flutter, React Native, Expo, plus extensive server coverage. No dedicated Electron or Tauri SDKs -- SPA SDK used in Electron webviews. Tauri requires manual OIDC integration.

**Test Tooling**: No built-in test personas. Testing relies on manual test users in dev tenants. Community-built "Auth0 Simulator" for local dev. E2E guides for Cypress/Playwright recommend programmatic login via `/oauth/token` with Resource Owner Password Grant -- a grant many orgs disable for security.

**vs kandi-login**: Far more server SDKs but lacks dedicated Electron/Tauri support. No built-in test persona system.

### Clerk

**Pricing**: Free for 50,000 monthly retained users. Pro at $25/month with $0.02/MAU beyond 10K. SAML/SSO available from Pro tier.

**SDKs**: Strong web framework coverage (React, Next.js, Remix, Gatsby, Expo). iOS and Android SDKs reached v1 in February 2026. No official Electron SDK. Tauri only via community plugin (`tauri-plugin-clerk`).

**Test Tooling**: `@clerk/testing` package with Playwright/Cypress helpers. Testing Tokens bypass bot detection. Fake emails (`+clerk_test`) and phones with fixed OTP (`424242`). Does NOT support OAuth-based sign-in in tests -- only email/password. No pre-built personas with roles.

**vs kandi-login**: Mobile SDKs are brand new. No Electron/Tauri support officially. Test support limited to web, cannot bypass OAuth flows.

### Supabase Auth

**Pricing**: Bundled with Supabase. Free: 50,000 MAU. Pro ($25/month): 100,000 MAU, then $0.00325/additional MAU -- cheapest per-MAU rate.

**SDKs**: JS, Flutter, Swift, Kotlin clients. Server: JS, Python, Go, Dart, C#. No dedicated React, Electron, or Tauri SDKs. Works in Electron/Tauri via JS client without dedicated support.

**Test Tooling**: None. No local emulator for auth. Developers create test users via API/dashboard.

**vs kandi-login**: Cheapest at scale, open source, but no desktop SDKs and zero test tooling. Auth is one component of a general-purpose platform.

### Firebase Auth

**Pricing**: Free for 50,000 MAU (email/social). Phone auth always paid ($0.01-$0.10/SMS). SAML/OIDC via Identity Platform adds $0.015/MAU after 50 free.

**SDKs**: Excellent breadth: JS, iOS, Android, Flutter, Unity, C++. Unique in supporting game engines. No dedicated Electron or Tauri SDKs.

**Test Tooling**: Best-in-class local emulator. Full local auth server with web UI for managing mock users. Supports mock third-party OAuth flows. `@firebase/rules-unit-testing` for Security Rules testing.

**vs kandi-login**: Strongest test emulator but it is a separate local process, not built-in SDK personas. No Electron/Tauri support. Vendor lock-in to Google Cloud.

### Stytch

**Pricing**: Free at 10,000 MAU (B2C and B2B). B2B free tier includes unlimited organizations and 5 SSO/SCIM connections.

**SDKs**: JS, React, iOS, Android (frontend). Node, Python, Ruby, Go, Java (backend). No Electron or Tauri.

**Test Tooling**: Strong sandbox system. Dedicated sandbox email (`sandbox@stytch.com`) and phone (`+10000000000`) with deterministic test tokens per auth method. Fixed tokens return specific success/error responses.

**vs kandi-login**: Sandbox values are the closest competitor concept to test personas, but they are fixed identities rather than configurable persona profiles. No desktop SDK support.

### WorkOS

**Pricing**: User Management free up to 1M MAU. Revenue from enterprise connections: $125/month per SSO or Directory Sync connection.

**SDKs**: Server-side focus: Node, Python, Ruby, Go, Java, .NET. AuthKit for React frontend. No mobile or desktop SDKs.

**vs kandi-login**: B2B enterprise focused, not multi-platform consumer auth. No mobile SDKs at all.

### Descope

**Pricing**: Free at 7,500 MAU / 10 tenants. Growth at $799/month for 25K MAU. Overages $0.05/MAU -- most expensive per-MAU.

**SDKs**: Broadest mobile coverage among SaaS: React, Next.js, Vue, Angular, Kotlin, Swift, React Native, Flutter. No Electron or Tauri.

**Test Tooling**: None documented.

**vs kandi-login**: Drag-and-drop workflow builder is unique. Strong mobile but no desktop. Most expensive, no test tooling.

### FusionAuth

**Pricing**: Flat-rate tiers (not per-MAU). Community edition free with unlimited users. Starter ~$3,300/year.

**SDKs**: JS, React, Angular, Vue, iOS, Android, Flutter, React Native (client). Java, Node, Python, Ruby, Go, .NET, PHP (server). No Electron or Tauri.

**Test Tooling**: Kickstart seeds instances with predefined JSON config including test users. Server-level, not SDK-integrated.

**vs kandi-login**: Unlimited free tier attractive. Kickstart conceptually related to test personas but operates at server level. Self-hostable. No desktop SDKs.

### Keycloak

**Pricing**: Completely free. Self-hosted only. Red Hat offers managed via RHSSO/RHBK.

**SDKs**: Weakest SDK story. Official client adapters deprecated in 2022. Developers use generic OIDC libraries. Server is Java-native with REST API.

**Test Tooling**: Import/export realms and users via JSON. Test realms. No personas or emulator.

**vs kandi-login**: Fully open source with all features included (Apache 2.0, CNCF incubating). But no modern client SDKs, significant ops overhead, no test personas.

## Sources

- Auth0 Pricing: auth0.com/pricing
- Auth0 SDK Libraries: auth0.com/docs/libraries
- Clerk Pricing: clerk.com/pricing
- Clerk iOS/Android v1: clerk.com/changelog/2026-02-10-ios-android-sdk-v1
- Clerk Testing: clerk.com/docs/testing/overview
- Supabase Pricing: supabase.com/pricing
- Firebase Auth Emulator: firebase.google.com/docs/emulator-suite/connect_auth
- Stytch Sandbox: stytch.com/docs/guides/testing/sandbox-values
- WorkOS Pricing: workos.com/pricing
- Descope Pricing: descope.com/pricing
- FusionAuth Pricing: fusionauth.io/pricing
- Keycloak: github.com/keycloak/keycloak
