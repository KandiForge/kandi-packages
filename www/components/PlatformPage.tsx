'use client';

import Link from 'next/link';

interface QuickStartStep {
  title: string;
  code?: string;
}

interface PlatformPageProps {
  name: string;
  slug: string;
  icon: React.ReactNode;
  color: string;
  status: 'Available' | 'Coming Soon';
  description: string;
  configSnippet: string;
  configLanguage: string;
  quickStartSteps: QuickStartStep[];
  switchServerNote: string;
  testFrameworks: string[];
  testSnippet: string;
  testSnippetLanguage: string;
}

export function PlatformPage({
  name,
  slug,
  icon,
  color,
  status,
  description,
  configSnippet,
  configLanguage,
  quickStartSteps,
  switchServerNote,
  testFrameworks,
  testSnippet,
  testSnippetLanguage,
}: PlatformPageProps) {
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
        <span className="text-[var(--text-primary)]">{name}</span>
      </div>

      {/* Header */}
      <section className="mb-12 animate-fade-up">
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${color}22, ${color}11)`,
              border: `1px solid ${color}33`,
              color,
            }}
          >
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">kandi-login / {name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span
                className={`status-badge ${status === 'Available' ? 'status-badge--pass' : 'status-badge--pending'}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: status === 'Available' ? '#00cc84' : '#b177ff' }}
                />
                {status}
              </span>
            </div>
          </div>
        </div>
        <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-2xl">{description}</p>
      </section>

      {/* Download Example */}
      <section className="mb-12">
        <a
          href={`https://github.com/KandiForge/kandi-packages/tree/main/examples/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-6 py-3 rounded-xl font-medium text-sm no-underline transition-all hover:scale-[1.02]"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
            color: '#000',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Download Example Project
        </a>
      </section>

      {/* Quick Start */}
      <section className="mb-12">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Quick Start
        </h2>
        <div className="glass-panel p-6">
          <div className="space-y-5">
            {quickStartSteps.map((step, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{
                    background: `linear-gradient(135deg, ${color}22, ${color}11)`,
                    border: `1px solid ${color}33`,
                    color,
                  }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] font-medium text-sm">{step.title}</p>
                  {step.code && (
                    <pre
                      className="mt-2 px-4 py-3 rounded-lg text-sm font-mono overflow-x-auto"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
                    >
                      <code>{step.code}</code>
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auth Config */}
      <section className="mb-12">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Auth Configuration
        </h2>
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)]">
            <span className="text-xs text-[var(--text-muted)] font-mono">{configLanguage}</span>
          </div>
          <pre className="p-4 text-sm font-mono leading-relaxed overflow-x-auto" style={{ color: 'var(--text-secondary)' }}>
            <code>{configSnippet}</code>
          </pre>
        </div>
      </section>

      {/* Switch to Your Server */}
      <section className="mb-12">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Switch to Your Server
        </h2>
        <div className="glass-panel p-6">
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
            The example app points to the KandiForge reference server by default. Once you have your own server running:
          </p>
          <div
            className="px-4 py-3 rounded-lg text-sm font-mono overflow-x-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <code>{switchServerNote}</code>
          </div>
          <p className="text-[var(--text-muted)] text-xs mt-3">
            Run the{' '}
            <Link href="/packages/kandi-login/validator" className="text-[var(--flow-forge)] hover:underline">
              conformance validator
            </Link>{' '}
            against your server to confirm it implements all required endpoints.
          </p>
        </div>
      </section>

      {/* Test Personas on this Platform */}
      <section className="mb-12">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Test Personas for Automated Testing
        </h2>
        <div className="glass-panel p-6">
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
            Use the test persona system to authenticate in{' '}
            {testFrameworks.map((fw, i) => (
              <span key={fw}>
                <strong className="text-[var(--text-primary)]">{fw}</strong>
                {i < testFrameworks.length - 2 ? ', ' : i === testFrameworks.length - 2 ? ', and ' : ''}
              </span>
            ))}{' '}
            tests without launching a browser OAuth flow.
          </p>

          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-muted)] font-mono">{testSnippetLanguage}</span>
              <span className="status-badge status-badge--pass">No browser needed</span>
            </div>
            <pre className="p-4 text-sm font-mono leading-relaxed overflow-x-auto" style={{ color: 'var(--text-secondary)' }}>
              <code>{testSnippet}</code>
            </pre>
          </div>

          <p className="text-[var(--text-muted)] text-xs mt-3">
            Default personas: <code className="text-[var(--flow-forge)]">admin-alex</code>,{' '}
            <code className="text-[var(--flow-forge)]">designer-dana</code>,{' '}
            <code className="text-[var(--flow-forge)]">viewer-val</code>,{' '}
            <code className="text-[var(--flow-forge)]">new-user-naya</code>.{' '}
            <Link href="/packages/kandi-login" className="text-[var(--flow-forge)] hover:underline">
              See all personas
            </Link>
          </p>
        </div>
      </section>

      {/* Back link */}
      <div className="text-sm">
        <Link href="/packages/kandi-login" className="text-[var(--flow-forge)] hover:underline">
          Back to kandi-login overview
        </Link>
      </div>
    </div>
  );
}
