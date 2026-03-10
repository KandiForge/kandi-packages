# kandi-login Next.js Example

Reference implementation of [kandi-login](https://github.com/KandiForge/kandi-packages/tree/main/packages/kandi-login) in a Next.js app.

## Quick Start

```bash
# From the repo root
npm install
npm run build --workspace=packages/kandi-login

# Run the example
npm run dev --workspace=examples/nextjs
```

Open [http://localhost:3000](http://localhost:3000).

## Pointing to Your Own Server

Edit `app/providers.tsx` and change `authServerUrl` to your own kandi-login server URL:

```ts
const authConfig: KandiLoginConfig = {
  authServerUrl: 'https://your-server.example.com',
  providers: [
    { id: 'google', name: 'Google' },
    { id: 'apple', name: 'Apple' },
  ],
};
```

## License

MIT - KandiForge
