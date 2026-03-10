// TokenStorage.swift
// KandiLoginSDK
//
// Copyright (c) KandiForge. All rights reserved.
// Licensed under the MIT License.

import Foundation
import Security

public final class KeychainTokenStorage: Sendable {

    // MARK: - Properties

    private let service: String
    private let accessTokenKey = "com.kandiforge.accessToken"
    private let refreshTokenKey = "com.kandiforge.refreshToken"

    // MARK: - Initialization

    public init(service: String = "com.kandiforge.kandi-login") {
        self.service = service
    }

    // MARK: - Public Methods

    /// Saves both access and refresh tokens to the Keychain.
    public func saveTokens(access: String, refresh: String) {
        save(key: accessTokenKey, value: access)
        save(key: refreshTokenKey, value: refresh)
    }

    /// Retrieves the stored access token, or nil if not found.
    public func getAccessToken() -> String? {
        return load(key: accessTokenKey)
    }

    /// Retrieves the stored refresh token, or nil if not found.
    public func getRefreshToken() -> String? {
        return load(key: refreshTokenKey)
    }

    /// Removes all stored tokens from the Keychain.
    public func clearTokens() {
        delete(key: accessTokenKey)
        delete(key: refreshTokenKey)
    }

    // MARK: - Private Keychain Operations

    private func save(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }

        // Delete any existing item first
        delete(key: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]

        SecItemAdd(query as CFDictionary, nil)
    }

    private func load(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8)
        else {
            return nil
        }

        return value
    }

    private func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]

        SecItemDelete(query as CFDictionary)
    }
}
