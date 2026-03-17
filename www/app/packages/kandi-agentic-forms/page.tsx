'use client';

import Link from 'next/link';

const features = [
  {
    icon: '📋',
    title: 'XML Form Specs',
    description: 'Declarative <agentic-form> format defines fields, agent behavior, validation, conditions, and output files.',
  },
  {
    icon: '🤖',
    title: 'Agent Adapter',
    description: 'Abstract interface for AI providers. Ships with Vercel AI SDK adapter — swap in your own.',
  },
  {
    icon: '🔧',
    title: 'MCP Servers',
    description: 'Each form spec declares which MCP servers the agent can use — per-form capability boundaries.',
  },
  {
    icon: '📡',
    title: 'SSE Streaming',
    description: 'Real-time agent responses via Server-Sent Events with Bearer token auth.',
  },
  {
    icon: '🎨',
    title: 'MUI Container',
    description: 'Glassmorphism chat drawer + artifact timeline. Stop button, progress bar, file preview.',
  },
  {
    icon: '📦',
    title: 'Output Files',
    description: 'Produces manifest.json, form-data.json, session-log.json, and rendered files from templates.',
  },
];

const serverHandlers = [
  { method: 'POST', path: '/sessions', handler: 'handleCreateSession', description: 'Create session from XML spec' },
  { method: 'GET', path: '/sessions/:id/stream', handler: 'handleStream', description: 'SSE stream for session events' },
  { method: 'POST', path: '/sessions/:id/message', handler: 'handleSendMessage', description: 'Send user message to agent' },
  { method: 'GET', path: '/sessions/:id', handler: 'handleGetSession', description: 'Get session state' },
  { method: 'POST', path: '/sessions/:id/complete', handler: 'handleComplete', description: 'Trigger output generation' },
  { method: 'DELETE', path: '/sessions/:id', handler: 'handleDeleteSession', description: 'Cancel/delete session' },
  { method: 'POST', path: '/specs/validate', handler: 'handleValidateSpec', description: 'Validate XML spec' },
];

const entryPoints = [
  { path: 'kandi-agentic-forms', description: 'Core + React exports' },
  { path: 'kandi-agentic-forms/core', description: 'Types, spec parser, validator, FormSession' },
  { path: 'kandi-agentic-forms/react', description: 'FormProvider, useAgenticForm, useFormStream' },
  { path: 'kandi-agentic-forms/react/headless', description: 'HeadlessFormChat (render-prop)' },
  { path: 'kandi-agentic-forms/react/mui', description: 'KandiAgenticFormContainer + styled components' },
  { path: 'kandi-agentic-forms/server', description: 'createFormServer, VercelAdapter, SessionManager' },
];

const installSnippet = `npm install kandi-agentic-forms

# Server (pick your LLM provider)
npm install ai @ai-sdk/anthropic

# MUI components (optional)
npm install @mui/material @emotion/react @emotion/styled`;

const serverSnippet = `import { createFormServer } from 'kandi-agentic-forms/server';

const forms = createFormServer({
  adapterConfig: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-sonnet-4-20250514',
  },
  sessionStore: mySessionStore,
  verifyToken: async (token) => auth.verifyToken(token),
});

// Mount on Express, Next.js, Vercel, Fastify, etc.
app.post('/forms/sessions', forms.handleCreateSession);
app.get('/forms/sessions/stream', forms.handleStream);
app.post('/forms/sessions/message', forms.handleSendMessage);`;

const clientSnippet = `import { FormProvider } from 'kandi-agentic-forms/react';
import { KandiAgenticFormContainer } from 'kandi-agentic-forms/react/mui';

function App() {
  return (
    <FormProvider config={{ formServerUrl: '/api/forms', getToken }}>
      <KandiAgenticFormContainer height="600px" />
    </FormProvider>
  );
}`;

const specSnippet = `<agentic-form name="project-setup" version="1.0">
  <agent>
    <tone>professional-friendly</tone>
    <greeting>Let's set up your project!</greeting>
    <error-recovery strategy="retry-with-hint" max-retries="3" />
  </agent>

  <sections>
    <section id="basics" label="Project Basics" order="1">
      <field id="name" type="text" required="true">
        <label>Project Name</label>
        <validation>
          <pattern regex="^[a-z][a-z0-9-]*$" message="Lowercase with hyphens" />
        </validation>
      </field>
      <field id="framework" type="select" required="true">
        <label>Framework</label>
        <options>
          <option value="nextjs">Next.js</option>
          <option value="remix">Remix</option>
          <option value="astro">Astro</option>
        </options>
      </field>
    </section>
  </sections>

  <output>
    <manifest filename="manifest.json" />
    <raw-data filename="project-config.json" />
    <session-log filename="setup-log.json" />
  </output>
</agentic-form>`;

export default function KandiAgenticFormsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <nav className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        <Link href="/" className="hover:text-[var(--text-secondary)] transition-colors">
          Packages
        </Link>
        <span className="mx-2">/</span>
        <span style={{ color: 'var(--text-secondary)' }}>kandi-agentic-forms</span>
      </nav>

      {/* Hero */}
      <section className="mb-16 animate-fade-up">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-4xl">🤖</span>
          <div>
            <h1
              className="font-bold tracking-tight"
              style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', lineHeight: 1.1 }}
            >
              kandi-
              <span
                style={{
                  background: 'linear-gradient(135deg, #b177ff, #00D9FF)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                agentic-forms
              </span>
            </h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">v0.1.0 · MIT · KandiForge</p>
          </div>
        </div>
        <p className="text-[var(--text-secondary)] text-lg max-w-3xl leading-relaxed">
          AI-powered conversational system where an agent uses MCP tools and chat to guide users
          toward a predefined end state. XML spec in, structured output files out.
        </p>
      </section>

      {/* Architecture */}
      <section className="mb-16">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold tracking-widest uppercase mb-6">
          Architecture
        </h2>
        <div
          className="rounded-xl p-6 font-mono text-sm leading-relaxed"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <pre>{`React Client (FormProvider + KandiAgenticFormContainer)
    │ SSE Stream + REST API
    ▼
Node.js Server SDK (kandi-agentic-forms/server)
    │ createFormServer({ adapterConfig, sessionStore, verifyToken })
    ▼
Agent Adapter (Vercel AI SDK / Forge)
    │ streamText + tool calling + MCP servers
    ▼
LLM Provider (OpenAI / Anthropic)`}</pre>
        </div>
      </section>

      {/* Features */}
      <section className="mb-16">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold tracking-widest uppercase mb-6">
          Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl p-4"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-[var(--text-muted)] text-xs leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Getting Started */}
      <section className="mb-16">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold tracking-widest uppercase mb-6">
          Getting Started
        </h2>
        <div className="space-y-8">
          {/* Step 1 */}
          <Step number={1} title="Install">
            <CodeBlock label="terminal" code={installSnippet} />
          </Step>

          {/* Step 2 */}
          <Step number={2} title="Define a Form Spec (XML)">
            <p className="text-[var(--text-muted)] text-sm mb-3">
              Create an XML file that defines what data to collect, agent behavior, validation rules, and output files.
            </p>
            <CodeBlock label="project-setup.xml" code={specSnippet} />
          </Step>

          {/* Step 3 */}
          <Step number={3} title="Create the Server">
            <CodeBlock label="lib/form-server.ts" code={serverSnippet} />
          </Step>

          {/* Step 4 */}
          <Step number={4} title="Add the Client">
            <CodeBlock label="app.tsx" code={clientSnippet} />
          </Step>
        </div>
      </section>

      {/* Entry Points */}
      <section className="mb-16">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold tracking-widest uppercase mb-6">
          Entry Points
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium text-xs">Import Path</th>
                <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium text-xs">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {entryPoints.map((ep) => (
                <tr key={ep.path} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: '#b177ff' }}>{ep.path}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)] text-xs">{ep.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Server Handlers */}
      <section className="mb-16">
        <h2 className="text-[var(--text-muted)] text-xs font-semibold tracking-widest uppercase mb-6">
          Server Handlers
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium text-xs">Method</th>
                <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium text-xs">Path</th>
                <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium text-xs">Description</th>
              </tr>
            </thead>
            <tbody>
              {serverHandlers.map((h) => (
                <tr key={h.handler} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-4 py-2.5">
                    <span
                      className="font-mono text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: h.method === 'GET' ? '#00cc8420' : h.method === 'POST' ? '#2196f320' : '#f4433620',
                        color: h.method === 'GET' ? '#00cc84' : h.method === 'POST' ? '#2196f3' : '#f44336',
                      }}
                    >
                      {h.method}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-secondary)]">{h.path}</td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)] text-xs">{h.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Links */}
      <section className="mb-16">
        <div className="flex gap-4">
          <a
            href="https://github.com/KandiForge/kandi-packages/tree/main/packages/kandi-agentic-forms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/kandi-agentic-forms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: '#b177ff20', border: '1px solid #b177ff40', color: '#b177ff' }}
          >
            npm
          </a>
        </div>
      </section>

      {/* Back */}
      <Link
        href="/"
        className="text-sm transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        ← Back to packages
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span
          className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
          style={{ background: '#b177ff20', color: '#b177ff', border: '1px solid #b177ff40' }}
        >
          {number}
        </span>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="ml-10">{children}</div>
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
      <pre
        className="p-4 text-sm font-mono leading-relaxed overflow-x-auto"
        style={{ color: 'var(--text-secondary)' }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
