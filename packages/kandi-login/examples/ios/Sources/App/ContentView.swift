// ContentView.swift
// KandiLoginExample
//
// Copyright (c) KandiForge. All rights reserved.
// Licensed under the MIT License.

import KandiLoginSDK
import SwiftUI

struct ContentView: View {

    @Environment(AuthManager.self) private var authManager

    var body: some View {
        Group {
            if authManager.isAuthenticated {
                ProfileView()
            } else {
                LoginView()
            }
        }
        .task {
            await authManager.restoreSession()
        }
    }
}
