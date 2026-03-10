// KandiLoginExampleApp.swift
// KandiLoginExample
//
// Copyright (c) KandiForge. All rights reserved.
// Licensed under the MIT License.

import KandiLoginSDK
import SwiftUI

@main
struct KandiLoginExampleApp: App {

    @State private var authManager: AuthManager

    init() {
        let config = KandiLoginConfig(
            authServerUrl: "https://kandi-packages-api.vercel.app",
            callbackScheme: "kandi-example",
            providers: [
                Provider(id: "github", name: "GitHub"),
                Provider(id: "google", name: "Google"),
            ]
        )
        _authManager = State(initialValue: AuthManager(config: config))
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authManager)
        }
    }
}
