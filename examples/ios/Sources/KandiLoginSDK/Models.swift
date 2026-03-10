// Models.swift
// KandiLoginSDK
//
// Copyright (c) KandiForge. All rights reserved.
// Licensed under the MIT License.

import Foundation

// MARK: - Configuration

public struct Provider: Sendable {
    public let id: String
    public let name: String

    public init(id: String, name: String) {
        self.id = id
        self.name = name
    }
}

public struct KandiLoginConfig: Sendable {
    public let authServerUrl: String
    public let callbackScheme: String
    public let providers: [Provider]

    public init(
        authServerUrl: String,
        callbackScheme: String,
        providers: [Provider]
    ) {
        self.authServerUrl = authServerUrl
        self.callbackScheme = callbackScheme
        self.providers = providers
    }
}

// MARK: - User

public struct KandiUser: Codable, Sendable, Equatable {
    public let id: String
    public let email: String
    public let name: String
    public let displayName: String?
    public let avatarUrl: String?
    public let role: String

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case name
        case displayName = "display_name"
        case avatarUrl = "avatar_url"
        case role
    }
}

// MARK: - Token Response

public struct TokenResponse: Codable, Sendable {
    public let accessToken: String
    public let refreshToken: String
    public let expiresIn: Int

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
    }
}

// MARK: - Seed Response

public struct SeedResponse: Codable, Sendable {
    public let success: Bool
    public let seeded: [SeededPersona]
}

public struct SeededPersona: Codable, Sendable {
    public let id: String
    public let name: String
    public let email: String
    public let role: String
}

// MARK: - Personas Response

public struct PersonasResponse: Codable, Sendable {
    public let personas: [Persona]
}

public struct Persona: Codable, Sendable, Identifiable {
    public let id: String
    public let name: String
    public let email: String
    public let role: String
}

// MARK: - Errors

public enum KandiLoginError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int, message: String)
    case authenticationCancelled
    case noCallbackURL
    case tokenNotFound
    case decodingError(Error)
    case networkError(Error)

    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode, let message):
            return "HTTP \(statusCode): \(message)"
        case .authenticationCancelled:
            return "Authentication was cancelled"
        case .noCallbackURL:
            return "No callback URL received"
        case .tokenNotFound:
            return "Token not found in callback"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}
