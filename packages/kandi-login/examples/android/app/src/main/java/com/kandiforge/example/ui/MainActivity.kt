// Copyright (c) KandiForge. MIT License.

package com.kandiforge.example.ui

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import com.kandiforge.example.sdk.AuthManager
import com.kandiforge.example.ui.theme.KandiLoginTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var authManager: AuthManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        authManager = AuthManager(applicationContext)

        setContent {
            KandiLoginTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    val isAuthenticated by authManager.isAuthenticated.collectAsState()
                    val scope = rememberCoroutineScope()

                    if (isAuthenticated) {
                        ProfileScreen(
                            authManager = authManager,
                            onLogout = {
                                scope.launch { authManager.logout() }
                            },
                            onRefresh = {
                                scope.launch { authManager.refreshIfNeeded() }
                            },
                        )
                    } else {
                        LoginScreen(
                            authManager = authManager,
                            onOAuthLogin = { provider -> launchOAuth(provider) },
                        )
                    }
                }
            }
        }

        // Restore session on launch
        lifecycleScope.launch {
            authManager.restoreSession()
        }

        // Handle deep link if launched from callback
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme == CALLBACK_SCHEME) {
            lifecycleScope.launch {
                authManager.handleCallback(uri)
            }
        }
    }

    private fun launchOAuth(provider: String) {
        val url = authManager.loginClient.buildLoginUrl(
            provider = provider,
            callbackScheme = CALLBACK_SCHEME,
        )
        val customTabsIntent = CustomTabsIntent.Builder().build()
        customTabsIntent.launchUrl(this, Uri.parse(url))
    }

    private companion object {
        const val CALLBACK_SCHEME = "kandi-example"
    }
}
