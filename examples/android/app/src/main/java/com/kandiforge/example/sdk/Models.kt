// Copyright (c) KandiForge. MIT License.

package com.kandiforge.example.sdk

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class KandiUser(
    val id: String,
    val email: String,
    val name: String? = null,
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val role: String? = null,
)

@Serializable
data class TokenResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    @SerialName("expires_in") val expiresIn: Long,
)

@Serializable
data class SeedResponse(
    val success: Boolean,
    val seeded: List<SeededPersona> = emptyList(),
)

@Serializable
data class SeededPersona(
    val id: String,
    val email: String,
    val name: String? = null,
)

@Serializable
data class PersonasResponse(
    val personas: List<Persona> = emptyList(),
)

@Serializable
data class Persona(
    val id: String,
    val email: String,
    val name: String? = null,
    val role: String? = null,
)

data class Provider(
    val id: String,
    val displayName: String,
)

data class KandiLoginConfig(
    val authServerUrl: String,
    val callbackScheme: String,
    val providers: List<Provider>,
)
