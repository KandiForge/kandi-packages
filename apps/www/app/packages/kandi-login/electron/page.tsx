'use client';

import { PlatformPage } from '@/components/PlatformPage';

export default function ElectronPage() {
  return (
    <PlatformPage
      name="Electron"
      slug="electron"
      color="#b177ff"
      status="Available"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
          <circle cx="12" cy="12" r="3" />
          <ellipse cx="12" cy="12" rx="10" ry="4" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
        </svg>
      }
      description="Desktop authentication for Electron apps. Opens the system browser for OAuth, receives the callback via deep-link, and stores tokens securely using Electron safeStorage."
      quickStartSteps={[
        {
          title: 'Clone the example project',
          code: 'git clone https://github.com/KandiForge/kandi-packages.git\ncd kandi-packages/examples/electron',
        },
        {
          title: 'Install dependencies',
          code: 'npm install',
        },
        {
          title: 'Start the Electron app',
          code: 'npm start\n# Launches the desktop app — pre-configured for the reference server',
        },
        {
          title: 'Click "Login" — the system browser opens for OAuth, then returns to the app',
        },
      ]}
      configSnippet={`// src/auth.config.ts
import { createElectronAuthClient } from '@kandiforge/kandi-login/electron';

export const auth = createElectronAuthClient({
  authServerUrl: 'https://api.packages.kandiforge.com',
  authBasePath: '/api/auth',
  providers: ['google', 'github'],
  // Deep-link scheme registered in package.json
  deepLinkScheme: 'myapp',
  // Tokens stored via Electron safeStorage
  secureStorage: true,
});`}
      configLanguage="src/auth.config.ts"
      switchServerNote={`// Change authServerUrl to your own server:
authServerUrl: 'https://your-api.example.com'`}
      testFrameworks={['Playwright', 'Spectron']}
      testSnippet={`// test/auth.setup.ts
import { fetch } from 'electron-fetch';

async function authenticateForTest(personaId: string) {
  // Seed personas (idempotent)
  await fetch('https://your-api.example.com/api/auth/test/seed', {
    method: 'POST',
  });

  // Get real JWT tokens — no browser window needed
  const res = await fetch(
    'https://your-api.example.com/api/auth/test/login-as',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId }),
    }
  );
  return res.json();
  // → { access_token, refresh_token, expires_in }
}`}
      testSnippetLanguage="test/auth.setup.ts"
    />
  );
}
