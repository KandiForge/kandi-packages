# Testing with kandi-login Test Personas

kandi-login includes a test persona system that lets automated tests bypass OAuth entirely. Instead of driving a browser through Google or Apple sign-in screens, your test suite calls a single endpoint, receives real JWT tokens, and proceeds directly to testing application logic.

**Key properties:**

- Test clients call `POST /test/login-as` with a persona ID and receive real JWT tokens
- No browser automation needed for authentication — tests focus on app logic
- Tokens are structurally identical to production (same HS256 JWTs, same claims, same TTL)
- Personas are created through the same `UserAdapter` code path as production users
- Built-in system administrator account and three additional roles out of the box

---

## How It Works

```
Your Test Suite                     kandi-login Server
     │                                    │
     │  POST /test/login-as               │
     │  { personaId: "admin-alex" }       │
     │ ──────────────────────────────────→ │
     │                                    │
     │  { access_token, refresh_token,    │
     │    expires_in, persona }           │
     │ ←────────────────────────────────── │
     │                                    │
     │  Use token in all subsequent       │
     │  requests as Authorization header  │
     └────────────────────────────────────┘
```

The server auto-seeds the persona into your database on the first `login-as` call if it does not already exist. You can also call `POST /test/seed` explicitly to pre-create all personas before your test suite runs.

---

## Default Personas

| Persona ID | Name | Role | Email | Use Case |
|---|---|---|---|---|
| `admin-alex` | Alex Admin | `admin` | alex@test.kandi.dev | Admin panel, user management, system settings |
| `designer-dana` | Dana Designer | `user` | dana@test.kandi.dev | Standard user flows, content creation |
| `viewer-val` | Val Viewer | `viewer` | val@test.kandi.dev | Read-only access, permission boundaries |
| `new-user-naya` | Naya Newbie | `user` | naya@test.kandi.dev | Onboarding, empty state, first-time UX |

---

## API Reference

### `POST /test/seed`

Seeds all personas into the database and generates encrypted tokens.

```json
// Request body (optional — omit to use defaults)
{ "personas": [{ "id": "custom", "name": "Custom User", "email": "custom@test.dev", "role": "user" }] }

// Response
{ "success": true, "seeded": [{ "id": "...", "email": "...", "name": "..." }], "skipped": ["admin-alex"], "total": 4 }
```

### `GET /test/personas`

Lists all available personas (no secrets exposed).

```json
// Response
{ "personas": [{ "id": "admin-alex", "name": "Alex Admin", "email": "alex@test.kandi.dev", "role": "admin", "hasTokens": true }] }
```

### `POST /test/login-as`

Signs fresh JWTs for a persona. Auto-seeds the persona if it does not exist yet.

```json
// Request
{ "personaId": "admin-alex" }

// Response
{ "access_token": "eyJ...", "refresh_token": "eyJ...", "expires_in": 3600, "persona": { "id": "admin-alex", "name": "Alex Admin", "email": "alex@test.kandi.dev", "role": "admin" } }
```

---

## Environment Setup

Every test environment needs one variable pointing to the auth server:

```env
TEST_AUTH_SERVER=https://api.packages.kandiforge.com

# Or if you run your own kandi-login server:
# TEST_AUTH_SERVER=http://localhost:3001
```

The server must have `enableTestPersonas: true` in its configuration. This is typically gated on `NODE_ENV`:

```ts
const auth = createAuthServer({
  // ...
  enableTestPersonas: process.env.NODE_ENV !== 'production',
});
```

---

## Web Client Tests

### 1. Playwright (TypeScript)

Playwright is the recommended E2E framework for web clients. The pattern is straightforward: fetch a token before tests run, then inject it into the browser context.

#### Global Setup

Create a file at `tests/global-setup.ts`:

```ts
import type { FullConfig } from '@playwright/test';

const AUTH_SERVER = process.env.TEST_AUTH_SERVER ?? 'http://localhost:3001';

async function globalSetup(config: FullConfig) {
  // Seed all personas once for the entire test run
  const res = await fetch(`${AUTH_SERVER}/test/seed`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Failed to seed test personas: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  console.log(`Seeded ${data.seeded.length} personas, skipped ${data.skipped.length}`);
}

export default globalSetup;
```

Register it in `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: require.resolve('./tests/global-setup'),
  use: {
    baseURL: 'http://localhost:3000',
  },
});
```

#### Helper: Login as Persona

Create a reusable helper at `tests/helpers/auth.ts`:

```ts
const AUTH_SERVER = process.env.TEST_AUTH_SERVER ?? 'http://localhost:3001';

export interface PersonaTokens {
  access_token: string;
  refresh_token: string;
  persona: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export async function loginAsPersona(personaId: string): Promise<PersonaTokens> {
  const res = await fetch(`${AUTH_SERVER}/test/login-as`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personaId }),
  });

  if (!res.ok) {
    throw new Error(`login-as failed for "${personaId}": ${res.status} ${await res.text()}`);
  }

  return res.json();
}
```

#### Example: Inject Token and Test a Protected Page

```ts
import { test, expect } from '@playwright/test';
import { loginAsPersona } from './helpers/auth';

test.describe('Dashboard', () => {
  test('admin can access the admin panel', async ({ page }) => {
    const { access_token, refresh_token } = await loginAsPersona('admin-alex');

    // Inject tokens into localStorage before navigating
    await page.addInitScript(({ accessToken, refreshToken }) => {
      localStorage.setItem('kandi_login_access_token', accessToken);
      localStorage.setItem('kandi_login_refresh_token', refreshToken);
    }, { accessToken: access_token, refreshToken: refresh_token });

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible();
  });

  test('viewer cannot access the admin panel', async ({ page }) => {
    const { access_token, refresh_token } = await loginAsPersona('viewer-val');

    await page.addInitScript(({ accessToken, refreshToken }) => {
      localStorage.setItem('kandi_login_access_token', accessToken);
      localStorage.setItem('kandi_login_refresh_token', refreshToken);
    }, { accessToken: access_token, refreshToken: refresh_token });

    await page.goto('/admin');
    await expect(page.getByText('Access denied')).toBeVisible();
  });
});
```

#### Example: Test Role-Based Navigation

```ts
import { test, expect } from '@playwright/test';
import { loginAsPersona } from './helpers/auth';

const personas = ['admin-alex', 'designer-dana', 'viewer-val'] as const;

for (const personaId of personas) {
  test(`${personaId} sees correct navigation items`, async ({ page }) => {
    const { access_token, refresh_token, persona } = await loginAsPersona(personaId);

    await page.addInitScript(({ accessToken, refreshToken }) => {
      localStorage.setItem('kandi_login_access_token', accessToken);
      localStorage.setItem('kandi_login_refresh_token', refreshToken);
    }, { accessToken: access_token, refreshToken: refresh_token });

    await page.goto('/dashboard');

    // All roles see the dashboard
    await expect(page.getByRole('navigation')).toBeVisible();

    if (persona.role === 'admin') {
      await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'User Management' })).toBeVisible();
    } else {
      await expect(page.getByRole('link', { name: 'User Management' })).not.toBeVisible();
    }
  });
}
```

---

### 2. Cypress (TypeScript)

#### Setup: Register a Task for Token Fetching

In `cypress.config.ts`:

```ts
import { defineConfig } from 'cypress';

const AUTH_SERVER = process.env.TEST_AUTH_SERVER ?? 'http://localhost:3001';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      on('task', {
        async seedPersonas() {
          const res = await fetch(`${AUTH_SERVER}/test/seed`, { method: 'POST' });
          return res.json();
        },

        async loginAsPersona(personaId: string) {
          const res = await fetch(`${AUTH_SERVER}/test/login-as`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personaId }),
          });
          if (!res.ok) {
            throw new Error(`login-as failed: ${res.status}`);
          }
          return res.json();
        },
      });
    },
  },
});
```

#### Custom Command

In `cypress/support/commands.ts`:

```ts
interface PersonaTokens {
  access_token: string;
  refresh_token: string;
  persona: { id: string; name: string; email: string; role: string };
}

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsPersona(personaId: string): Chainable<PersonaTokens>;
    }
  }
}

Cypress.Commands.add('loginAsPersona', (personaId: string) => {
  cy.task<PersonaTokens>('loginAsPersona', personaId).then((data) => {
    window.localStorage.setItem('kandi_login_access_token', data.access_token);
    window.localStorage.setItem('kandi_login_refresh_token', data.refresh_token);
    return data;
  });
});
```

In `cypress/support/e2e.ts`:

```ts
import './commands';

before(() => {
  cy.task('seedPersonas');
});
```

#### Example: Bypass Login and Test Dashboard

```ts
describe('Dashboard', () => {
  it('loads dashboard for authenticated user', () => {
    cy.loginAsPersona('designer-dana');
    cy.visit('/dashboard');
    cy.contains('Welcome, Dana Designer').should('be.visible');
    cy.get('[data-testid="project-list"]').should('exist');
  });

  it('admin sees management controls', () => {
    cy.loginAsPersona('admin-alex');
    cy.visit('/dashboard');
    cy.get('[data-testid="admin-controls"]').should('be.visible');
    cy.contains('User Management').should('exist');
  });

  it('viewer sees read-only mode', () => {
    cy.loginAsPersona('viewer-val');
    cy.visit('/dashboard');
    cy.get('[data-testid="edit-button"]').should('not.exist');
    cy.contains('Read-only').should('be.visible');
  });
});
```

#### Example: Test API Calls Through the UI

```ts
describe('API integration', () => {
  it('creates a project as a standard user', () => {
    cy.loginAsPersona('designer-dana');
    cy.visit('/projects/new');

    cy.get('input[name="name"]').type('My Test Project');
    cy.get('textarea[name="description"]').type('A project created in Cypress');
    cy.get('button[type="submit"]').click();

    cy.url().should('match', /\/projects\/[a-z0-9-]+/);
    cy.contains('My Test Project').should('be.visible');
  });
});
```

---

### 3. Vitest / Jest (TypeScript)

For unit and integration tests that call APIs directly or test React components in isolation.

#### Setup: Fetch Tokens in `beforeAll`

```ts
import { describe, it, expect, beforeAll } from 'vitest';

const AUTH_SERVER = process.env.TEST_AUTH_SERVER ?? 'http://localhost:3001';

describe('Project API', () => {
  let adminToken: string;
  let userToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    // Seed personas
    await fetch(`${AUTH_SERVER}/test/seed`, { method: 'POST' });

    // Get tokens for each role
    const [adminRes, userRes, viewerRes] = await Promise.all([
      fetch(`${AUTH_SERVER}/test/login-as`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: 'admin-alex' }),
      }),
      fetch(`${AUTH_SERVER}/test/login-as`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: 'designer-dana' }),
      }),
      fetch(`${AUTH_SERVER}/test/login-as`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: 'viewer-val' }),
      }),
    ]);

    adminToken = (await adminRes.json()).access_token;
    userToken = (await userRes.json()).access_token;
    viewerToken = (await viewerRes.json()).access_token;
  });

  it('admin can list all users', async () => {
    const res = await fetch('http://localhost:3000/api/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.users).toBeDefined();
    expect(data.users.length).toBeGreaterThan(0);
  });

  it('standard user cannot list all users', async () => {
    const res = await fetch('http://localhost:3000/api/users', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('viewer can read but not write', async () => {
    const read = await fetch('http://localhost:3000/api/projects', {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    expect(read.status).toBe(200);

    const write = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${viewerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Should Fail' }),
    });
    expect(write.status).toBe(403);
  });
});
```

#### Example: Mock AuthProvider with Persona Data

For React component tests where you do not need a running server:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll } from 'vitest';
import { AuthProvider } from 'kandi-login';
import { Dashboard } from '../src/components/Dashboard';

const AUTH_SERVER = process.env.TEST_AUTH_SERVER ?? 'http://localhost:3001';

describe('Dashboard component', () => {
  let adminToken: string;
  let adminEmail: string;

  beforeAll(async () => {
    const res = await fetch(`${AUTH_SERVER}/test/login-as`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId: 'admin-alex' }),
    });
    const data = await res.json();
    adminToken = data.access_token;
    adminEmail = data.persona.email;
  });

  it('renders admin dashboard with user info', () => {
    // Pre-populate localStorage so AuthProvider picks up the token
    localStorage.setItem('kandi_login_access_token', adminToken);

    render(
      <AuthProvider config={{ authServerUrl: AUTH_SERVER, providers: [] }}>
        <Dashboard />
      </AuthProvider>,
    );

    expect(screen.getByText(/Alex Admin/)).toBeDefined();
  });
});
```

---

## iOS Client Tests

### 4. XCTest / XCUITest (Swift)

#### Helper: Fetch Persona Token

Create a test helper in your test target:

```swift
// Tests/Helpers/TestPersona.swift

import Foundation

struct PersonaResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
    let persona: PersonaInfo

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
        case persona
    }

    struct PersonaInfo: Decodable {
        let id: String
        let name: String
        let email: String
        let role: String
    }
}

enum TestPersona {
    static let authServer = ProcessInfo.processInfo.environment["TEST_AUTH_SERVER"]
        ?? "http://localhost:3001"

    static func seedPersonas() async throws {
        var request = URLRequest(url: URL(string: "\(authServer)/test/seed")!)
        request.httpMethod = "POST"
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw NSError(domain: "TestPersona", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "Failed to seed personas"])
        }
    }

    static func loginAs(_ personaId: String) async throws -> PersonaResponse {
        var request = URLRequest(url: URL(string: "\(authServer)/test/login-as")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["personaId": personaId])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw NSError(domain: "TestPersona", code: 2,
                          userInfo: [NSLocalizedDescriptionKey: "login-as failed for \(personaId)"])
        }

        return try JSONDecoder().decode(PersonaResponse.self, from: data)
    }
}
```

#### Example: Inject Token into Keychain

```swift
// Tests/Helpers/KeychainTestHelper.swift

import Foundation
import Security

enum KeychainTestHelper {
    static func store(token: String, forKey key: String, service: String) {
        let data = token.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
        ]
        // Delete existing entry first
        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        precondition(status == errSecSuccess, "Keychain store failed: \(status)")
    }

    static func clear(service: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
```

#### XCTest: Unit/Integration Test

```swift
// Tests/AuthenticatedAPITests.swift

import XCTest

final class AuthenticatedAPITests: XCTestCase {
    static var adminToken: String!
    static var viewerToken: String!

    override class func setUp() {
        super.setUp()
        let expectation = XCTestExpectation(description: "Seed and login")

        Task {
            try await TestPersona.seedPersonas()

            let admin = try await TestPersona.loginAs("admin-alex")
            adminToken = admin.accessToken

            let viewer = try await TestPersona.loginAs("viewer-val")
            viewerToken = viewer.accessToken

            expectation.fulfill()
        }

        _ = XCTWaiter.wait(for: [expectation], timeout: 10.0)
    }

    func testAdminCanFetchUsers() async throws {
        var request = URLRequest(url: URL(string: "http://localhost:3000/api/users")!)
        request.setValue("Bearer \(Self.adminToken!)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        let http = response as! HTTPURLResponse
        XCTAssertEqual(http.statusCode, 200)

        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        XCTAssertNotNil(json["users"])
    }

    func testViewerCannotDeleteUsers() async throws {
        var request = URLRequest(url: URL(string: "http://localhost:3000/api/users/some-id")!)
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(Self.viewerToken!)", forHTTPHeaderField: "Authorization")

        let (_, response) = try await URLSession.shared.data(for: request)
        let http = response as! HTTPURLResponse
        XCTAssertEqual(http.statusCode, 403)
    }
}
```

#### XCUITest: UI Test with Pre-Authenticated State

Pass the token as a launch argument so your app can detect the test environment and skip the login screen:

```swift
// UITests/DashboardUITests.swift

import XCTest

final class DashboardUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
    }

    func testAdminDashboard() async throws {
        let persona = try await TestPersona.loginAs("admin-alex")

        app.launchArguments += [
            "--test-access-token", persona.accessToken,
            "--test-refresh-token", persona.refreshToken,
        ]
        app.launch()

        // App reads launch arguments in AppDelegate/SceneDelegate and
        // stores them in the keychain, bypassing the login flow
        XCTAssertTrue(app.staticTexts["Admin Panel"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["User Management"].exists)
    }

    func testViewerDashboard() async throws {
        let persona = try await TestPersona.loginAs("viewer-val")

        app.launchArguments += [
            "--test-access-token", persona.accessToken,
            "--test-refresh-token", persona.refreshToken,
        ]
        app.launch()

        XCTAssertTrue(app.staticTexts["Dashboard"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["User Management"].exists)
    }
}
```

In your app code, handle the launch arguments:

```swift
// AppDelegate.swift or your startup logic

func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    #if DEBUG
    if let tokenIndex = CommandLine.arguments.firstIndex(of: "--test-access-token"),
       tokenIndex + 1 < CommandLine.arguments.count {
        let accessToken = CommandLine.arguments[tokenIndex + 1]
        let refreshIndex = CommandLine.arguments.firstIndex(of: "--test-refresh-token")!
        let refreshToken = CommandLine.arguments[refreshIndex + 1]

        KeychainHelper.store(accessToken, forKey: "access_token", service: "com.myapp.auth")
        KeychainHelper.store(refreshToken, forKey: "refresh_token", service: "com.myapp.auth")
    }
    #endif
    return true
}
```

---

### 5. Swift Testing (Swift 6)

Swift Testing uses `@Test` macros and `@Suite` for organization. The persona helper from Section 4 works identically.

```swift
// Tests/AuthTests.swift

import Testing
import Foundation

@Suite("Authenticated API Tests")
struct AuthTests {
    static var adminToken: String = ""
    static var viewerToken: String = ""

    init() async throws {
        // Swift Testing calls init for each test; use a static flag to seed once
        if Self.adminToken.isEmpty {
            try await TestPersona.seedPersonas()
            let admin = try await TestPersona.loginAs("admin-alex")
            Self.adminToken = admin.accessToken
            let viewer = try await TestPersona.loginAs("viewer-val")
            Self.viewerToken = viewer.accessToken
        }
    }

    @Test("Admin can list all users")
    func adminListsUsers() async throws {
        var request = URLRequest(url: URL(string: "http://localhost:3000/api/users")!)
        request.setValue("Bearer \(Self.adminToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        let http = try #require(response as? HTTPURLResponse)
        #expect(http.statusCode == 200)

        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        #expect(json["users"] != nil)
    }

    @Test("Viewer cannot modify resources")
    func viewerCannotWrite() async throws {
        var request = URLRequest(url: URL(string: "http://localhost:3000/api/projects")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(Self.viewerToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["name": "Should Fail"])

        let (_, response) = try await URLSession.shared.data(for: request)
        let http = try #require(response as? HTTPURLResponse)
        #expect(http.statusCode == 403)
    }

    @Test("Token refresh works for test personas", arguments: ["admin-alex", "designer-dana"])
    func tokenRefresh(personaId: String) async throws {
        let persona = try await TestPersona.loginAs(personaId)
        let authServer = TestPersona.authServer

        var request = URLRequest(url: URL(string: "\(authServer)/auth/refresh")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["refresh_token": persona.refreshToken])

        let (data, response) = try await URLSession.shared.data(for: request)
        let http = try #require(response as? HTTPURLResponse)
        #expect(http.statusCode == 200)

        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        #expect(json["access_token"] != nil)
        #expect(json["refresh_token"] != nil)
    }
}
```

---

## Android Client Tests

### 6. Espresso + JUnit (Kotlin)

#### Helper: Fetch Persona Token

```kotlin
// app/src/androidTest/java/com/myapp/test/TestPersona.kt

package com.myapp.test

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

@Serializable
data class PersonaInfo(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
)

@Serializable
data class PersonaResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    @SerialName("expires_in") val expiresIn: Int,
    val persona: PersonaInfo,
)

object TestPersona {
    private val client = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }
    private val authServer: String
        get() = System.getProperty("TEST_AUTH_SERVER", "http://10.0.2.2:3001")

    fun seedPersonas() {
        val request = Request.Builder()
            .url("$authServer/test/seed")
            .post("{}".toRequestBody("application/json".toMediaType()))
            .build()
        client.newCall(request).execute().use { response ->
            check(response.isSuccessful) { "Seed failed: ${response.code}" }
        }
    }

    fun loginAs(personaId: String): PersonaResponse {
        val body = """{"personaId":"$personaId"}"""
            .toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("$authServer/test/login-as")
            .post(body)
            .build()
        client.newCall(request).execute().use { response ->
            check(response.isSuccessful) { "login-as failed: ${response.code}" }
            val responseBody = response.body?.string()
                ?: throw IllegalStateException("Empty response")
            return json.decodeFromString(responseBody)
        }
    }
}
```

#### Helper: Inject Token into EncryptedSharedPreferences

```kotlin
// app/src/androidTest/java/com/myapp/test/AuthTestHelper.kt

package com.myapp.test

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object AuthTestHelper {
    fun injectTokens(context: Context, accessToken: String, refreshToken: String) {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        val prefs = EncryptedSharedPreferences.create(
            context,
            "kandi_login_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )

        prefs.edit()
            .putString("access_token", accessToken)
            .putString("refresh_token", refreshToken)
            .apply()
    }

    fun clearTokens(context: Context) {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        val prefs = EncryptedSharedPreferences.create(
            context,
            "kandi_login_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )

        prefs.edit().clear().apply()
    }
}
```

#### Espresso Test

```kotlin
// app/src/androidTest/java/com/myapp/test/DashboardTest.kt

package com.myapp.test

import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.myapp.ui.DashboardActivity
import org.junit.After
import org.junit.Before
import org.junit.BeforeClass
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DashboardTest {

    companion object {
        private lateinit var adminTokens: PersonaResponse
        private lateinit var viewerTokens: PersonaResponse

        @BeforeClass
        @JvmStatic
        fun seedPersonas() {
            TestPersona.seedPersonas()
            adminTokens = TestPersona.loginAs("admin-alex")
            viewerTokens = TestPersona.loginAs("viewer-val")
        }
    }

    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext

    @After
    fun tearDown() {
        AuthTestHelper.clearTokens(context)
    }

    @Test
    fun adminSeesManagementControls() {
        AuthTestHelper.injectTokens(context, adminTokens.accessToken, adminTokens.refreshToken)

        ActivityScenario.launch(DashboardActivity::class.java)

        onView(withText("Admin Panel")).check(matches(isDisplayed()))
        onView(withText("User Management")).check(matches(isDisplayed()))
    }

    @Test
    fun viewerSeesReadOnlyMode() {
        AuthTestHelper.injectTokens(context, viewerTokens.accessToken, viewerTokens.refreshToken)

        ActivityScenario.launch(DashboardActivity::class.java)

        onView(withText("Dashboard")).check(matches(isDisplayed()))
        onView(withText("Read-only")).check(matches(isDisplayed()))
    }
}
```

---

### 7. Compose UI Test (Kotlin)

For Jetpack Compose apps, provide a pre-authenticated state through dependency injection rather than shared preferences.

#### Test with Compose Test Rule

```kotlin
// app/src/androidTest/java/com/myapp/test/ComposeDashboardTest.kt

package com.myapp.test

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.myapp.auth.AuthManager
import com.myapp.auth.AuthState
import com.myapp.auth.UserInfo
import com.myapp.ui.DashboardScreen
import org.junit.BeforeClass
import org.junit.Rule
import org.junit.Test

class ComposeDashboardTest {

    companion object {
        private lateinit var adminTokens: PersonaResponse
        private lateinit var userTokens: PersonaResponse

        @BeforeClass
        @JvmStatic
        fun setup() {
            TestPersona.seedPersonas()
            adminTokens = TestPersona.loginAs("admin-alex")
            userTokens = TestPersona.loginAs("designer-dana")
        }
    }

    @get:Rule
    val composeTestRule = createComposeRule()

    private fun createAuthState(tokens: PersonaResponse): AuthState {
        return AuthState(
            isAuthenticated = true,
            accessToken = tokens.accessToken,
            refreshToken = tokens.refreshToken,
            user = UserInfo(
                id = tokens.persona.id,
                name = tokens.persona.name,
                email = tokens.persona.email,
                role = tokens.persona.role,
            ),
        )
    }

    @Test
    fun adminDashboardShowsAllSections() {
        val authState = createAuthState(adminTokens)

        composeTestRule.setContent {
            DashboardScreen(authState = authState)
        }

        composeTestRule.onNodeWithText("Admin Panel").assertIsDisplayed()
        composeTestRule.onNodeWithText("User Management").assertIsDisplayed()
        composeTestRule.onNodeWithText("System Settings").assertIsDisplayed()
    }

    @Test
    fun userDashboardShowsStandardSections() {
        val authState = createAuthState(userTokens)

        composeTestRule.setContent {
            DashboardScreen(authState = authState)
        }

        composeTestRule.onNodeWithText("Dashboard").assertIsDisplayed()
        composeTestRule.onNodeWithText("My Projects").assertIsDisplayed()
        composeTestRule.onNodeWithText("User Management").assertDoesNotExist()
    }
}
```

#### Hilt-Based Compose Test

If your app uses Hilt for dependency injection, override the `AuthManager` binding:

```kotlin
// app/src/androidTest/java/com/myapp/test/HiltDashboardTest.kt

package com.myapp.test

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.myapp.auth.AuthManager
import com.myapp.ui.MainActivity
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Before
import org.junit.BeforeClass
import org.junit.Rule
import org.junit.Test
import javax.inject.Inject

@HiltAndroidTest
class HiltDashboardTest {

    companion object {
        private lateinit var adminTokens: PersonaResponse

        @BeforeClass
        @JvmStatic
        fun seedAll() {
            TestPersona.seedPersonas()
            adminTokens = TestPersona.loginAs("admin-alex")
        }
    }

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Inject
    lateinit var authManager: AuthManager

    @Before
    fun setup() {
        hiltRule.inject()
        // Inject the test token into the auth manager before the UI renders
        authManager.setTokens(adminTokens.accessToken, adminTokens.refreshToken)
    }

    @Test
    fun adminSeesFullDashboard() {
        composeRule.onNodeWithText("Admin Panel").assertIsDisplayed()
    }
}
```

---

## Desktop Client Tests

### 8. Playwright for Electron

Playwright has first-class Electron support via the `_electron` module.

#### Setup

```ts
// tests/electron.spec.ts

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';

const AUTH_SERVER = process.env.TEST_AUTH_SERVER ?? 'http://localhost:3001';

async function loginAsPersona(personaId: string) {
  const res = await fetch(`${AUTH_SERVER}/test/login-as`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personaId }),
  });
  if (!res.ok) throw new Error(`login-as failed: ${res.status}`);
  return res.json();
}

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  // Seed personas
  await fetch(`${AUTH_SERVER}/test/seed`, { method: 'POST' });
});

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});
```

#### Example: Launch Electron with Pre-Authenticated State

```ts
test('admin can access electron app settings', async () => {
  const { access_token, refresh_token } = await loginAsPersona('admin-alex');

  electronApp = await electron.launch({
    args: ['dist/main.js'],
    env: {
      ...process.env,
      TEST_ACCESS_TOKEN: access_token,
      TEST_REFRESH_TOKEN: refresh_token,
    },
  });

  page = await electronApp.firstWindow();

  // Wait for the app to initialize
  await page.waitForLoadState('domcontentloaded');

  // Alternatively, inject tokens via the Electron API exposed to the renderer
  await electronApp.evaluate(async ({ app }, tokens) => {
    // This runs in the main process
    const { BrowserWindow } = require('electron');
    const win = BrowserWindow.getAllWindows()[0];
    win.webContents.executeJavaScript(`
      window.electronAPI.secureStorage.set('access_token', '${tokens.access}');
      window.electronAPI.secureStorage.set('refresh_token', '${tokens.refresh}');
      window.dispatchEvent(new Event('auth-tokens-updated'));
    `);
  }, { access: access_token, refresh: refresh_token });

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

test('viewer cannot access settings in electron app', async () => {
  const { access_token, refresh_token } = await loginAsPersona('viewer-val');

  electronApp = await electron.launch({
    args: ['dist/main.js'],
    env: {
      ...process.env,
      TEST_ACCESS_TOKEN: access_token,
      TEST_REFRESH_TOKEN: refresh_token,
    },
  });

  page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByText('Settings')).not.toBeVisible();
  await expect(page.getByText('Dashboard')).toBeVisible();
});
```

In your Electron main process, detect the test tokens on startup:

```ts
// main.ts (Electron main process)

if (process.env.TEST_ACCESS_TOKEN) {
  // Store tokens so the renderer can pick them up
  const { safeStorage } = require('electron');
  const encrypted = safeStorage.encryptString(process.env.TEST_ACCESS_TOKEN);
  // Write to a known location your renderer reads on startup
}
```

---

### 9. WebDriver for Tauri

Tauri apps can be tested using `tauri-driver`, which implements the WebDriver protocol.

#### Prerequisites

Install `tauri-driver`:

```bash
cargo install tauri-driver
```

#### Setup with WebDriverIO

```ts
// wdio.conf.ts

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./tests/**/*.spec.ts'],
  capabilities: [{
    'tauri:options': {
      application: '../src-tauri/target/release/bundle/macos/MyApp.app',
    },
  }],
  services: [
    ['tauri', {
      tauriDriverPath: 'tauri-driver', // or full path to binary
    }],
  ],
  framework: 'mocha',
  reporters: ['spec'],
};
```

#### Helper: Login as Persona

```ts
// tests/helpers/auth.ts

const AUTH_SERVER = process.env.TEST_AUTH_SERVER ?? 'http://localhost:3001';

export async function loginAsPersona(personaId: string) {
  const res = await fetch(`${AUTH_SERVER}/test/login-as`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personaId }),
  });
  if (!res.ok) throw new Error(`login-as failed: ${res.status}`);
  return res.json();
}
```

#### Example: Inject Tokens via Tauri Commands

Your Tauri app exposes `store_token` and `get_token` commands. In tests, call them through the WebDriver `execute` function to inject tokens before the app checks authentication state:

```ts
// tests/dashboard.spec.ts

import { loginAsPersona } from './helpers/auth';

describe('Tauri Dashboard', () => {
  before(async () => {
    await fetch(`${process.env.TEST_AUTH_SERVER ?? 'http://localhost:3001'}/test/seed`, {
      method: 'POST',
    });
  });

  it('admin can access settings', async () => {
    const { access_token, refresh_token } = await loginAsPersona('admin-alex');

    // Inject tokens via Tauri's invoke system
    await browser.execute(async (accessToken: string, refreshToken: string) => {
      const { invoke } = (window as any).__TAURI__.core;
      await invoke('store_token', {
        service: 'com.myapp.auth',
        key: 'access_token',
        value: accessToken,
      });
      await invoke('store_token', {
        service: 'com.myapp.auth',
        key: 'refresh_token',
        value: refreshToken,
      });
      // Trigger re-check of auth state
      window.dispatchEvent(new Event('auth-tokens-updated'));
    }, access_token, refresh_token);

    // Wait for the app to react to the new tokens
    const settingsLink = await $('a=Settings');
    await settingsLink.waitForDisplayed({ timeout: 5000 });
    expect(await settingsLink.isDisplayed()).toBe(true);
  });

  it('viewer sees read-only interface', async () => {
    const { access_token, refresh_token } = await loginAsPersona('viewer-val');

    await browser.execute(async (accessToken: string, refreshToken: string) => {
      const { invoke } = (window as any).__TAURI__.core;
      await invoke('store_token', {
        service: 'com.myapp.auth',
        key: 'access_token',
        value: accessToken,
      });
      await invoke('store_token', {
        service: 'com.myapp.auth',
        key: 'refresh_token',
        value: refreshToken,
      });
      window.dispatchEvent(new Event('auth-tokens-updated'));
    }, access_token, refresh_token);

    const readOnly = await $('[data-testid="read-only-badge"]');
    await readOnly.waitForDisplayed({ timeout: 5000 });
    expect(await readOnly.isDisplayed()).toBe(true);

    const editButton = await $('[data-testid="edit-button"]');
    expect(await editButton.isExisting()).toBe(false);
  });
});
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml

name: Tests
on: [push, pull_request]

env:
  TEST_AUTH_SERVER: ${{ secrets.TEST_AUTH_SERVER }}

jobs:
  test-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e

  test-roles:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        persona: [admin-alex, designer-dana, viewer-val, new-user-naya]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Run tests for ${{ matrix.persona }}
        run: npm run test:api -- --persona=${{ matrix.persona }}
        env:
          TEST_PERSONA: ${{ matrix.persona }}

  test-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run XCTest suite
        run: |
          xcodebuild test \
            -scheme MyApp \
            -destination 'platform=iOS Simulator,name=iPhone 16' \
            TEST_AUTH_SERVER=${{ secrets.TEST_AUTH_SERVER }}

  test-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - name: Run instrumented tests
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          script: |
            ./gradlew connectedAndroidTest \
              -Pandroid.testInstrumentationRunnerArguments.TEST_AUTH_SERVER=${{ secrets.TEST_AUTH_SERVER }}
```

### Tips for CI

- **Seed once per job, not per test.** Use `beforeAll` / `@BeforeClass` / global setup to call `/test/seed` a single time.
- **Parallelize by role.** Use GitHub Actions matrix strategy to run tests for different personas in parallel.
- **Use repository secrets** for `TEST_AUTH_SERVER` to avoid hardcoding URLs in your workflow files.
- **Token expiry is not a concern in CI.** Access tokens last 1 hour, which is longer than any reasonable test suite. If your suite exceeds that, call `login-as` again in a new `beforeAll` block.

---

## Custom Personas

You can define your own personas when creating the auth server:

```ts
const auth = createAuthServer({
  // ...
  enableTestPersonas: true,
  testPersonas: [
    { id: 'qa-lead', name: 'QA Lead', email: 'qa@mycompany.com', role: 'admin' },
    { id: 'beta-tester', name: 'Beta User', email: 'beta@mycompany.com', role: 'user' },
    { id: 'free-tier', name: 'Free User', email: 'free@mycompany.com', role: 'free' },
    { id: 'suspended', name: 'Suspended User', email: 'suspended@mycompany.com', role: 'suspended' },
  ],
});
```

Custom personas replace the defaults entirely. If you want both, include the default IDs in your array.

---

## Security Notes

- Test persona endpoints only exist when `enableTestPersonas: true`. They are completely absent from the server when disabled.
- Never enable test personas in production. Gate on `NODE_ENV` or a dedicated flag.
- Even in development, test persona tokens are encrypted at rest using AES-256-GCM.
- Test personas use the `"test"` provider in the `UserAdapter`, so they are distinguishable from real OAuth users.
- The `/test/login-as` endpoint issues fresh JWTs on every call. There is no session reuse.
