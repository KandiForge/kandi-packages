'use client';

import Link from 'next/link';

const personas = [
  { id: 'admin-alex', email: 'alex@test.kandiforge.com', role: 'admin', description: 'System Administrator — full access, can manage users and settings' },
  { id: 'designer-dana', email: 'dana@test.kandiforge.com', role: 'editor', description: 'Designer — can create and edit content' },
  { id: 'viewer-val', email: 'val@test.kandiforge.com', role: 'viewer', description: 'Viewer — read-only access across the app' },
  { id: 'new-user-naya', email: 'naya@test.kandiforge.com', role: 'user', description: 'New User — freshly registered, minimal permissions' },
];

const platforms = [
  {
    name: 'Web (React)',
    slug: 'web',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <circle cx="12" cy="12" r="10" />
        <ellipse cx="12" cy="12" rx="4" ry="10" />
        <path d="M2 12h20" />
      </svg>
    ),
    description: 'Next.js and Vite apps with React components. Drop-in LoginButton, AuthProvider, and route guards.',
    color: '#00D9FF',
    status: 'Available' as const,
  },
  {
    name: 'Electron',
    slug: 'electron',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <circle cx="12" cy="12" r="3" />
        <ellipse cx="12" cy="12" rx="10" ry="4" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
      </svg>
    ),
    description: 'Desktop apps with system-tray auth and secure token storage via Electron safeStorage.',
    color: '#b177ff',
    status: 'Available' as const,
  },
  {
    name: 'Tauri',
    slug: 'tauri',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M3 9h18M9 3v18" />
      </svg>
    ),
    description: 'Lightweight Rust-backed desktop apps. OAuth via system browser with deep-link callback.',
    color: '#00cc84',
    status: 'Available' as const,
  },
  {
    name: 'iOS (Swift)',
    slug: 'ios',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <rect x="6" y="2" width="12" height="20" rx="3" />
        <circle cx="12" cy="18" r="1" />
        <path d="M9 2h6" />
      </svg>
    ),
    description: 'Native iOS/macOS apps with ASWebAuthenticationSession and Keychain token storage.',
    color: '#ff5346',
    status: 'Coming Soon' as const,
  },
  {
    name: 'Android (Compose)',
    slug: 'android',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <rect x="5" y="8" width="14" height="12" rx="2" />
        <path d="M8 8V5a4 4 0 018 0v3M7 4l2 4M17 4l-2 4" />
      </svg>
    ),
    description: 'Jetpack Compose apps with Custom Tabs OAuth and EncryptedSharedPreferences.',
    color: '#00cc84',
    status: 'Coming Soon' as const,
  },
];

export default function KandiLoginPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <div className="mb-8 text-sm text-[var(--text-muted)]">
        <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">
          Packages
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--text-primary)]">kandi-login</span>
      </div>

      {/* Hero */}
      <section className="mb-16 animate-fade-up">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.15), rgba(0, 217, 255, 0.05))',
              border: '1px solid rgba(0, 217, 255, 0.25)',
            }}
          >
            🔐
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">kandi-login</h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Multi-platform Authentication Framework</p>
          </div>
        </div>

        <div className="glass-panel p-8">
          <p className="text-lg text-[var(--text-primary)] leading-relaxed mb-6">
            One authentication protocol, every platform. Write your auth server once with{' '}
            <code className="text-sm px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--flow-forge)]">kandi-login/server</code>,
            then connect from any client SDK.
          </p>

          {/* 5 → 1 Concept */}
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 w-full">
              <p className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-3">5 Client SDKs</p>
              <div className="grid grid-cols-5 gap-2">
                {['Web', 'Electron', 'Tauri', 'iOS', 'Android'].map((name) => (
                  <div
                    key={name}
                    className="text-center px-2 py-2.5 rounded-lg text-xs font-medium"
                    style={{
                      background: 'rgba(177, 119, 255, 0.08)',
                      border: '1px solid rgba(177, 119, 255, 0.2)',
                      color: '#b177ff',
                    }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 text-[var(--text-muted)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 rotate-90 md:rotate-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            <div className="md:w-48 w-full">
              <p className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-3">1 Server SDK</p>
              <div
                className="text-center px-4 py-3 rounded-lg text-sm font-semibold"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.12), rgba(177, 119, 255, 0.08))',
                  border: '1px solid rgba(0, 217, 255, 0.25)',
                  color: '#00D9FF',
                }}
              >
                kandi-login/server
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Test Personas Section */}
      <section className="mb-16">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Built-in Test Personas
        </h2>
        <div className="glass-panel p-8">
          <p className="text-[var(--text-primary)] text-base leading-relaxed mb-4">
            Every kandi-login server ships with a test persona system for automated testing.
            Test clients authenticate using an API key and secret to get real JWTs — no browser-based OAuth flow needed.
          </p>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
            This is essential for end-to-end testing with <strong className="text-[var(--text-primary)]">Playwright</strong>,{' '}
            <strong className="text-[var(--text-primary)]">Cypress</strong>,{' '}
            <strong className="text-[var(--text-primary)]">XCTest</strong>, and{' '}
            <strong className="text-[var(--text-primary)]">Espresso</strong> test harnesses.
            Personas use the same auth infrastructure as production — real JWT signing, real token refresh, real user records.
          </p>

          {/* Personas Table */}
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--border-subtle)]">
                  <th className="pb-2 pr-4 text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)]">Persona ID</th>
                  <th className="pb-2 pr-4 text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)]">Email</th>
                  <th className="pb-2 pr-4 text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)]">Role</th>
                  <th className="pb-2 text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)]">Use Case</th>
                </tr>
              </thead>
              <tbody>
                {personas.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-[var(--flow-forge)]">{p.id}</td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{p.email}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className="status-badge"
                        style={{
                          background: p.role === 'admin' ? 'rgba(255, 83, 70, 0.12)' : 'rgba(177, 119, 255, 0.12)',
                          color: p.role === 'admin' ? '#ff5346' : '#b177ff',
                          border: `1px solid ${p.role === 'admin' ? 'rgba(255, 83, 70, 0.25)' : 'rgba(177, 119, 255, 0.25)'}`,
                        }}
                      >
                        {p.role}
                      </span>
                    </td>
                    <td className="py-2.5 text-[var(--text-secondary)]">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Code Snippet */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-muted)] font-mono">login-as flow</span>
              <span className="status-badge status-badge--pass">No browser needed</span>
            </div>
            <pre className="p-4 text-sm font-mono leading-relaxed overflow-x-auto" style={{ color: 'var(--text-secondary)' }}>
              <code>{`// Seed test personas (run once)
POST /api/auth/test/seed
// → { success: true, seeded: ["admin-alex", "designer-dana", ...] }

// Login as a test persona — returns real JWTs
POST /api/auth/test/login-as
Content-Type: application/json
{ "personaId": "admin-alex" }

// → { access_token: "eyJ...", refresh_token: "...", expires_in: 3600 }
// Use the access_token exactly like a production token`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Platform Cards */}
      <section className="mb-16">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Client SDKs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => (
            <Link
              key={platform.slug}
              href={`/packages/kandi-login/${platform.slug}`}
              className="block no-underline group"
            >
              <div className="glass-panel p-6 h-full flex flex-col gap-4 transition-transform duration-300 group-hover:scale-[1.02]">
                <div className="flex items-start justify-between">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${platform.color}22, ${platform.color}11)`,
                      border: `1px solid ${platform.color}33`,
                      color: platform.color,
                    }}
                  >
                    {platform.icon}
                  </div>
                  <span
                    className={`status-badge ${platform.status === 'Available' ? 'status-badge--pass' : 'status-badge--pending'}`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ background: platform.status === 'Available' ? '#00cc84' : '#b177ff' }}
                    />
                    {platform.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] font-semibold text-lg mb-1">{platform.name}</h3>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{platform.description}</p>
                </div>
              </div>
            </Link>
          ))}

          {/* Conformance Validator Card */}
          <Link href="/packages/kandi-login/validator" className="block no-underline group">
            <div className="glass-panel p-6 h-full flex flex-col gap-4 transition-transform duration-300 group-hover:scale-[1.02]">
              <div className="flex items-start justify-between">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 204, 132, 0.13), rgba(0, 204, 132, 0.06))',
                    border: '1px solid rgba(0, 204, 132, 0.25)',
                    color: '#00cc84',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <span className="status-badge status-badge--running">
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#00D9FF' }} />
                  Interactive
                </span>
              </div>
              <div>
                <h3 className="text-[var(--text-primary)] font-semibold text-lg mb-1">Conformance Validator</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  Point at your server to run the full test suite — validates endpoints, JWTs, personas, and UserAdapter.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Reference Server Section */}
      <section className="mb-16">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Reference Server
        </h2>
        <div className="glass-panel p-8">
          <p className="text-[var(--text-primary)] text-base leading-relaxed mb-6">
            <code className="text-sm px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--flow-forge)]">api.packages.kandiforge.com</code>{' '}
            is a working reference server. Use it to verify your client works before building your own server.
          </p>

          <div className="space-y-4">
            {[
              {
                step: 1,
                title: 'Download the example client for your platform',
                description: 'Each platform has a ready-to-run example app pre-configured to connect to the reference server.',
              },
              {
                step: 2,
                title: 'Run it against the reference server',
                description: 'Verify that OAuth login, token refresh, and test personas all work correctly with the example.',
              },
              {
                step: 3,
                title: 'Build your own server using kandi-login/server',
                description: 'Implement the UserAdapter interface, configure your OAuth providers, and deploy your server.',
              },
              {
                step: 4,
                title: 'Switch the URL to your own server',
                description: 'Change authServerUrl in the client config. Run the conformance validator to confirm compatibility.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 items-start">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(177, 119, 255, 0.15), rgba(0, 217, 255, 0.10))',
                    border: '1px solid rgba(177, 119, 255, 0.25)',
                    color: '#b177ff',
                  }}
                >
                  {item.step}
                </div>
                <div>
                  <p className="text-[var(--text-primary)] font-medium text-sm">{item.title}</p>
                  <p className="text-[var(--text-secondary)] text-sm mt-0.5">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Links */}
      <div className="flex flex-wrap gap-4 text-sm">
        <a
          href="https://github.com/KandiForge/kandi-packages/tree/main/packages/kandi-login"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--flow-forge)] hover:underline"
        >
          View source on GitHub
        </a>
        <span className="text-[var(--text-muted)]">|</span>
        <a
          href="https://www.npmjs.com/package/@kandiforge/kandi-login"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--flow-forge)] hover:underline"
        >
          npm package
        </a>
      </div>
    </div>
  );
}
