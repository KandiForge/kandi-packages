'use client';

import Link from 'next/link';

const muiSnippet = `import { FormProvider } from 'kandi-agentic-forms/react';
import { KandiAgenticFormContainer } from 'kandi-agentic-forms/react/mui';
import { useAuth } from 'kandi-login/react';

function AgenticFormPage() {
  const { getToken } = useAuth();
  const specXml = \`<agentic-form name="intake" version="1.0">...</agentic-form>\`;

  return (
    <FormProvider
      config={{ formServerUrl: '/api/forms', getToken }}
      onSessionComplete={(files) => console.log('Completed:', files)}
    >
      <StartButton specXml={specXml} />
      <KandiAgenticFormContainer
        height="600px"
        drawerWidth={380}
        defaultDrawerOpen={true}
        onStop={() => console.log('Agent interrupted')}
      />
    </FormProvider>
  );
}

function StartButton({ specXml }: { specXml: string }) {
  const { startSession, isLoading, session } = useAgenticForm();
  if (session) return null; // already started
  return (
    <button onClick={() => startSession(specXml)} disabled={isLoading}>
      Start Form
    </button>
  );
}`;

const headlessSnippet = `import { HeadlessFormChat } from 'kandi-agentic-forms/react/headless';

<HeadlessFormChat>
  {({ messages, sendMessage, progress, isConnected, spec }) => (
    <div className="flex flex-col h-full">
      <progress value={progress} max={1} />

      <div className="flex-1 overflow-y-auto">
        {messages.map(msg => (
          <div key={msg.id} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
            <span className="text-xs text-gray-500">{msg.role}</span>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>

      <input
        placeholder="Type a message..."
        onKeyDown={e => {
          if (e.key === 'Enter') {
            sendMessage(e.currentTarget.value);
            e.currentTarget.value = '';
          }
        }}
      />
    </div>
  )}
</HeadlessFormChat>`;

const hookSnippet = `import { useAgenticForm } from 'kandi-agentic-forms/react';

function MyComponent() {
  const {
    session,        // AgenticFormSession | null
    messages,       // FormMessage[]
    progress,       // number (0-1)
    isLoading,      // boolean
    isConnected,    // boolean (SSE stream)
    error,          // string | null
    spec,           // AgenticFormSpec | null
    startSession,   // (specXml: string) => Promise<void>
    sendMessage,    // (content: string) => Promise<void>
    getFiles,       // () => Promise<AgenticOutputFile[]>
    cancelSession,  // () => Promise<void>
    interrupt,      // () => void — stop current agent turn
  } = useAgenticForm();
}`;

const muiComponents = [
  { name: 'KandiAgenticFormContainer', description: 'Top-level layout — artifact timeline + collapsible chat drawer' },
  { name: 'ChatPanel', description: 'Glassmorphism chat drawer with auto-scroll and connection indicator' },
  { name: 'ChatInput', description: 'Text input with send + stop (interrupt) buttons' },
  { name: 'MessageBubble', description: 'Role-based message styling (agent/user/system)' },
  { name: 'ArtifactTimeline', description: 'Scrollable timeline of artifacts produced by the agent' },
  { name: 'ArtifactCard', description: 'Expandable card for files, milestones, and field updates' },
  { name: 'ProgressBar', description: 'Section-aware progress bar with color transitions' },
  { name: 'FieldStatusChip', description: 'Tiny colored badge — pending, collected, confirmed, error, skipped' },
  { name: 'useArtifacts', description: 'Hook that derives artifact timeline from session state changes' },
];

export default function ReactPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <nav className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        <Link href="/" className="hover:text-[var(--text-secondary)] transition-colors">Packages</Link>
        <span className="mx-2">/</span>
        <Link href="/packages/kandi-agentic-forms" className="hover:text-[var(--text-secondary)] transition-colors">kandi-agentic-forms</Link>
        <span className="mx-2">/</span>
        <span style={{ color: 'var(--text-secondary)' }}>React</span>
      </nav>

      {/* Hero */}
      <section className="mb-12 animate-fade-up">
        <div className="flex items-center gap-3 mb-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="#b177ff" strokeWidth="1.5" className="w-8 h-8">
            <circle cx="12" cy="12" r="10" />
            <ellipse cx="12" cy="12" rx="4" ry="10" />
            <path d="M2 12h20" />
          </svg>
          <h1 className="text-2xl font-bold">React Client</h1>
          <span className="status-badge status-badge--pass text-xs">Available</span>
        </div>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-3xl">
          Three rendering options: <strong>MUI container</strong> (styled, ready to use), <strong>headless</strong> (render-prop, zero styling),
          or <strong>hooks only</strong> (full custom). All require a {'<FormProvider>'} wrapper.
        </p>
      </section>

      {/* Quick Start */}
      <section className="mb-12">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold tracking-widest uppercase mb-6">
          Option 1 — MUI Container (Recommended)
        </h2>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          Drop-in container with glassmorphism chat drawer, artifact timeline, progress bar, and stop button.
          Requires <code className="text-[#b177ff]">@mui/material</code>.
        </p>
        <CodeBlock label="app.tsx" code={muiSnippet} />
      </section>

      <section className="mb-12">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold tracking-widest uppercase mb-6">
          Option 2 — Headless (Custom UI)
        </h2>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          Zero-styled render-prop component. You control all markup and styling.
        </p>
        <CodeBlock label="custom-form.tsx" code={headlessSnippet} />
      </section>

      <section className="mb-12">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold tracking-widest uppercase mb-6">
          Option 3 — Hooks Only
        </h2>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          Use <code className="text-[#b177ff]">useAgenticForm()</code> directly for maximum control.
        </p>
        <CodeBlock label="hooks.ts" code={hookSnippet} />
      </section>

      {/* MUI Component Reference */}
      <section className="mb-12">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold tracking-widest uppercase mb-6">
          MUI Component Reference
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium text-xs">Component</th>
                <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium text-xs">Description</th>
              </tr>
            </thead>
            <tbody>
              {muiComponents.map((c) => (
                <tr key={c.name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: '#b177ff' }}>{c.name}</td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)] text-xs">{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Back */}
      <Link href="/packages/kandi-agentic-forms" className="text-sm" style={{ color: 'var(--text-muted)' }}>
        ← Back to kandi-agentic-forms
      </Link>
    </div>
  );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center px-4 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <pre className="p-4 text-sm font-mono leading-relaxed overflow-x-auto" style={{ color: 'var(--text-secondary)' }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
