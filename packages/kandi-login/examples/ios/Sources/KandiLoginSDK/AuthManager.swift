// AuthManager.swift
// KandiLoginSDK
//
// Copyright (c) KandiForge. All rights reserved.
// Licensed under the MIT License.

import AuthenticationServices
import Foundation
import Observation

@Observable
@MainActor
public final class AuthManager {

    // MARK: - Observable State

    public private(set) var isAuthenticated: Bool = false
    public private(set) var currentUser: KandiUser?
    public private(set) var isLoading: Bool = false
    public private(set) var errorMessage: String?

    // MARK: - Dependencies

    private let client: KandiLoginClient
    private let tokenStorage: KeychainTokenStorage
    private let config: KandiLoginConfig

    // MARK: - Initialization

    public init(config: KandiLoginConfig) {
        self.config = config
        self.client = KandiLoginClient(authServerUrl: config.authServerUrl)
        self.tokenStorage = KeychainTokenStorage()
    }

    // MARK: - Public Methods

    /// Attempts to restore a previous session by validating the stored access token.
    public func restoreSession() async {
        guard let accessToken = tokenStorage.getAccessToken() else {
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let user = try await client.validateToken(accessToken)
            currentUser = user
            isAuthenticated = true
        } catch {
            // Token may be expired, try refreshing
            await refreshIfNeeded()
        }
    }

    /// Initiates the OAuth login flow for the given provider.
    public func login(
        provider: String,
        presentationContextProvider: ASWebAuthenticationPresentationContextProviding
    ) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let tokenResponse = try await client.login(
                provider: provider,
                callbackScheme: config.callbackScheme,
                presentationContextProvider: presentationContextProvider
            )

            tokenStorage.saveTokens(
                access: tokenResponse.accessToken,
                refresh: tokenResponse.refreshToken
            )

            let user = try await client.validateToken(tokenResponse.accessToken)
            currentUser = user
            isAuthenticated = true
        } catch let error as KandiLoginError {
            if case .authenticationCancelled = error {
                // User cancelled, no error to display
                return
            }
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Logs in as a test persona (for development use).
    public func loginAsPersona(_ personaId: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let tokenResponse = try await client.loginAs(personaId: personaId)

            tokenStorage.saveTokens(
                access: tokenResponse.accessToken,
                refresh: tokenResponse.refreshToken
            )

            let user = try await client.validateToken(tokenResponse.accessToken)
            currentUser = user
            isAuthenticated = true
        } catch let error as KandiLoginError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Logs out the current user.
    public func logout() async {
        isLoading = true
        defer { isLoading = false }

        if let accessToken = tokenStorage.getAccessToken() {
            try? await client.logout(accessToken: accessToken)
        }

        tokenStorage.clearTokens()
        currentUser = nil
        isAuthenticated = false
        errorMessage = nil
    }

    /// Refreshes the access token if a refresh token is available.
    public func refreshIfNeeded() async {
        guard let refreshToken = tokenStorage.getRefreshToken() else {
            await clearSession()
            return
        }

        do {
            let tokenResponse = try await client.refreshToken(refreshToken)

            tokenStorage.saveTokens(
                access: tokenResponse.accessToken,
                refresh: tokenResponse.refreshToken
            )

            let user = try await client.validateToken(tokenResponse.accessToken)
            currentUser = user
            isAuthenticated = true
        } catch {
            await clearSession()
        }
    }

    /// Seeds test personas on the auth server.
    public func seedTestPersonas() async throws -> SeedResponse {
        return try await client.seedTestPersonas()
    }

    /// Lists available test personas.
    public func listPersonas() async throws -> PersonasResponse {
        return try await client.listPersonas()
    }

    // MARK: - Private Helpers

    private func clearSession() async {
        tokenStorage.clearTokens()
        currentUser = nil
        isAuthenticated = false
    }
}
