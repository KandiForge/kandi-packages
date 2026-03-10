// KandiLoginClient.swift
// KandiLoginSDK
//
// Copyright (c) KandiForge. All rights reserved.
// Licensed under the MIT License.

import AuthenticationServices
import Foundation

public final class KandiLoginClient: Sendable {

    // MARK: - Properties

    public let authServerUrl: String
    private let session: URLSession
    private let decoder: JSONDecoder

    // MARK: - Initialization

    public init(authServerUrl: String) {
        self.authServerUrl = authServerUrl
        self.session = URLSession.shared
        self.decoder = JSONDecoder()
    }

    // MARK: - OAuth Login

    /// Opens an ASWebAuthenticationSession to perform OAuth login with the given provider.
    /// Returns a `TokenResponse` extracted from the callback URL.
    @MainActor
    public func login(
        provider: String,
        callbackScheme: String,
        presentationContextProvider: ASWebAuthenticationPresentationContextProviding
    ) async throws -> TokenResponse {
        let loginPath = "/api/auth/login"
        let returnUrl = "\(callbackScheme)://auth/callback"

        guard var components = URLComponents(string: "\(authServerUrl)\(loginPath)") else {
            throw KandiLoginError.invalidURL
        }

        components.queryItems = [
            URLQueryItem(name: "provider", value: provider),
            URLQueryItem(name: "return_url", value: returnUrl),
            URLQueryItem(name: "client_type", value: "desktop"),
        ]

        guard let url = components.url else {
            throw KandiLoginError.invalidURL
        }

        let callbackURL: URL = try await withCheckedThrowingContinuation { continuation in
            let authSession = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: callbackScheme
            ) { callbackURL, error in
                if let error = error as? ASWebAuthenticationSessionError,
                   error.code == .canceledLogin
                {
                    continuation.resume(throwing: KandiLoginError.authenticationCancelled)
                    return
                }

                if let error {
                    continuation.resume(throwing: KandiLoginError.networkError(error))
                    return
                }

                guard let callbackURL else {
                    continuation.resume(throwing: KandiLoginError.noCallbackURL)
                    return
                }

                continuation.resume(returning: callbackURL)
            }

            authSession.presentationContextProvider = presentationContextProvider
            authSession.prefersEphemeralWebBrowserSession = false
            authSession.start()
        }

        return try parseTokensFromCallback(callbackURL)
    }

    // MARK: - Token Validation

    /// Validates an access token and returns the associated user.
    public func validateToken(_ token: String) async throws -> KandiUser {
        let url = try buildURL(path: "/api/auth/validate")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        return try await performRequest(request)
    }

    // MARK: - Token Refresh

    /// Refreshes an expired access token using a refresh token.
    public func refreshToken(_ refreshToken: String) async throws -> TokenResponse {
        let url = try buildURL(path: "/api/auth/refresh")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["refresh_token": refreshToken]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        return try await performRequest(request)
    }

    // MARK: - Logout

    /// Logs out the current session on the server.
    public func logout(accessToken: String) async throws {
        let url = try buildURL(path: "/api/auth/logout")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (_, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw KandiLoginError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw KandiLoginError.httpError(
                statusCode: httpResponse.statusCode,
                message: "Logout failed"
            )
        }
    }

    // MARK: - Test Endpoints

    /// Seeds test personas on the auth server.
    public func seedTestPersonas() async throws -> SeedResponse {
        let url = try buildURL(path: "/api/auth/test/seed")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        return try await performRequest(request)
    }

    /// Lists all available test personas.
    public func listPersonas() async throws -> PersonasResponse {
        let url = try buildURL(path: "/api/auth/test/personas")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        return try await performRequest(request)
    }

    /// Logs in as a specific test persona by ID.
    public func loginAs(personaId: String) async throws -> TokenResponse {
        let url = try buildURL(path: "/api/auth/test/login-as")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["persona_id": personaId]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        return try await performRequest(request)
    }

    // MARK: - Private Helpers

    private func buildURL(path: String) throws -> URL {
        guard let url = URL(string: "\(authServerUrl)\(path)") else {
            throw KandiLoginError.invalidURL
        }
        return url
    }

    private func performRequest<T: Decodable>(_ request: URLRequest) async throws -> T {
        let data: Data
        let response: URLResponse

        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw KandiLoginError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw KandiLoginError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw KandiLoginError.httpError(
                statusCode: httpResponse.statusCode,
                message: message
            )
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw KandiLoginError.decodingError(error)
        }
    }

    private func parseTokensFromCallback(_ url: URL) throws -> TokenResponse {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            throw KandiLoginError.noCallbackURL
        }

        let queryItems = components.queryItems ?? []
        let params = Dictionary(
            uniqueKeysWithValues: queryItems.compactMap { item in
                item.value.map { (item.name, $0) }
            }
        )

        guard let accessToken = params["access_token"],
              let refreshToken = params["refresh_token"]
        else {
            throw KandiLoginError.tokenNotFound
        }

        let expiresIn = params["expires_in"].flatMap { Int($0) } ?? 3600

        return TokenResponse(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: expiresIn
        )
    }
}
