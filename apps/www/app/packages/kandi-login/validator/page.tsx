'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';

interface TestResult {
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'running' | 'pending' | 'skipped';
  duration?: number;
  error?: string;
  expected?: string;
  actual?: string;
}

interface TestCategory {
  name: string;
  tests: TestResult[];
}

const REFERENCE_SERVER = 'https://kandi-packages-api.vercel.app';
const STORAGE_KEY = 'kandi-login-test-server-url';

function getInitialUrl(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  }
  return '';
}

export default function KandiLoginValidatorPage() {
  const [serverUrl, setServerUrl] = useState(getInitialUrl);
  const [authBasePath, setAuthBasePath] = useState('/api/auth');
  const [categories, setCategories] = useState<TestCategory[]>(buildInitialCategories());
  const [running, setRunning] = useState(false);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function getBaseUrl(): string {
    const url = serverUrl.trim().replace(/\/+$/, '');
    const path = authBasePath.trim().replace(/\/+$/, '');
    return `${url}${path}`;
  }

  function buildInitialCategories(): TestCategory[] {
    return [
      {
        name: 'Connection',
        tests: [
          { name: 'Server reachable', description: 'OPTIONS request returns CORS headers', status: 'pending' },
        ],
      },
      {
        name: 'Error Handling',
        tests: [
          { name: 'POST /native → missing token', description: 'Returns 400 when id_token is missing', status: 'pending' },
          { name: 'POST /refresh → invalid token', description: 'Returns 401 for invalid refresh token', status: 'pending' },
          { name: 'GET /validate → no bearer', description: 'Returns 401 without Authorization header', status: 'pending' },
          { name: 'POST /logout → 200', description: 'Returns 200 for stateless logout', status: 'pending' },
        ],
      },
      {
        name: 'OAuth Redirect',
        tests: [
          { name: 'GET /login → redirect', description: 'Returns 302 redirect to OAuth provider', status: 'pending' },
        ],
      },
      {
        name: 'Test Personas',
        tests: [
          { name: 'POST /test/seed', description: 'Creates test personas in database via UserAdapter', status: 'pending' },
          { name: 'GET /test/personas', description: 'Returns list of available test personas', status: 'pending' },
          { name: 'POST /test/login-as', description: 'Signs real JWTs for a test persona', status: 'pending' },
        ],
      },
      {
        name: 'Token Lifecycle',
        tests: [
          { name: 'GET /validate → valid bearer', description: 'Returns user profile for valid access token', status: 'pending' },
          { name: 'POST /refresh → valid token', description: 'Returns new access + refresh token pair (rolling)', status: 'pending' },
          { name: 'JWT claims structure', description: 'Access token contains sub, email, iss, type="access"', status: 'pending' },
        ],
      },
      {
        name: 'UserAdapter Conformance',
        tests: [
          { name: 'Idempotent seed', description: 'Re-seeding does not duplicate users (findByProviderId works)', status: 'pending' },
          { name: 'getUserById', description: 'Validate endpoint resolves user from token sub claim', status: 'pending' },
          { name: 'User shape', description: 'Returned user has required id and email fields', status: 'pending' },
        ],
      },
    ];
  }

  const updateTest = useCallback(
    (catIndex: number, testIndex: number, update: Partial<TestResult>) => {
      setCategories((prev) =>
        prev.map((cat, ci) =>
          ci === catIndex
            ? {
                ...cat,
                tests: cat.tests.map((t, ti) =>
                  ti === testIndex ? { ...t, ...update } : t
                ),
              }
            : cat
        )
      );
    },
    []
  );

  async function runTest(
    catIndex: number,
    testIndex: number,
    fn: () => Promise<void>
  ): Promise<boolean> {
    updateTest(catIndex, testIndex, { status: 'running', error: undefined, duration: undefined, expected: undefined, actual: undefined });
    const start = performance.now();
    try {
      await fn();
      updateTest(catIndex, testIndex, {
        status: 'pass',
        duration: Math.round(performance.now() - start),
      });
      return true;
    } catch (err) {
      updateTest(catIndex, testIndex, {
        status: 'fail',
        duration: Math.round(performance.now() - start),
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  function skipRemaining(catIndex: number, fromTest: number) {
    setCategories((prev) =>
      prev.map((cat, ci) =>
        ci === catIndex
          ? {
              ...cat,
              tests: cat.tests.map((t, ti) =>
                ti >= fromTest && t.status === 'pending'
                  ? { ...t, status: 'skipped' as const }
                  : t
              ),
            }
          : cat
      )
    );
  }

  async function runAllTests() {
    if (!serverUrl.trim()) return;

    localStorage.setItem(STORAGE_KEY, serverUrl.trim());
    setRunning(true);
    setConnectionOk(null);
    setCategories(buildInitialCategories());

    abortRef.current = new AbortController();
    const base = getBaseUrl();

    let accessToken = '';
    let refreshToken = '';

    // Category 0: Connection
    const connected = await runTest(0, 0, async () => {
      const res = await fetch(`${base}/logout`, {
        method: 'OPTIONS',
        signal: abortRef.current?.signal,
      });
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
      setConnectionOk(true);
    });

    if (!connected) {
      setConnectionOk(false);
      setRunning(false);
      return;
    }

    // Category 1: Error Handling
    await runTest(1, 0, async () => {
      const res = await fetch(`${base}/native`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google' }),
        signal: abortRef.current?.signal,
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    await runTest(1, 1, async () => {
      const res = await fetch(`${base}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: 'invalid-token-abc123' }),
        signal: abortRef.current?.signal,
      });
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    });

    await runTest(1, 2, async () => {
      const res = await fetch(`${base}/validate`, { signal: abortRef.current?.signal });
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    });

    await runTest(1, 3, async () => {
      const res = await fetch(`${base}/logout`, {
        method: 'POST',
        signal: abortRef.current?.signal,
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    });

    // Category 2: OAuth Redirect
    await runTest(2, 0, async () => {
      const res = await fetch(`${base}/login?provider=google`, {
        redirect: 'manual',
        signal: abortRef.current?.signal,
      });
      if (res.type === 'opaqueredirect' || res.status === 302 || res.status === 307) return;
      if (res.status === 200) {
        const data = await res.json().catch(() => null);
        if (data?.redirect_url || data?.location) return;
      }
      throw new Error(`Expected redirect (302/307) or opaque redirect, got ${res.status} (type: ${res.type})`);
    });

    // Category 3: Test Personas
    const seedOk = await runTest(3, 0, async () => {
      const res = await fetch(`${base}/test/seed`, {
        method: 'POST',
        signal: abortRef.current?.signal,
      });
      if (res.status === 404) {
        throw new Error('Not found — is enableTestPersonas: true in your createAuthServer config?');
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Seed failed: ${res.status} ${body.slice(0, 200)}`);
      }
      const data = await res.json();
      if (!data.success) throw new Error('Response missing success: true');
      if (!Array.isArray(data.seeded) || data.seeded.length === 0) {
        if (!Array.isArray(data.skipped) || data.skipped.length === 0) {
          throw new Error('Expected seeded or skipped arrays to be non-empty');
        }
      }
    });

    if (!seedOk) {
      skipRemaining(3, 1);
      skipRemaining(4, 0);
      skipRemaining(5, 0);
      setRunning(false);
      return;
    }

    await runTest(3, 1, async () => {
      const res = await fetch(`${base}/test/personas`, { signal: abortRef.current?.signal });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.personas)) throw new Error('Expected { personas: [...] } shape');
      if (data.personas.length === 0) throw new Error('No personas returned — seed may have failed');
      const first = data.personas[0];
      if (!first.id || !first.email) throw new Error('Persona missing id or email field');
    });

    const loginAsOk = await runTest(3, 2, async () => {
      const res = await fetch(`${base}/test/login-as`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: 'admin-alex' }),
        signal: abortRef.current?.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Login-as failed: ${res.status} ${body.slice(0, 200)}`);
      }
      const data = await res.json();
      if (!data.access_token) throw new Error('Response missing access_token');
      if (!data.refresh_token) throw new Error('Response missing refresh_token');
      if (typeof data.expires_in !== 'number') throw new Error('Response missing expires_in (number)');
      accessToken = data.access_token;
      refreshToken = data.refresh_token;
    });

    if (!loginAsOk) {
      skipRemaining(4, 0);
      skipRemaining(5, 0);
      setRunning(false);
      return;
    }

    // Category 4: Token Lifecycle
    await runTest(4, 0, async () => {
      const res = await fetch(`${base}/validate`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: abortRef.current?.signal,
      });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!data.valid) throw new Error('Expected valid: true');
      if (!data.user?.email) throw new Error('Expected user object with email field');
    });

    await runTest(4, 1, async () => {
      const res = await fetch(`${base}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: abortRef.current?.signal,
      });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!data.access_token) throw new Error('Missing new access_token');
      if (!data.refresh_token) throw new Error('Missing new refresh_token (rolling refresh)');
      if (typeof data.expires_in !== 'number') throw new Error('Missing expires_in');
    });

    await runTest(4, 2, async () => {
      const parts = accessToken.split('.');
      if (parts.length !== 3) throw new Error('Not a valid JWT (expected 3 parts)');
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const missing: string[] = [];
      if (!payload.sub) missing.push('sub');
      if (!payload.email) missing.push('email');
      if (!payload.iss) missing.push('iss');
      if (!payload.exp) missing.push('exp');
      if (!payload.iat) missing.push('iat');
      if (missing.length > 0) throw new Error(`Missing claims: ${missing.join(', ')}`);
      if (payload.type !== 'access') throw new Error(`Expected type="access", got "${payload.type}"`);
    });

    // Category 5: UserAdapter Conformance
    await runTest(5, 0, async () => {
      const res = await fetch(`${base}/test/seed`, {
        method: 'POST',
        signal: abortRef.current?.signal,
      });
      if (!res.ok) throw new Error(`Re-seed failed: ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error('Re-seed returned success: false');
      const res2 = await fetch(`${base}/test/login-as`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: 'admin-alex' }),
        signal: abortRef.current?.signal,
      });
      if (!res2.ok) throw new Error(`Login-as after re-seed failed: ${res2.status}`);
    });

    await runTest(5, 1, async () => {
      const res = await fetch(`${base}/validate`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: abortRef.current?.signal,
      });
      if (!res.ok) throw new Error(`Validate failed: ${res.status}`);
      const data = await res.json();
      if (!data.user?.id) throw new Error('getUserById did not return user with id');
      const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (data.user.id !== payload.sub) {
        throw new Error(`getUserById(${payload.sub}) returned user.id=${data.user.id} — mismatch`);
      }
    });

    await runTest(5, 2, async () => {
      const res = await fetch(`${base}/validate`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: abortRef.current?.signal,
      });
      const data = await res.json();
      const user = data.user;
      if (!user) throw new Error('No user in response');
      if (typeof user.id !== 'string' || !user.id) throw new Error('user.id must be a non-empty string');
      if (typeof user.email !== 'string' || !user.email) throw new Error('user.email must be a non-empty string');
    });

    setRunning(false);
  }

  function stopTests() {
    abortRef.current?.abort();
    setRunning(false);
  }

  const allTests = categories.flatMap((c) => c.tests);
  const passCount = allTests.filter((r) => r.status === 'pass').length;
  const failCount = allTests.filter((r) => r.status === 'fail').length;
  const skipCount = allTests.filter((r) => r.status === 'skipped').length;
  const totalTests = allTests.length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <div className="mb-8 text-sm text-[var(--text-muted)]">
        <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">
          Packages
        </Link>
        <span className="mx-2">/</span>
        <Link href="/packages/kandi-login" className="hover:text-[var(--text-primary)] transition-colors">
          kandi-login
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--text-primary)]">Conformance Validator</span>
      </div>

      {/* Header */}
      <div className="mb-10 animate-fade-up">
        <div className="flex items-center gap-4 mb-3">
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
            <h1 className="text-2xl font-bold">kandi-login</h1>
            <p className="text-[var(--text-secondary)] text-sm">
              Integration Conformance Validator
            </p>
          </div>
        </div>
        <p className="text-[var(--text-secondary)] text-sm mt-4 max-w-2xl leading-relaxed">
          Point this at your server to verify your <code className="text-xs px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--flow-forge)]">kandi-login/server</code> integration
          is implemented correctly. Tests validate all auth endpoints, JWT structure, token lifecycle,
          test personas, and UserAdapter conformance.
        </p>
      </div>

      {/* Server URL Input */}
      <div className="glass-panel p-6 mb-6">
        <label className="block text-sm font-medium mb-3 text-[var(--text-primary)]">
          Your Auth Server URL
        </label>
        <div className="flex gap-3">
          <div className="flex-1 flex flex-col gap-2">
            <input
              type="url"
              value={serverUrl}
              onChange={(e) => {
                setServerUrl(e.target.value);
                setConnectionOk(null);
              }}
              placeholder="https://your-api.example.com"
              className="w-full px-4 py-2.5 rounded-xl text-sm font-mono"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${connectionOk === false ? 'var(--error)' : connectionOk === true ? '#00cc84' : 'var(--border-default)'}`,
                color: 'var(--text-primary)',
                outline: 'none',
              }}
              disabled={running}
            />
            <div className="flex gap-3 items-center">
              <label className="text-xs text-[var(--text-muted)]">Auth base path:</label>
              <input
                type="text"
                value={authBasePath}
                onChange={(e) => setAuthBasePath(e.target.value)}
                placeholder="/api/auth"
                className="px-3 py-1.5 rounded-lg text-xs font-mono w-40"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
                disabled={running}
              />
              <span className="text-xs text-[var(--text-muted)]">
                Full: <code className="text-[var(--flow-forge)]">{serverUrl ? getBaseUrl() : '...'}/login</code>
              </span>
            </div>
          </div>
        </div>

        {/* Reference server hint */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Try the reference server:</span>
          <button
            onClick={() => {
              setServerUrl(REFERENCE_SERVER);
              setAuthBasePath('/api/auth');
              setConnectionOk(null);
            }}
            className="text-xs px-2 py-1 rounded-md transition-colors"
            style={{
              background: 'rgba(0, 217, 255, 0.08)',
              color: '#00D9FF',
              border: '1px solid rgba(0, 217, 255, 0.2)',
            }}
            disabled={running}
          >
            {REFERENCE_SERVER}
          </button>
        </div>
      </div>

      {/* Run Controls */}
      <div className="glass-panel p-5 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={running ? stopTests : runAllTests}
            disabled={!serverUrl.trim()}
            className="px-5 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-30"
            style={{
              background: running
                ? 'rgba(255, 83, 70, 0.15)'
                : !serverUrl.trim()
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'linear-gradient(135deg, #00D9FF, #b177ff)',
              color: running ? '#ff5346' : !serverUrl.trim() ? 'var(--text-muted)' : '#000',
              border: running ? '1px solid rgba(255, 83, 70, 0.3)' : 'none',
            }}
          >
            {running ? 'Stop' : 'Run All Tests'}
          </button>

          {/* Summary */}
          {passCount + failCount + skipCount > 0 && (
            <div className="flex gap-3 text-sm">
              <span className="status-badge status-badge--pass">{passCount} passed</span>
              {failCount > 0 && <span className="status-badge status-badge--fail">{failCount} failed</span>}
              {skipCount > 0 && <span className="status-badge status-badge--pending">{skipCount} skipped</span>}
              <span className="text-[var(--text-muted)]">{totalTests} total</span>
            </div>
          )}
        </div>

        {/* Pass rate */}
        {passCount + failCount > 0 && (
          <div
            className="text-2xl font-bold"
            style={{
              color: failCount === 0 ? '#00cc84' : failCount <= 2 ? '#b177ff' : '#ff5346',
            }}
          >
            {Math.round((passCount / totalTests) * 100)}%
          </div>
        )}
      </div>

      {/* Test Results by Category */}
      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat.name}>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-2 pl-1">
              {cat.name}
            </h3>
            <div className="space-y-1.5">
              {cat.tests.map((test, testIndex) => (
                <div
                  key={testIndex}
                  className="glass-panel px-5 py-3"
                  style={{ borderRadius: '0.75rem' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusIcon status={test.status} />
                      <div className="min-w-0">
                        <span
                          className={`text-sm font-medium ${
                            test.status === 'fail'
                              ? 'text-[var(--error)]'
                              : test.status === 'skipped'
                                ? 'text-[var(--text-muted)]'
                                : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {test.name}
                        </span>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{test.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {test.duration !== undefined && (
                        <span className="text-xs text-[var(--text-muted)] font-mono">{test.duration}ms</span>
                      )}
                    </div>
                  </div>
                  {test.error && (
                    <div
                      className="mt-2 ml-8 px-3 py-2 rounded-lg text-xs font-mono leading-relaxed"
                      style={{
                        background: 'rgba(255, 83, 70, 0.08)',
                        color: '#ff5346',
                        border: '1px solid rgba(255, 83, 70, 0.15)',
                      }}
                    >
                      {test.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Spec Reference */}
      <div className="mt-12 glass-panel p-6" style={{ borderRadius: '1rem' }}>
        <h3 className="font-semibold text-sm mb-3">What this validates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs text-[var(--text-secondary)]">
          <div><code className="text-[var(--flow-forge)]">createAuthServer()</code> returns all 6 handlers + 3 test handlers</div>
          <div>JWT access tokens contain <code>sub</code>, <code>email</code>, <code>iss</code>, <code>type</code> claims</div>
          <div>Error responses use correct HTTP status codes (400, 401)</div>
          <div>Rolling refresh returns both new access and refresh tokens</div>
          <div><code>UserAdapter.findByProviderId()</code> prevents duplicate users on re-seed</div>
          <div><code>UserAdapter.getUserById()</code> resolves user from JWT sub claim</div>
          <div>Test personas are seeded via the same UserAdapter as production</div>
          <div>KandiLoginUser shape has required <code>id</code> and <code>email</code> fields</div>
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
          <a
            href="https://github.com/KandiForge/kandi-packages/tree/main/packages/kandi-login"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--flow-forge)] hover:underline"
          >
            View kandi-login documentation and source
          </a>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: TestResult['status'] }) {
  switch (status) {
    case 'pass':
      return (
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0" style={{ background: 'rgba(0, 204, 132, 0.2)', color: '#00cc84' }}>
          ✓
        </span>
      );
    case 'fail':
      return (
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0" style={{ background: 'rgba(255, 83, 70, 0.2)', color: '#ff5346' }}>
          ✗
        </span>
      );
    case 'running':
      return (
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs animate-pulse shrink-0" style={{ background: 'rgba(0, 217, 255, 0.2)', color: '#00D9FF' }}>
          ◦
        </span>
      );
    case 'skipped':
      return (
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
          —
        </span>
      );
    default:
      return (
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
          ○
        </span>
      );
  }
}
