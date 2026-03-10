'use client';

import { PlatformPage } from '@/components/PlatformPage';

export default function WebPage() {
  return (
    <PlatformPage
      name="Web (React)"
      slug="web"
      color="#00D9FF"
      status="Available"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
          <circle cx="12" cy="12" r="10" />
          <ellipse cx="12" cy="12" rx="4" ry="10" />
          <path d="M2 12h20" />
        </svg>
      }
      description="Authentication for Next.js and Vite React apps. Drop-in LoginButton component, AuthProvider context, and route guards. Works with both MUI and Tailwind styling."
      quickStartSteps={[
        {
          title: 'Clone the example project',
          code: 'git clone https://github.com/KandiForge/kandi-packages.git\ncd kandi-packages/examples/web',
        },
        {
          title: 'Install dependencies',
          code: 'npm install',
        },
        {
          title: 'Start the development server',
          code: 'npm run dev\n# Opens on http://localhost:3000 — pre-configured for the reference server',
        },
        {
          title: 'Try logging in — the example app connects to the reference server automatically',
        },
      ]}
      configSnippet={`// auth.config.ts
import { createAuthClient } from '@kandiforge/kandi-login/client';

export const auth = createAuthClient({
  authServerUrl: 'https://api.packages.kandiforge.com',
  authBasePath: '/api/auth',
  providers: ['google', 'github'],
  onAuthStateChange: (user) => {
    console.log('Auth state:', user);
  },
});`}
      configLanguage="auth.config.ts"
      switchServerNote={`// Change authServerUrl to your own server:
authServerUrl: 'https://your-api.example.com'`}
      testFrameworks={['Playwright', 'Cypress']}
      testSnippet={`// playwright/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate as admin', async ({ request }) => {
  // Seed personas (idempotent — safe to call every run)
  await request.post('https://your-api.example.com/api/auth/test/seed');

  // Get real JWT tokens without browser OAuth
  const res = await request.post(
    'https://your-api.example.com/api/auth/test/login-as',
    { data: { personaId: 'admin-alex' } }
  );
  const { access_token } = await res.json();

  // Store for use in tests
  process.env.TEST_ACCESS_TOKEN = access_token;
});`}
      testSnippetLanguage="playwright/auth.setup.ts"
    />
  );
}
