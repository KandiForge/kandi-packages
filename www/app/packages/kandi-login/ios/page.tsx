'use client';

import { PlatformPage } from '@/components/PlatformPage';

export default function IOSPage() {
  return (
    <PlatformPage
      name="iOS (Swift)"
      slug="ios"
      color="#ff5346"
      status="Coming Soon"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
          <rect x="6" y="2" width="12" height="20" rx="3" />
          <circle cx="12" cy="18" r="1" />
          <path d="M9 2h6" />
        </svg>
      }
      description="Native iOS and macOS authentication using ASWebAuthenticationSession for OAuth and Keychain for secure token storage. Works with SwiftUI and UIKit."
      quickStartSteps={[
        {
          title: 'Clone the example project',
          code: 'git clone https://github.com/KandiForge/kandi-packages.git\ncd kandi-packages/examples/ios',
        },
        {
          title: 'Open in Xcode',
          code: 'open KandiLoginExample.xcodeproj',
        },
        {
          title: 'Build and run on a simulator or device',
        },
        {
          title: 'Tap "Login" — ASWebAuthenticationSession handles the OAuth flow natively',
        },
      ]}
      configSnippet={`// KandiAuthConfig.swift
import KandiLogin

let authConfig = KandiAuthConfig(
    authServerUrl: "https://api.packages.kandiforge.com",
    authBasePath: "/api/auth",
    providers: [.google, .github],
    // Tokens stored in Keychain
    keychainAccessGroup: "com.yourapp.shared"
)`}
      configLanguage="KandiAuthConfig.swift"
      switchServerNote={`// Change authServerUrl to your own server:
authServerUrl: "https://your-api.example.com"`}
      testFrameworks={['XCTest', 'XCUITest']}
      testSnippet={`// Tests/AuthTestSetup.swift
import XCTest
@testable import KandiLogin

class AuthTestSetup: XCTestCase {
    func authenticateAsPersona(_ personaId: String) async throws -> AuthTokens {
        let baseURL = URL(string: "https://your-api.example.com/api/auth")!

        // Seed personas (idempotent)
        var seedReq = URLRequest(url: baseURL.appendingPathComponent("test/seed"))
        seedReq.httpMethod = "POST"
        let _ = try await URLSession.shared.data(for: seedReq)

        // Get real JWT tokens — no ASWebAuthenticationSession needed
        var loginReq = URLRequest(url: baseURL.appendingPathComponent("test/login-as"))
        loginReq.httpMethod = "POST"
        loginReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
        loginReq.httpBody = try JSONEncoder().encode(["personaId": personaId])

        let (data, _) = try await URLSession.shared.data(for: loginReq)
        return try JSONDecoder().decode(AuthTokens.self, from: data)
    }
}`}
      testSnippetLanguage="Tests/AuthTestSetup.swift"
    />
  );
}
