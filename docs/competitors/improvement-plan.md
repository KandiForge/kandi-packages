# kandi-login Improvement Plan

Based on competitive analysis of 19 commercial and open-source authentication platforms.

## Executive Summary

kandi-login has two genuinely unique differentiators that no competitor offers:
1. **Built-in test personas** with API key/secret bypass producing real JWTs
2. **5 purpose-built client SDKs** covering Web, Electron, Tauri, iOS, and Android from a single Node.js server

The improvement plan focuses on deepening these advantages, adopting battle-tested open-source components, and publishing dedicated test framework packages to own the "auth testing" category.

---

## Phase 1: Foundation Strengthening (Short-term)

### 1.1 Adopt Arctic for OAuth Provider Implementations
- **What**: Replace custom OAuth provider flows in the server SDK with [Arctic](https://github.com/pilcrowonpaper/arctic)
- **Why**: 50+ providers, MIT license, zero dependencies, Fetch-based, fully typed, actively maintained
- **Impact**: Reduces maintenance burden, adds provider coverage instantly, battle-tested code
- **Risk**: Low -- Arctic is a pure library with no runtime requirements

### 1.2 Adopt Oslo for Auth Utilities
- **What**: Use [Oslo](https://github.com/pilcrowonpaper/oslo) for password hashing, TOTP, JWT utilities, crypto helpers
- **Why**: MIT license, zero dependencies, fully typed, maintained by same author as Arctic
- **Impact**: Replaces custom utility code with well-tested implementations
- **Risk**: Low -- pure utility functions

### 1.3 Production Safety Guardrails for Test Personas
- **What**: Ensure test personas and API key bypass are architecturally impossible to enable in production
- **Why**: The Auth.js `NODE_ENV` gate pattern is known to leak. This is a security-critical feature.
- **How**:
  - Separate signing keys for test vs production JWTs
  - Environment binding (test persona endpoints only mount when `KANDI_TEST_MODE=true`)
  - Audit logging for all test persona logins
  - Server startup warning if test mode is enabled with production-like config
- **Impact**: Security credibility -- can market as "safe by design" vs the Auth.js credential provider anti-pattern

### 1.4 React Native Client SDK
- **What**: Add a 6th client SDK for React Native / Expo
- **Why**: better-auth, Logto, Casdoor, and SuperTokens all support React Native. It is the most-requested cross-platform mobile framework.
- **Impact**: Closes the biggest gap in platform coverage vs open-source competitors
- **Complexity**: Medium -- can share significant code with the Web SDK

---

## Phase 2: Own the Testing Category (Medium-term)

### 2.1 Publish Dedicated Test Framework Packages

This is the highest-leverage improvement. Clerk is the only competitor with test framework packages, and they only support Playwright + Cypress for web.

| Package | Framework | Platform | Priority |
|---|---|---|---|
| `@kandi-login/playwright` | Playwright | Web + Electron | P0 |
| `@kandi-login/cypress` | Cypress | Web | P0 |
| `@kandi-login/xctest` | XCTest / XCUITest | iOS | P1 |
| `@kandi-login/espresso` | Espresso / Compose UI Test | Android | P1 |
| `@kandi-login/vitest` | Vitest / Jest | Node.js | P2 |

**API design goal**: One-liner auth in tests:
```typescript
// Playwright
await kandiLogin.signInAs('admin');
await kandiLogin.signInAs('viewer');

// XCTest
let session = try await KandiLogin.signIn(as: .admin)

// Espresso
KandiLogin.signInAs("admin")
```

### 2.2 Customizable Personas with Arbitrary Claims
- **What**: Allow developers to define custom personas with arbitrary JWT claims (roles, permissions, org membership, subscription tier)
- **Why**: No competitor offers configurable personas. Teams need admin, editor, viewer, free-tier, premium, expired-subscription test accounts.
- **How**: Persona definition in server config:
  ```typescript
  personas: [
    { id: 'admin', name: 'Test Admin', role: 'admin', claims: { tier: 'enterprise' } },
    { id: 'viewer', name: 'Test Viewer', role: 'viewer', claims: { tier: 'free' } },
  ]
  ```
- **Impact**: Eliminates the "create admin, seed database, maintain CI secrets" ceremony across all platforms

### 2.3 Session State Export Helpers
- **What**: Output Playwright `storageState`-compatible JSON and Cypress `cy.session()`-compatible cookies
- **Why**: Teams with existing test suites can adopt kandi-login personas without refactoring
- **Impact**: Reduces adoption friction for teams migrating from manual auth mocking

### 2.4 Parallel Test Execution Documentation
- **What**: Document and test that kandi-login's stateless API key approach supports concurrent Playwright workers
- **Why**: Clerk has a [known bug (#7891)](https://github.com/clerk/javascript/issues/7891) where `signIn()` times out with parallel workers. This is a clear competitive advantage to highlight.
- **Impact**: Marketing + developer trust

---

## Phase 3: Ecosystem Growth (Longer-term)

### 3.1 Plugin/Extension Architecture
- **What**: Study better-auth's plugin system and implement a similar extensibility model
- **Why**: better-auth's plugin architecture is the fastest-growing pattern in the auth space (27k stars, 70+ plugins). Extensibility drives community adoption.
- **How**: Server-side plugin hooks for custom auth flows, custom token claims, custom user schema fields
- **Impact**: Community can extend kandi-login without forking

### 3.2 CI/CD Pipeline Templates
- **What**: Ready-to-copy configurations for GitHub Actions, GitLab CI, Azure DevOps, CircleCI
- **Why**: Biggest adoption driver for test tooling is "time to first green CI run"
- **How**: Template files + docs showing test persona setup in CI
- **Impact**: Removes the last friction point between "I want to use this" and "my tests pass in CI"

### 3.3 Conformance Test Suite as a Service
- **What**: Expand the validator page to be a hosted conformance test suite that integrators run against their own server
- **Why**: Validates that custom server implementations correctly implement the kandi-login protocol
- **Impact**: Quality assurance for the ecosystem; builds trust in third-party implementations

### 3.4 Consider AppAuth as Native SDK Foundation
- **What**: Evaluate wrapping [AppAuth-iOS](https://github.com/openid/AppAuth-iOS) and [AppAuth-Android](https://github.com/openid/AppAuth-Android) for OIDC protocol layer
- **Why**: OpenID Foundation's official implementation, widely trusted, handles edge cases
- **Trade-off**: Adds dependency vs rolling own OIDC. Evaluate after v1 stability.

### 3.5 OpenAPI Spec + Auto-generated SDKs
- **What**: Publish an OpenAPI spec for the kandi-login server API, explore auto-generating thin client SDKs for additional languages (Go, Python, Ruby, .NET)
- **Why**: Ory uses this pattern to cover many languages with low maintenance. Expands kandi-login's reach beyond the 5 hand-built SDKs.
- **Trade-off**: Auto-gen SDKs are less polished than hand-built. Use for secondary languages only.

---

## Competitive Positioning Strategy

### Primary Narrative
> "The only auth framework with built-in test personas across 5 platforms."

### Key Messages by Audience

| Audience | Message |
|---|---|
| **Web developers** | Drop-in React auth with one-liner test personas for Playwright/Cypress. No mock servers, no token juggling. |
| **Mobile developers** | Native Swift and Kotlin SDKs with XCTest/Espresso test helpers. No other auth library has this. |
| **Desktop developers** | First-class Electron and Tauri SDKs. Not "use the web SDK in a webview" -- actual platform integration with deep links and secure storage. |
| **QA/Test engineers** | `await kandiLogin.signInAs('admin')` -- works in Playwright, Cypress, XCTest, Espresso. Real JWTs, no infrastructure, parallel-safe. |
| **CTOs/Architects** | One Node.js server, 5 client SDKs, built-in test infrastructure. Replace Auth0's $X,000/month + your custom test harness with a free, open-source package. |

### Positioning Matrix

| Feature | Auth0 | Clerk | Firebase | Supabase | better-auth | kandi-login |
|---|---|---|---|---|---|---|
| Web SDK | Yes | Yes | Yes | Yes | Yes | **Yes** |
| Electron SDK | Via SPA | No | Via JS | Via JS | Buggy | **Native** |
| Tauri SDK | No | Community | No | No | No | **Native** |
| iOS SDK | Yes | New (Feb 2026) | Yes | Yes | No | **Yes** |
| Android SDK | Yes | New (Feb 2026) | Yes | Yes | No | **Yes** |
| Test Personas | No | Partial (web only) | Emulator | No | No | **Built-in** |
| Playwright Helper | No | Yes | No | No | No | **Planned** |
| XCTest Helper | No | No | No | No | No | **Planned** |
| Espresso Helper | No | No | No | No | No | **Planned** |
| Open Source | No | No | Partial | Yes | Yes | **Yes** |
| Self-hostable | No | No | No | Yes | Yes | **Yes** |

---

## Priority Summary

| Priority | Item | Impact | Effort |
|---|---|---|---|
| **P0** | Adopt Arctic + Oslo | High (stability + coverage) | Low |
| **P0** | Production safety guardrails | High (security credibility) | Medium |
| **P0** | `@kandi-login/playwright` package | Very High (category ownership) | Medium |
| **P0** | `@kandi-login/cypress` package | Very High (category ownership) | Medium |
| **P1** | Customizable personas with claims | High (differentiation) | Medium |
| **P1** | `@kandi-login/xctest` package | High (first-mover) | Medium |
| **P1** | `@kandi-login/espresso` package | High (first-mover) | Medium |
| **P1** | React Native SDK | High (platform coverage) | Medium |
| **P2** | CI/CD pipeline templates | Medium (adoption) | Low |
| **P2** | Session state export helpers | Medium (adoption) | Low |
| **P2** | Plugin architecture | High (ecosystem) | High |
| **P3** | Conformance test suite | Medium (quality) | High |
| **P3** | OpenAPI + auto-gen SDKs | Medium (reach) | Medium |
| **P3** | AppAuth evaluation | Medium (robustness) | Medium |
