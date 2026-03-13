# kandi-login — Vite + React Example

A minimal Vite single-page application demonstrating `kandi-login` integration with MUI.

## Quick start

```bash
# From the monorepo root
npm install
npm run build --workspace=kandi-login

# Start the example
cd examples/vite
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## What this demonstrates

- **AuthProvider** wrapping the app with OAuth configuration
- **MuiLoginChip** for sign-in / user menu (glass variant)
- **useAuth** hook for reading user state (name, email, avatar, role)

## Configuration

Edit `src/App.tsx` to change the auth server or providers:

```ts
const authConfig: KandiLoginConfig = {
  // Point to your own auth server:
  authServerUrl: 'https://kandi-packages-api.vercel.app',
  providers: [
    { id: 'google', name: 'Google' },
    { id: 'apple', name: 'Apple' },
  ],
};
```

## License

MIT — KandiForge
