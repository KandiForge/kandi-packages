// LoginView.swift
// KandiLoginExample
//
// Copyright (c) KandiForge. All rights reserved.
// Licensed under the MIT License.

import AuthenticationServices
import KandiLoginSDK
import SwiftUI

struct LoginView: View {

    @Environment(AuthManager.self) private var authManager
    @State private var personas: [Persona] = []
    @State private var showTestPersonas = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                Image(systemName: "person.circle.fill")
                    .resizable()
                    .frame(width: 80, height: 80)
                    .foregroundStyle(.secondary)

                Text("Kandi Login")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Sign in to continue")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Spacer()

                VStack(spacing: 12) {
                    OAuthButton(
                        title: "Sign in with GitHub",
                        systemImage: "chevron.left.forwardslash.chevron.right",
                        provider: "github"
                    )

                    OAuthButton(
                        title: "Sign in with Google",
                        systemImage: "globe",
                        provider: "google"
                    )
                }
                .padding(.horizontal)

                Divider()
                    .padding(.horizontal, 40)

                Button {
                    showTestPersonas.toggle()
                } label: {
                    Label("Test Personas", systemImage: "person.2.fill")
                        .font(.subheadline)
                }

                if showTestPersonas {
                    testPersonasSection
                }

                Spacer()

                if let error = authManager.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding(.horizontal)
                }
            }
            .navigationTitle("")
            .overlay {
                if authManager.isLoading {
                    ProgressView("Signing in...")
                        .padding()
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }

    private var testPersonasSection: some View {
        VStack(spacing: 8) {
            Button("Seed Test Personas") {
                Task {
                    do {
                        _ = try await authManager.seedTestPersonas()
                        let response = try await authManager.listPersonas()
                        personas = response.personas
                    } catch {
                        // Error handled by authManager
                    }
                }
            }
            .buttonStyle(.bordered)

            ForEach(personas) { persona in
                Button {
                    Task {
                        await authManager.loginAsPersona(persona.id)
                    }
                } label: {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(persona.name)
                                .font(.subheadline)
                            Text(persona.email)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(persona.role)
                            .font(.caption2)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(.fill, in: Capsule())
                    }
                    .padding(.vertical, 4)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal)
    }
}

// MARK: - OAuth Button

private struct OAuthButton: View {

    @Environment(AuthManager.self) private var authManager

    let title: String
    let systemImage: String
    let provider: String

    var body: some View {
        Button {
            Task {
                let contextProvider = WebAuthContextProvider()
                await authManager.login(
                    provider: provider,
                    presentationContextProvider: contextProvider
                )
            }
        } label: {
            Label(title, systemImage: systemImage)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
        }
        .buttonStyle(.borderedProminent)
    }
}

// MARK: - Web Auth Context Provider

final class WebAuthContextProvider: NSObject,
    ASWebAuthenticationPresentationContextProviding
{
    func presentationAnchor(
        for session: ASWebAuthenticationSession
    ) -> ASPresentationAnchor {
        #if os(iOS)
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first
        else {
            return ASPresentationAnchor()
        }
        return window
        #else
        return ASPresentationAnchor()
        #endif
    }
}
