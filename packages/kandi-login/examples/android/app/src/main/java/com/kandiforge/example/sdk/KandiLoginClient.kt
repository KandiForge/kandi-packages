// Copyright (c) KandiForge. MIT License.

package com.kandiforge.example.sdk

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

class KandiLoginClient(
    private val authServerUrl: String = "https://kandi-packages-api.vercel.app",
) {

    private val httpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val json: Json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    // MARK: - OAuth Login URL

    /**
     * Builds the OAuth login URL for the given provider. Open this in a Custom Chrome Tab.
     */
    fun buildLoginUrl(provider: String, callbackScheme: String): String {
        val returnUrl = "$callbackScheme://auth/callback"
        return "$authServerUrl/api/auth/login" +
            "?provider=$provider" +
            "&return_url=${java.net.URLEncoder.encode(returnUrl, "UTF-8")}" +
            "&client_type=desktop"
    }

    /**
     * Parses access and refresh tokens from the callback URI query parameters.
     */
    fun parseTokensFromCallback(uri: android.net.Uri): TokenResponse {
        val accessToken = uri.getQueryParameter("access_token")
            ?: throw KandiLoginException.TokenNotFound
        val refreshToken = uri.getQueryParameter("refresh_token")
            ?: throw KandiLoginException.TokenNotFound
        val expiresIn = uri.getQueryParameter("expires_in")?.toLongOrNull() ?: 3600L

        return TokenResponse(
            accessToken = accessToken,
            refreshToken = refreshToken,
            expiresIn = expiresIn,
        )
    }

    // MARK: - Token Validation

    /**
     * Validates an access token and returns the associated user.
     */
    suspend fun validateToken(token: String): KandiUser = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$authServerUrl/api/auth/validate")
            .get()
            .addHeader("Authorization", "Bearer $token")
            .build()

        executeRequest<KandiUser>(request)
    }

    // MARK: - Token Refresh

    /**
     * Refreshes an expired access token using a refresh token.
     */
    suspend fun refreshToken(refreshToken: String): TokenResponse =
        withContext(Dispatchers.IO) {
            val body = """{"refresh_token":"$refreshToken"}"""
                .toRequestBody(jsonMediaType)

            val request = Request.Builder()
                .url("$authServerUrl/api/auth/refresh")
                .post(body)
                .addHeader("Content-Type", "application/json")
                .build()

            executeRequest<TokenResponse>(request)
        }

    // MARK: - Logout

    /**
     * Logs out the current session on the server.
     */
    suspend fun logout(accessToken: String): Unit = withContext(Dispatchers.IO) {
        val body = "".toRequestBody(jsonMediaType)

        val request = Request.Builder()
            .url("$authServerUrl/api/auth/logout")
            .post(body)
            .addHeader("Authorization", "Bearer $accessToken")
            .build()

        val response = httpClient.newCall(request).execute()

        if (!response.isSuccessful) {
            val message = response.body?.string() ?: "Logout failed"
            throw KandiLoginException.HttpError(response.code, message)
        }
    }

    // MARK: - Test Endpoints

    /**
     * Seeds test personas on the auth server.
     */
    suspend fun seedTestPersonas(): SeedResponse = withContext(Dispatchers.IO) {
        val body = "".toRequestBody(jsonMediaType)

        val request = Request.Builder()
            .url("$authServerUrl/api/auth/test/seed")
            .post(body)
            .addHeader("Content-Type", "application/json")
            .build()

        executeRequest<SeedResponse>(request)
    }

    /**
     * Lists all available test personas.
     */
    suspend fun listPersonas(): PersonasResponse = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$authServerUrl/api/auth/test/personas")
            .get()
            .build()

        executeRequest<PersonasResponse>(request)
    }

    /**
     * Logs in as a specific test persona by ID.
     */
    suspend fun loginAs(personaId: String): TokenResponse = withContext(Dispatchers.IO) {
        val body = """{"persona_id":"$personaId"}"""
            .toRequestBody(jsonMediaType)

        val request = Request.Builder()
            .url("$authServerUrl/api/auth/test/login-as")
            .post(body)
            .addHeader("Content-Type", "application/json")
            .build()

        executeRequest<TokenResponse>(request)
    }

    // MARK: - Private Helpers

    private inline fun <reified T> executeRequest(request: Request): T {
        val response = try {
            httpClient.newCall(request).execute()
        } catch (e: IOException) {
            throw KandiLoginException.NetworkError(e)
        }

        val responseBody = response.body?.string()
            ?: throw KandiLoginException.InvalidResponse

        if (!response.isSuccessful) {
            throw KandiLoginException.HttpError(response.code, responseBody)
        }

        return try {
            json.decodeFromString<T>(responseBody)
        } catch (e: Exception) {
            throw KandiLoginException.DecodingError(e)
        }
    }
}

sealed class KandiLoginException(message: String) : Exception(message) {
    data object InvalidUrl : KandiLoginException("Invalid URL")
    data object InvalidResponse : KandiLoginException("Invalid response from server")
    data object AuthenticationCancelled : KandiLoginException("Authentication was cancelled")
    data object TokenNotFound : KandiLoginException("Token not found in callback")
    class HttpError(val statusCode: Int, val body: String) :
        KandiLoginException("HTTP $statusCode: $body")
    class DecodingError(cause: Exception) :
        KandiLoginException("Failed to decode response: ${cause.message}")
    class NetworkError(cause: IOException) :
        KandiLoginException("Network error: ${cause.message}")
}
