# kandi-packages

A public set of MIT-licensed reusable components designed to help agentic developers create apps faster with better quality using parts for common use cases.

## Repository Structure

### `www/`

The public-facing website for the kandi-packages project. A single Next.js app that serves both the website and API routes (`/api/auth/*`).

### `packages/`

The library of packages published separately to npm. Each package folder contains its own source code, examples, documentation, and build configuration.

| Package | npm | Description |
|---|---|---|
| [kandi-login](packages/kandi-login/) | `kandi-login` | Multi-platform OAuth authentication — 5 client SDKs + 1 server SDK |

## Getting Started

```bash
npm install    # installs all workspaces
npm run build  # builds all packages
```

## License

MIT
