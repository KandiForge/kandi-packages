// Copyright (c) KandiForge. MIT License.

package com.kandiforge.example.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kandiforge.example.sdk.AuthManager
import com.kandiforge.example.sdk.Persona
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    authManager: AuthManager,
    onOAuthLogin: (provider: String) -> Unit,
) {
    val isLoading by authManager.isLoading.collectAsState()
    val errorMessage by authManager.errorMessage.collectAsState()
    val scope = rememberCoroutineScope()

    var showTestPersonas by remember { mutableStateOf(false) }
    var personas by remember { mutableStateOf<List<Persona>>(emptyList()) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = Icons.Filled.Person,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Kandi Login",
            style = MaterialTheme.typography.headlineLarge,
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Sign in to continue",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(modifier = Modifier.height(32.dp))

        // OAuth buttons
        Button(
            onClick = { onOAuthLogin("github") },
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading,
        ) {
            Icon(Icons.Filled.Code, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Sign in with GitHub")
        }

        Spacer(modifier = Modifier.height(12.dp))

        Button(
            onClick = { onOAuthLogin("google") },
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLoading,
        ) {
            Icon(Icons.Filled.Language, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Sign in with Google")
        }

        Spacer(modifier = Modifier.height(24.dp))
        HorizontalDivider(modifier = Modifier.padding(horizontal = 40.dp))
        Spacer(modifier = Modifier.height(16.dp))

        // Test personas toggle
        TextButton(onClick = { showTestPersonas = !showTestPersonas }) {
            Icon(Icons.Filled.People, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Test Personas")
        }

        if (showTestPersonas) {
            Spacer(modifier = Modifier.height(8.dp))

            OutlinedButton(
                onClick = {
                    scope.launch {
                        try {
                            authManager.seedTestPersonas()
                            val response = authManager.listPersonas()
                            personas = response.personas
                        } catch (_: Exception) {
                            // Error handled by authManager
                        }
                    }
                },
                enabled = !isLoading,
            ) {
                Text("Seed Test Personas")
            }

            Spacer(modifier = Modifier.height(8.dp))

            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f, fill = false),
            ) {
                items(personas, key = { it.id }) { persona ->
                    PersonaCard(
                        persona = persona,
                        isLoading = isLoading,
                        onClick = {
                            scope.launch {
                                authManager.loginAsPersona(persona.id)
                            }
                        },
                    )
                }
            }
        }

        if (isLoading) {
            Spacer(modifier = Modifier.height(16.dp))
            CircularProgressIndicator()
        }

        if (errorMessage != null) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = errorMessage.orEmpty(),
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}

@Composable
private fun PersonaCard(
    persona: Persona,
    isLoading: Boolean,
    onClick: () -> Unit,
) {
    Card(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        enabled = !isLoading,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = persona.name ?: persona.id,
                    style = MaterialTheme.typography.bodyMedium,
                )
                Text(
                    text = persona.email,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (persona.role != null) {
                Text(
                    text = persona.role,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
