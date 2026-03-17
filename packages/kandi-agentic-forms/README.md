# kandi-agentic-forms

AI-powered conversational form filling for React. An agent guides users toward a predefined end state via chat + MCP tools — producing structured output files when complete.

```
React Client (FormProvider + KandiAgenticFormContainer)
    │ SSE Stream + REST API
    ▼
Node.js Server SDK (kandi-agentic-forms/server)
    │ createFormServer({ adapterConfig, sessionStore, verifyToken })
    ▼
Agent Adapter (Vercel AI SDK / Forge)
    │ streamText + tool calling + MCP servers
    ▼
LLM Provider (OpenAI / Anthropic)
```

## Features

- **XML form specs** — declarative `<agentic-form>` format defines what to collect, agent behavior, and output files
- **Agent adapter abstraction** — swap between Vercel AI SDK and custom adapters
- **MCP server scoping** — each form spec declares which MCP servers the agent can use
- **Structured tool calling** — agent uses `update_field`, `confirm_field`, `complete_form` tools (not free-text parsing)
- **SSE streaming** — real-time agent responses via Server-Sent Events
- **MUI container component** — glassmorphism chat drawer + artifact timeline, ready to use
- **Headless components** — render-prop pattern for custom UIs
- **Framework-agnostic server** — mount on Express, Next.js, Vercel, Fastify, etc.
- **kandi-login auth** — reuses existing JWT tokens (optional)

## Install

```bash
npm install kandi-agentic-forms
```

### Peer Dependencies

**Required:**
```bash
npm install react react-dom
```

**Server (pick your LLM provider):**
```bash
npm install ai @ai-sdk/openai    # OpenAI
npm install ai @ai-sdk/anthropic  # Anthropic
```

**MUI components (optional):**
```bash
npm install @mui/material @emotion/react @emotion/styled
```

**Auth (optional):**
```bash
npm install kandi-login
```

## Quick Start

### 1. Define a Form Spec (XML)

```xml
<agentic-form name="project-setup" version="1.0">
  <agent>
    <tone>professional-friendly</tone>
    <system-prompt>
      You are a project setup assistant. Help the user configure
      their new project by collecting the required information.
    </system-prompt>
    <greeting>Hi! Let's set up your new project. What would you like to name it?</greeting>
    <error-recovery strategy="retry-with-hint" max-retries="3" />
    <capabilities>
      <allow-skip-optional>true</allow-skip-optional>
      <allow-go-back>true</allow-go-back>
    </capabilities>
  </agent>

  <sections>
    <section id="basics" label="Project Basics" order="1">
      <field id="name" type="text" required="true">
        <label>Project Name</label>
        <prompt>What would you like to name your project?</prompt>
        <validation>
          <pattern regex="^[a-z][a-z0-9-]*$" message="Must be lowercase with hyphens only" />
          <min-length>3</min-length>
          <max-length>50</max-length>
        </validation>
      </field>

      <field id="framework" type="select" required="true">
        <label>Framework</label>
        <options>
          <option value="nextjs">Next.js</option>
          <option value="remix">Remix</option>
          <option value="astro">Astro</option>
          <option value="vite">Vite + React</option>
        </options>
      </field>

      <field id="description" type="textarea" required="false">
        <label>Description</label>
        <hint>A brief description of your project (optional)</hint>
      </field>
    </section>

    <section id="deployment" label="Deployment" order="2">
      <field id="provider" type="select" required="true">
        <label>Deploy Target</label>
        <options>
          <option value="vercel">Vercel</option>
          <option value="aws">AWS</option>
          <option value="self-hosted">Self-hosted</option>
        </options>
      </field>

      <field id="domain" type="text" required="false">
        <label>Custom Domain</label>
        <condition>
          <when field="deployment.provider" not-equals="self-hosted" />
        </condition>
      </field>
    </section>
  </sections>

  <output>
    <manifest filename="manifest.json" />
    <raw-data filename="project-config.json" />
    <session-log filename="setup-log.json" />
  </output>
</agentic-form>
```

### 2. Server — Create Form Server

```typescript
import { createFormServer } from 'kandi-agentic-forms/server';

const forms = createFormServer({
  adapterConfig: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-sonnet-4-20250514',
    maxSteps: 10,
  },
  sessionStore: mySessionStore, // implement SessionStoreAdapter
  verifyToken: async (token) => {
    // validate JWT from kandi-login, or your own auth
    return { sub: 'user-123' };
  },
});
```

### 3. Server — Mount Routes

**Next.js App Router:**
```typescript
// app/api/forms/sessions/route.ts
import { forms } from '@/lib/form-server';

export async function POST(req: Request) {
  const body = await req.json();
  const res = createFormResponse();
  await forms.handleCreateSession(
    { method: 'POST', query: {}, headers: Object.fromEntries(req.headers), body },
    res,
  );
  return res.toNextResponse();
}
```

**Express:**
```typescript
app.post('/forms/sessions', forms.handleCreateSession);
app.get('/forms/sessions/stream', forms.handleStream);
app.post('/forms/sessions/message', forms.handleSendMessage);
app.get('/forms/sessions', forms.handleGetSession);
app.post('/forms/sessions/complete', forms.handleComplete);
app.delete('/forms/sessions', forms.handleDeleteSession);
app.get('/forms/sessions/files', forms.handleGetFiles);
app.get('/forms/sessions/files/download', forms.handleDownloadFile);
app.post('/forms/specs/validate', forms.handleValidateSpec);
```

### 4. Client — MUI Container (Recommended)

```tsx
import { FormProvider } from 'kandi-agentic-forms/react';
import { KandiAgenticFormContainer } from 'kandi-agentic-forms/react/mui';
import { useAuth } from 'kandi-login/react';

function App() {
  const { getToken } = useAuth();

  return (
    <FormProvider
      config={{
        formServerUrl: '/api/forms',
        getToken,
      }}
      onSessionComplete={(files) => console.log('Done!', files)}
    >
      <KandiAgenticFormContainer
        height="600px"
        drawerWidth={380}
        onStop={() => console.log('Agent interrupted')}
      />
    </FormProvider>
  );
}
```

### 5. Client — Start a Session

```tsx
import { useAgenticForm } from 'kandi-agentic-forms/react';

function StartButton({ specXml }: { specXml: string }) {
  const { startSession, isLoading } = useAgenticForm();

  return (
    <button onClick={() => startSession(specXml)} disabled={isLoading}>
      Start Form
    </button>
  );
}
```

### 6. Client — Headless (Custom UI)

```tsx
import { HeadlessFormChat } from 'kandi-agentic-forms/react/headless';

<HeadlessFormChat>
  {({ messages, sendMessage, progress, isConnected, spec }) => (
    <div>
      <progress value={progress} max={1} />
      {messages.map(msg => (
        <div key={msg.id} className={msg.role}>
          {msg.content}
        </div>
      ))}
      <input onKeyDown={e => {
        if (e.key === 'Enter') sendMessage(e.currentTarget.value);
      }} />
    </div>
  )}
</HeadlessFormChat>
```

## Entry Points

| Import Path | Purpose |
|---|---|
| `kandi-agentic-forms` | Core + React exports |
| `kandi-agentic-forms/core` | Types, spec parser, validator, FormSession |
| `kandi-agentic-forms/react` | FormProvider, useAgenticForm, useFormStream |
| `kandi-agentic-forms/react/headless` | HeadlessFormChat (render-prop, zero styling) |
| `kandi-agentic-forms/react/mui` | KandiAgenticFormContainer + styled components |
| `kandi-agentic-forms/server` | createFormServer, VercelAdapter, SessionManager |

## SessionStoreAdapter

Implement this interface to connect the form server to your database:

```typescript
interface SessionStoreAdapter {
  createSession(userId: string, spec: AgenticFormSpec): Promise<string>;
  getSession(sessionId: string): Promise<AgenticFormSession | null>;
  getSpec(sessionId: string): Promise<AgenticFormSpec | null>;
  updateSession(sessionId: string, patch: Partial<AgenticFormSession>): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  listUserSessions(userId: string): Promise<AgenticFormSession[]>;
  storeOutputFiles?(sessionId: string, manifest: AgenticFormManifest, files: Map<string, Buffer>): Promise<void>;
  getOutputFile?(sessionId: string, fileId: string): Promise<{ data: Buffer; filename: string; mimeType: string } | null>;
}
```

## Server Handlers

| Handler | Method | Description |
|---|---|---|
| `handleCreateSession` | POST | Create session from XML spec |
| `handleStream` | GET | SSE stream for session events |
| `handleSendMessage` | POST | Send user message to agent |
| `handleGetSession` | GET | Get session state |
| `handleComplete` | POST | Trigger output generation |
| `handleDeleteSession` | DELETE | Cancel/delete session |
| `handleGetFiles` | GET | List output files |
| `handleDownloadFile` | GET | Download an output file |
| `handleValidateSpec` | POST | Validate XML spec |

## Form Tools

The agent automatically has access to these tools during a session:

| Tool | Description |
|---|---|
| `update_field` | Set a field value with validation |
| `confirm_field` | Mark field as user-confirmed |
| `get_progress` | Return completion status per section |
| `skip_field` | Skip an optional field |
| `request_file_upload` | Signal client for file upload UI |
| `complete_form` | Finalize the session |

## XML Spec Reference

### Root Element

```xml
<agentic-form name="form-name" version="1.0">
```

### Agent Configuration

```xml
<agent>
  <tone>professional-friendly</tone>
  <system-prompt>Custom instructions for the agent</system-prompt>
  <greeting>Opening message to the user</greeting>
  <completion-message>Thanks, {{fields.basics.name}}!</completion-message>
  <error-recovery strategy="retry-with-hint" max-retries="3" />
  <confirmations>
    <confirm before="submit">Please confirm all details are correct.</confirm>
  </confirmations>
  <capabilities>
    <allow-skip-optional>true</allow-skip-optional>
    <allow-go-back>true</allow-go-back>
    <allow-save-progress>false</allow-save-progress>
  </capabilities>
</agent>
```

### Field Types

`text` · `textarea` · `number` · `date` · `datetime` · `select` · `multi-select` · `checkbox` · `file` · `signature` · `repeatable`

### Conditional Fields

```xml
<field id="domain" type="text" required="false">
  <label>Custom Domain</label>
  <condition>
    <when field="deployment.provider" not-equals="self-hosted" />
  </condition>
</field>
```

### MCP Servers (per-form)

```xml
<mcp-servers>
  <mcp-server id="validator" transport="stdio">
    <name>Config Validator</name>
    <endpoint>npx</endpoint>
    <args><arg>my-validator</arg></args>
    <allowed-tools>
      <tool>validate_config</tool>
      <tool>check_dependencies</tool>
    </allowed-tools>
  </mcp-server>
</mcp-servers>
```

### Output Files

```xml
<output>
  <manifest filename="manifest.json" />
  <raw-data filename="form-data.json" />
  <session-log filename="session-log.json" />
  <rendered-file id="summary" format="html">
    <template ref="templates/summary.hbs" />
    <filename>{{fields.basics.name}}-summary.html</filename>
  </rendered-file>
</output>
```

## Output Files (kandi-agentic-form-files)

When a session completes, these files are generated:

- **manifest.json** — file list with SHA-256 hashes, session metadata, form spec hash
- **form-data.json** — collected values organized by section
- **session-log.json** — timestamped event log (field_collected, field_skipped, confirmations)
- **Rendered files** — from templates (PDF, CSV, HTML) referenced in the spec

## MUI Container Components

Import from `kandi-agentic-forms/react/mui`:

| Component | Description |
|---|---|
| `KandiAgenticFormContainer` | Main container — artifact timeline + collapsible chat drawer |
| `ChatPanel` | Glassmorphism chat drawer with auto-scroll + connection indicator |
| `ChatInput` | Text input with send + stop (interrupt) buttons |
| `MessageBubble` | Role-based chat message styling |
| `ArtifactTimeline` | Scrollable timeline of artifacts produced by the agent |
| `ArtifactCard` | Expandable card for files, milestones, field updates |
| `ProgressBar` | Section-aware progress with color transitions |
| `FieldStatusChip` | Status badge (pending/collected/confirmed/error) |
| `useArtifacts` | Hook that derives artifact timeline from session state |

## Environment Variables

```bash
# LLM Provider (server-side only — never expose to client)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# JWT (if using kandi-login)
JWT_SECRET=your-secret-min-32-chars
```

## License

MIT — [KandiForge](https://github.com/KandiForge)
