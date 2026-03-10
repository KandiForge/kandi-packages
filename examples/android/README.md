# Kandi Login - Android Example

A Jetpack Compose example app demonstrating how to integrate Kandi Login authentication into an Android application.

## Requirements

- Android Studio Hedgehog (2023.1.1) or newer
- JDK 17
- Android SDK 35
- Min SDK 26 (Android 8.0)

## Setup

### 1. Open the project

Open the `examples/android/` directory in Android Studio as a Gradle project.

### 2. Sync Gradle

Android Studio will prompt you to sync the Gradle files. Click **Sync Now**.

### 3. Run the app

Select a device or emulator and press the **Run** button.

## Project Structure

```
app/src/main/java/com/kandiforge/example/
  sdk/
    Models.kt           - Data classes (KandiUser, TokenResponse, etc.)
    KandiLoginClient.kt - HTTP client for auth endpoints
    TokenStorage.kt     - EncryptedSharedPreferences token storage
    AuthManager.kt      - StateFlow-based auth state manager
  ui/
    MainActivity.kt     - Activity with deep link handling
    LoginScreen.kt      - OAuth and test persona login UI
    ProfileScreen.kt    - Authenticated user profile UI
    theme/Theme.kt      - Material3 theme
```

## Auth Server

The example connects to the Kandi Packages auth API:

```
https://kandi-packages-api.vercel.app
```

### Endpoints used

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/login` | OAuth login (opens in Custom Chrome Tab) |
| GET | `/api/auth/validate` | Validate access token, returns user |
| POST | `/api/auth/refresh` | Refresh expired access token |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/test/seed` | Seed test personas |
| GET | `/api/auth/test/personas` | List test personas |
| POST | `/api/auth/test/login-as` | Login as a test persona |

## Deep Links

The app registers a deep link handler for the `kandi-example://` scheme. After OAuth authentication completes in the Custom Chrome Tab, the browser redirects back to `kandi-example://auth/callback` with token parameters.

This is configured in `AndroidManifest.xml`:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="kandi-example" />
</intent-filter>
```

## Dependencies

- **Jetpack Compose** with Material3 for the UI
- **OkHttp** for HTTP networking
- **kotlinx.serialization** for JSON parsing
- **EncryptedSharedPreferences** for secure token storage
- **Custom Chrome Tabs** for OAuth browser flow
- **Coil** for avatar image loading

## License

MIT License. Copyright (c) KandiForge.
