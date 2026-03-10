'use client';

import { PlatformPage } from '@/components/PlatformPage';

export default function AndroidPage() {
  return (
    <PlatformPage
      name="Android (Compose)"
      slug="android"
      color="#00cc84"
      status="Coming Soon"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
          <rect x="5" y="8" width="14" height="12" rx="2" />
          <path d="M8 8V5a4 4 0 018 0v3M7 4l2 4M17 4l-2 4" />
        </svg>
      }
      description="Native Android authentication using Chrome Custom Tabs for OAuth and EncryptedSharedPreferences for secure token storage. Built for Jetpack Compose with Material 3."
      quickStartSteps={[
        {
          title: 'Clone the example project',
          code: 'git clone https://github.com/KandiForge/kandi-packages.git\ncd kandi-packages/examples/android',
        },
        {
          title: 'Open in Android Studio',
          code: '# Open kandi-packages/examples/android in Android Studio',
        },
        {
          title: 'Build and run on an emulator or device',
        },
        {
          title: 'Tap "Login" — Chrome Custom Tabs handles the OAuth flow, then returns to the app',
        },
      ]}
      configSnippet={`// AuthConfig.kt
import com.kandiforge.kandilogin.KandiAuthConfig

val authConfig = KandiAuthConfig(
    authServerUrl = "https://api.packages.kandiforge.com",
    authBasePath = "/api/auth",
    providers = listOf(Provider.GOOGLE, Provider.GITHUB),
    // Tokens stored in EncryptedSharedPreferences
    secureStorage = true,
    // Deep-link scheme for OAuth callback
    deepLinkScheme = "myapp"
)`}
      configLanguage="AuthConfig.kt"
      switchServerNote={`// Change authServerUrl to your own server:
authServerUrl = "https://your-api.example.com"`}
      testFrameworks={['Espresso', 'Compose UI Test']}
      testSnippet={`// androidTest/AuthTestSetup.kt
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

class AuthTestSetup {
    private val client = OkHttpClient()
    private val baseUrl = "https://your-api.example.com/api/auth"

    fun authenticateAsPersona(personaId: String): AuthTokens {
        // Seed personas (idempotent)
        client.newCall(
            Request.Builder().url("$baseUrl/test/seed").post("".toRequestBody()).build()
        ).execute()

        // Get real JWT tokens — no Custom Tabs needed
        val body = """{"personaId": "$personaId"}""".toRequestBody()
        val response = client.newCall(
            Request.Builder()
                .url("$baseUrl/test/login-as")
                .post(body)
                .addHeader("Content-Type", "application/json")
                .build()
        ).execute()

        return parseTokens(response.body!!.string())
    }
}`}
      testSnippetLanguage="androidTest/AuthTestSetup.kt"
    />
  );
}
