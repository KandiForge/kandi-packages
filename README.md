# kandi-packages

A public set of MIT-licensed reusable components designed to help agentic developers create apps faster with better quality using parts for common use cases.

## Repository Structure

### `www/`

The public-facing website and supporting servers for the kandi-packages project.

- **Website** — Next.js app showcasing all packages, documentation, and live demos (port 3100)
- **API** (`www/api/`) — Auth server and backend services powering the website (port 3101)

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
