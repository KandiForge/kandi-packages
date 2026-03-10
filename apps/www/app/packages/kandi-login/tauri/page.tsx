'use client';

import { PlatformPage } from '@/components/PlatformPage';

export default function TauriPage() {
  return (
    <PlatformPage
      name="Tauri"
      slug="tauri"
      color="#00cc84"
      status="Available"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M3 9h18M9 3v18" />
        </svg>
      }
      description="Lightweight desktop authentication for Tauri apps. OAuth flow via the system browser with deep-link callback. Tokens stored securely using the Tauri stronghold plugin."
      quickStartSteps={[
        {
          title: 'Clone the example project',
          code: 'git clone https://github.com/KandiForge/kandi-packages.git\ncd kandi-packages/examples/tauri',
        },
        {
          title: 'Install dependencies',
          code: 'npm install',
        },
        {
          title: 'Run the Tauri development build',
          code: 'npm run tauri dev\n# Opens the Tauri window — pre-configured for the reference server',
        },
        {
          title: 'Click "Login" — opens the system browser, then deep-links back to the app',
        },
      ]}
      configSnippet={`// src/auth.config.ts
import { createTauriAuthClient } from '@kandiforge/kandi-login/tauri';

export const auth = createTauriAuthClient({
  authServerUrl: 'https://api.packages.kandiforge.com',
  authBasePath: '/api/auth',
  providers: ['google', 'github'],
  // Deep-link scheme registered in tauri.conf.json
  deepLinkScheme: 'myapp',
  // Tokens stored via Tauri stronghold plugin
  secureStorage: true,
});`}
      configLanguage="src/auth.config.ts"
      switchServerNote={`// Change authServerUrl to your own server:
authServerUrl: 'https://your-api.example.com'`}
      testFrameworks={['Playwright', 'WebDriver']}
      testSnippet={`// test/auth.setup.ts
async function authenticateForTest(personaId: string) {
  // Seed personas (idempotent)
  await fetch('https://your-api.example.com/api/auth/test/seed', {
    method: 'POST',
  });

  // Get real JWT tokens — bypasses browser OAuth
  const res = await fetch(
    'https://your-api.example.com/api/auth/test/login-as',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId }),
    }
  );
  const { access_token, refresh_token } = await res.json();

  // Inject tokens into the Tauri app's auth state
  await invoke('set_auth_tokens', { accessToken: access_token, refreshToken: refresh_token });
}`}
      testSnippetLanguage="test/auth.setup.ts"
    />
  );
}
