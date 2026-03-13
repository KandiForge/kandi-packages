// swift-tools-version: 5.9
// Copyright (c) KandiForge. All rights reserved.
// Licensed under the MIT License.

import PackageDescription

let package = Package(
    name: "kandi-login-example",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
    ],
    products: [
        .library(
            name: "KandiLoginSDK",
            targets: ["KandiLoginSDK"]
        ),
        .executable(
            name: "KandiLoginExample",
            targets: ["App"]
        ),
    ],
    targets: [
        .target(
            name: "KandiLoginSDK",
            path: "Sources/KandiLoginSDK"
        ),
        .executableTarget(
            name: "App",
            dependencies: ["KandiLoginSDK"],
            path: "Sources/App"
        ),
    ]
)
