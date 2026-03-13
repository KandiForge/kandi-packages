# Open-Source Authentication Libraries

Competitive analysis for kandi-login vs open-source auth libraries.

## Comparison Matrix

| Library | Stars | License | Language | Web SDK | React Native | iOS Native | Android Native | Electron | Tauri | Test Personas |
|---|---|---|---|---|---|---|---|---|---|---|
| **kandi-login** | -- | MIT | TypeScript | Yes (React) | No | Yes (Swift) | Yes (Kotlin) | Yes | Yes | **Yes** |
| **Auth.js** | 28k | ISC | TypeScript | Yes | No | No | No | No | No | No |
| **better-auth** | 27k | MIT | TypeScript | Yes | Yes (Expo) | No | No | Partial | No | No |
| **Lucia/Arctic/Oslo** | 25k/2k/1.5k | MIT | TypeScript | No (server only) | No | No | No | No | No | No |
| **Passport.js** | 23k | MIT | JavaScript | No (server only) | No | No | No | No | No | No |
| **Hanko** | 8.8k | AGPL v3 | Go | Yes (Web Components) | Roadmap | Roadmap | Roadmap | No | No | No |
| **Ory Kratos** | 13.2k | Apache 2.0 | Go | Auto-gen | Dart | Auto-gen | Auto-gen | Community | No | No |
| **Logto** | 11.4k | MPL-2.0 | TypeScript | Yes | Yes | Yes (Swift) | Yes (Kotlin) | No | No | No |
| **Casdoor** | 13.1k | Apache 2.0 | Go | Yes | Yes | Yes | Yes | Example | No | No |
| **SuperTokens** | 14.8k | Apache 2.0 | Java | Yes | Yes | Yes | Yes | No | No | No |
| **Zitadel** | 13k | AGPL-3.0 | Go | OIDC | Flutter | OIDC | OIDC | Documented | Documented | No |

## Detailed Notes

### Auth.js (NextAuth.js)

- **28k stars**, ISC license, TypeScript
- Framework-agnostic evolution of NextAuth.js (Next.js, SvelteKit, Express, SolidStart)
- Provider-based plugin system with 80+ OAuth providers built-in
- Purely server-side web framework integration -- no mobile, Electron, or Tauri SDKs
- No built-in test mode; community uses manual mocking
- The project now recommends better-auth for new projects

### better-auth

- **27k stars**, MIT license, TypeScript
- Closest competitor to kandi-login's scope
- Rich plugin ecosystem; 70+ features; MCP auth support
- Recently added Electron support, but has [open issue](https://github.com/better-auth/better-auth/issues/7149) where baseURL validation breaks with custom protocols needed for Electron and Tauri
- Expo/React Native support but no native Swift or Kotlin SDKs
- No Tauri-specific SDK
- Very active (600+ commits, 200 bug fixes in latest major release)

### Arctic + Oslo (by pilcrowonpaper)

- **Arctic**: 2k stars, MIT license -- lightweight OAuth 2.0 client library with 50+ providers
- **Oslo**: 1.5k stars, MIT license -- auth utility functions (hashing, tokens, TOTP)
- Zero dependencies, Fetch-based, runtime-agnostic, fully typed
- Lucia (25k stars) is deprecated as of March 2025, now a learning resource
- **High reuse value for kandi-login** (see Reuse Candidates below)

### Passport.js

- **23k stars**, MIT license, JavaScript
- Legacy standard for Node.js server auth with 480+ strategy plugins
- Callback-based, Express-coupled, no TypeScript-first approach
- Low recent activity; showing its age
- Server-only -- no client SDKs of any kind

### Hanko

- **8.8k stars**, AGPL v3, Go backend + TypeScript frontend
- Passkey-first architecture with customizable web components (Hanko Elements)
- No native mobile SDKs (on roadmap)
- No desktop SDKs
- AGPL license may be a concern for some use cases

### Ory (Kratos + Hydra)

- **Kratos 13.2k / Hydra 16k stars**, Apache 2.0, Go
- Enterprise-grade headless identity server (used by OpenAI)
- Kratos = identity management, Hydra = OAuth2/OIDC
- Auto-generated SDKs for JS, Go, Dart -- not polished purpose-built SDKs
- Requires building your own UI
- Highly configurable via JSON/YAML, OIDC-certified

### Logto

- **11.4k stars**, MPL-2.0, TypeScript core
- Broadest official SDK coverage in the open-source space: Web (React, Vue, Svelte, Next.js, Nuxt), iOS (Swift), Android (Kotlin), React Native, Go, Python, PHP, .NET
- OIDC/OAuth 2.1 compliant with social provider connectors
- Requires running the Logto backend (identity server model)
- No Electron or Tauri SDK
- Swift SDK updated as recently as March 2026

### Casdoor

- **13.1k stars**, Apache 2.0, Go backend
- Widest platform coverage including an Electron example
- 100+ identity providers, Casbin-based RBAC/ABAC, built-in billing
- SDKs are thin API clients around the Casdoor backend, not full SDKs
- IAM server model (like Auth0), not embeddable
- No Tauri SDK

### SuperTokens

- **14.8k stars**, Apache 2.0, Java core
- Recipe-based architecture for composable auth features
- Native iOS and Android SDKs alongside React Native
- Requires running a SuperTokens core server (Java)
- No Electron or Tauri SDK

### Zitadel

- **13k stars**, AGPL-3.0 (with Apache 2.0 exceptions), Go
- Full IAM with OIDC/OAuth2/SAML/SCIM/LDAP, multi-tenancy, event-sourced
- Documents support for Electron and Tauri but relies on standard OIDC libraries
- No purpose-built SDKs for desktop platforms

## Components kandi-login Could Reuse or Extend

### High-Value Reuse Candidates

| Component | What It Does | Why Reuse It |
|---|---|---|
| **Arctic** | 50+ OAuth provider implementations | Replace custom provider-specific OAuth flows in server SDK. MIT, zero deps, Fetch-based, fully typed. |
| **Oslo** | Password hashing, TOTP, JWT utils, crypto helpers | Replace or supplement custom utility code. MIT, zero deps, fully typed. |
| **AppAuth (iOS/Android)** | OpenID Foundation's official native OAuth SDKs | Wrap for OIDC protocol layer in native SDKs while adding kandi-specific features (personas, session sync). |

### Medium-Value References

| Component | Value |
|---|---|
| **better-auth plugin architecture** | Study for kandi-login's own extensibility model |
| **Ory's OpenAPI auto-gen SDK approach** | Could reduce SDK maintenance burden across platforms |
| **SuperTokens recipe pattern** | Good architectural reference for composable auth features |
| **Passport.js strategy interface** | Well-known pluggable strategy concept, useful architecturally |

## Ecosystem Gaps kandi-login Fills

1. **No library covers all 5 client platforms with purpose-built SDKs.** Logto is closest (Web + iOS + Android + RN) but has no Electron or Tauri. Casdoor has broad examples but thin wrappers. better-auth has buggy Electron, no Tauri.

2. **Built-in test personas for automated UI testing.** No open-source library provides this. Every alternative requires mock OAuth servers, WireMock stubs, manually constructed tokens, or disabling auth entirely.

3. **Tauri-specific auth SDK.** Zero dedicated support in the ecosystem despite Tauri's 35% YoY adoption growth after 2.0.

4. **Electron auth without pain.** better-auth has baseURL validation issues. Ory requires manual API integration. Casdoor has only an example app. No polished dedicated SDK exists.

5. **Unified auth across desktop + mobile + web with one server.** Most libraries are web-only (Auth.js, Passport, Lucia) or require a separate identity server (Ory, Logto, Casdoor, Zitadel, SuperTokens). kandi-login's 5-client-to-1-server model without a separate identity server is unique.

## Sources

- Auth.js: github.com/nextauthjs/next-auth
- better-auth: github.com/better-auth/better-auth
- better-auth Electron issue: github.com/better-auth/better-auth/issues/7149
- Lucia deprecation: github.com/lucia-auth/lucia/discussions/1707
- Arctic: github.com/pilcrowonpaper/arctic
- Oslo: github.com/pilcrowonpaper/oslo
- Passport.js: github.com/jaredhanson/passport
- Hanko: github.com/teamhanko/hanko
- Ory Kratos: github.com/ory/kratos
- Ory Hydra: github.com/ory/hydra
- Logto: github.com/logto-io/logto
- Logto Swift SDK: github.com/logto-io/swift
- Casdoor: github.com/casdoor/casdoor
- SuperTokens: github.com/supertokens/supertokens-core
- Zitadel: github.com/zitadel/zitadel
- AppAuth iOS: github.com/openid/AppAuth-iOS
- AppAuth Android: github.com/openid/AppAuth-Android
