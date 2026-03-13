# Kandi Login - iOS Example

A SwiftUI example app demonstrating how to integrate Kandi Login authentication into an iOS application.

## Requirements

- Xcode 15+
- iOS 17+ / macOS 14+
- Swift 5.9+

## Setup

### 1. Open the project

```bash
cd examples/ios
open Package.swift
```

Xcode will resolve the Swift Package Manager dependencies automatically.

### 2. Configure the callback scheme

The example uses `kandi-example` as the URL scheme. To set this up:

1. In Xcode, select the **App** target.
2. Go to the **Info** tab.
3. Under **URL Types**, add a new entry with URL Scheme: `kandi-example`.

### 3. Run the app

Select a simulator or device and press **Cmd+R**.

## Project Structure

```
Sources/
  KandiLoginSDK/
    Models.swift           - Data types (KandiUser, TokenResponse, etc.)
    KandiLoginClient.swift - HTTP client for auth endpoints
    TokenStorage.swift     - Keychain-based token persistence
    AuthManager.swift      - Observable auth state manager
  App/
    KandiLoginExampleApp.swift - App entry point
    ContentView.swift          - Root view (login/profile routing)
    LoginView.swift            - OAuth and test persona login UI
    ProfileView.swift          - Authenticated user profile UI
```

## Auth Server

The example connects to the Kandi Packages auth API:

```
https://kandi-packages-api.vercel.app
```

### Endpoints used

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/login` | OAuth login (opens in ASWebAuthenticationSession) |
| GET | `/api/auth/validate` | Validate access token, returns user |
| POST | `/api/auth/refresh` | Refresh expired access token |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/test/seed` | Seed test personas |
| GET | `/api/auth/test/personas` | List test personas |
| POST | `/api/auth/test/login-as` | Login as a test persona |

## Using the SDK in your own project

Add the KandiLoginSDK package to your Swift Package Manager dependencies:

```swift
.package(path: "../path-to/examples/ios")
```

Then import it:

```swift
import KandiLoginSDK

let config = KandiLoginConfig(
    authServerUrl: "https://kandi-packages-api.vercel.app",
    callbackScheme: "your-app-scheme",
    providers: [Provider(id: "github", name: "GitHub")]
)

let authManager = AuthManager(config: config)
```

## License

MIT License. Copyright (c) KandiForge.
