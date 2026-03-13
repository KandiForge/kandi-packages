// Copyright (c) KandiForge. MIT License.

package com.kandiforge.example.sdk

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthManager(context: Context) {

    private val client = KandiLoginClient()
    private val tokenStorage = SecureTokenStorage(context)

    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated.asStateFlow()

    private val _currentUser = MutableStateFlow<KandiUser?>(null)
    val currentUser: StateFlow<KandiUser?> = _currentUser.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    val loginClient: KandiLoginClient get() = client

    // MARK: - Session Restore

    /**
     * Attempts to restore a previous session by validating the stored access token.
     */
    suspend fun restoreSession() {
        val accessToken = tokenStorage.getAccessToken() ?: return

        _isLoading.value = true
        try {
            val user = client.validateToken(accessToken)
            _currentUser.value = user
            _isAuthenticated.value = true
        } catch (_: Exception) {
            refreshIfNeeded()
        } finally {
            _isLoading.value = false
        }
    }

    // MARK: - Handle OAuth Callback

    /**
     * Processes the callback URI from the OAuth flow (Custom Chrome Tab redirect).
     */
    suspend fun handleCallback(uri: android.net.Uri) {
        _isLoading.value = true
        _errorMessage.value = null
        try {
            val tokenResponse = client.parseTokensFromCallback(uri)
            tokenStorage.saveTokens(
                access = tokenResponse.accessToken,
                refresh = tokenResponse.refreshToken,
            )
            val user = client.validateToken(tokenResponse.accessToken)
            _currentUser.value = user
            _isAuthenticated.value = true
        } catch (e: KandiLoginException.AuthenticationCancelled) {
            // User cancelled, no error to display
        } catch (e: KandiLoginException) {
            _errorMessage.value = e.message
        } catch (e: Exception) {
            _errorMessage.value = e.message
        } finally {
            _isLoading.value = false
        }
    }

    // MARK: - Test Persona Login

    /**
     * Logs in as a test persona (for development use).
     */
    suspend fun loginAsPersona(personaId: String) {
        _isLoading.value = true
        _errorMessage.value = null
        try {
            val tokenResponse = client.loginAs(personaId)
            tokenStorage.saveTokens(
                access = tokenResponse.accessToken,
                refresh = tokenResponse.refreshToken,
            )
            val user = client.validateToken(tokenResponse.accessToken)
            _currentUser.value = user
            _isAuthenticated.value = true
        } catch (e: KandiLoginException) {
            _errorMessage.value = e.message
        } catch (e: Exception) {
            _errorMessage.value = e.message
        } finally {
            _isLoading.value = false
        }
    }

    // MARK: - Logout

    /**
     * Logs out the current user.
     */
    suspend fun logout() {
        _isLoading.value = true
        try {
            val accessToken = tokenStorage.getAccessToken()
            if (accessToken != null) {
                try {
                    client.logout(accessToken)
                } catch (_: Exception) {
                    // Best-effort server logout
                }
            }
        } finally {
            tokenStorage.clearTokens()
            _currentUser.value = null
            _isAuthenticated.value = false
            _errorMessage.value = null
            _isLoading.value = false
        }
    }

    // MARK: - Refresh

    /**
     * Refreshes the access token if a refresh token is available.
     */
    suspend fun refreshIfNeeded() {
        val refreshToken = tokenStorage.getRefreshToken()
        if (refreshToken == null) {
            clearSession()
            return
        }

        try {
            val tokenResponse = client.refreshToken(refreshToken)
            tokenStorage.saveTokens(
                access = tokenResponse.accessToken,
                refresh = tokenResponse.refreshToken,
            )
            val user = client.validateToken(tokenResponse.accessToken)
            _currentUser.value = user
            _isAuthenticated.value = true
        } catch (_: Exception) {
            clearSession()
        }
    }

    // MARK: - Test Endpoints

    /**
     * Seeds test personas on the auth server.
     */
    suspend fun seedTestPersonas(): SeedResponse {
        return client.seedTestPersonas()
    }

    /**
     * Lists available test personas.
     */
    suspend fun listPersonas(): PersonasResponse {
        return client.listPersonas()
    }

    // MARK: - Private

    private fun clearSession() {
        tokenStorage.clearTokens()
        _currentUser.value = null
        _isAuthenticated.value = false
    }
}
