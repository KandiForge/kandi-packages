// ProfileView.swift
// KandiLoginExample
//
// Copyright (c) KandiForge. All rights reserved.
// Licensed under the MIT License.

import KandiLoginSDK
import SwiftUI

struct ProfileView: View {

    @Environment(AuthManager.self) private var authManager

    var body: some View {
        NavigationStack {
            List {
                if let user = authManager.currentUser {
                    Section("Profile") {
                        HStack(spacing: 16) {
                            if let avatarUrl = user.avatarUrl,
                               let url = URL(string: avatarUrl)
                            {
                                AsyncImage(url: url) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Image(systemName: "person.circle.fill")
                                        .resizable()
                                        .foregroundStyle(.secondary)
                                }
                                .frame(width: 60, height: 60)
                                .clipShape(Circle())
                            } else {
                                Image(systemName: "person.circle.fill")
                                    .resizable()
                                    .frame(width: 60, height: 60)
                                    .foregroundStyle(.secondary)
                            }

                            VStack(alignment: .leading, spacing: 4) {
                                Text(user.displayName ?? user.name)
                                    .font(.headline)
                                Text(user.email)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)

                        LabeledContent("User ID", value: user.id)
                        LabeledContent("Role", value: user.role)
                    }
                }

                Section {
                    Button("Refresh Session") {
                        Task {
                            await authManager.refreshIfNeeded()
                        }
                    }
                }

                Section {
                    Button("Sign Out", role: .destructive) {
                        Task {
                            await authManager.logout()
                        }
                    }
                }
            }
            .navigationTitle("Account")
            .overlay {
                if authManager.isLoading {
                    ProgressView()
                        .padding()
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }
}
