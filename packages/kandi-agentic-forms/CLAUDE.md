# kandi-agentic-forms

AI-powered conversational form filling. An agent guides users through structured forms via SSE streaming. XML spec in, structured output files out.

## What This Package Does

Provides an agent executor that conversationally collects form data from users based on an XML specification (`kandi-agentic-form-spec`). Produces structured output files (`kandi-agentic-form-files`) including raw data JSON, session logs, and rendered documents. Supports web clients with React hooks and a framework-agnostic Node.js server SDK.

## Architecture

```
React Client (FormProvider + useAgenticForm)
    │ SSE Stream + REST API
    ▼
Node.js Server SDK (kandi-agentic-forms/server)
    │ createFormServer({ adapterConfig, sessionStore, verifyToken })
    ▼
Agent Adapter (Vercel AI SDK / Forge)
    │ streamText + tool calling
    ▼
LLM Provider (OpenAI / Anthropic / Google)
```

### Key Modules

- `core/` — types, XML spec parser (fast-xml-parser), spec validator, client-side session state machine, template interpolation
- `react/` — FormProvider context, useAgenticForm hook, useFormStream SSE hook; sub-dir `headless/`
- `server/` — createFormServer factory, session manager, form tools (agent tool definitions), output generator; sub-dir `adapters/`

### Entry Points (package.json exports)

| Import Path | Purpose |
|---|---|
| `kandi-agentic-forms` | Core + React exports |
| `kandi-agentic-forms/core` | Types, spec parser, validator, FormSession, interpolation |
| `kandi-agentic-forms/react` | FormProvider, useAgenticForm, useFormStream |
| `kandi-agentic-forms/react/headless` | HeadlessFormChat (render-prop, zero styling) |
| `kandi-agentic-forms/server` | createFormServer, VercelAdapter, SessionManager, form tools, output generator |

## Build

- Build tool: `tsup` (see `tsup.config.ts`)
- `npm run build` — builds ESM + CJS + types
- `npm run dev` — watch mode
- Output: `dist/`

## Key Design Decisions

- **Agent adapter abstraction** — `AgentAdapter` interface in `server/adapters/types.ts` allows swapping between Vercel AI SDK and a future Forge adapter
- **Vercel AI SDK agent mode** — uses `streamText` with `maxSteps` for autonomous multi-step tool calling
- **Form tools, not prompt parsing** — agent uses structured tool calls (`update_field`, `confirm_field`, `complete_form`) instead of free-text extraction
- **MCP server scoping** — form specs declare allowed MCP servers per-form, defining the agent's capability boundaries
- **Framework-agnostic server** — handlers use FormRequest/FormResponse interfaces, mountable on any Node.js framework
- **Fetch-based SSE** — client uses fetch + ReadableStream (not EventSource) to support Bearer token auth headers
- **Auth via kandi-login** — client sends kandi-login JWT, server validates via `verifyToken` config
- **XML spec format** — `<agentic-form>` root with `<agent>`, `<sections>`, `<output>`, `<mcp-servers>` children
- **Session store adapter** — consumers implement `SessionStoreAdapter` for persistence (includes `getSpec` for spec retrieval)

## Server Route Handlers

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
| `handleValidateSpec` | POST | Validate XML spec (no auth required) |

## SessionStoreAdapter Interface (7 methods)

```
createSession(userId, spec)          → sessionId
getSession(sessionId)                → session | null
getSpec(sessionId)                   → spec | null
updateSession(sessionId, patch)      → void
deleteSession(sessionId)             → void
listUserSessions(userId)             → sessions[]
storeOutputFiles?(sessionId, manifest, files) → void
getOutputFile?(sessionId, fileId)    → { data, filename, mimeType } | null
```

## Form Tools (Agent Tool Definitions)

| Tool | Purpose |
|---|---|
| `update_field` | Set a field value with validation |
| `confirm_field` | Mark field as user-confirmed |
| `get_progress` | Return completion status per section |
| `skip_field` | Skip an optional field |
| `request_file_upload` | Signal client for file/signature upload |
| `complete_form` | Finalize when all required fields done |

## Output Files (kandi-agentic-form-files)

- `manifest.json` — file list with hashes, session metadata, form spec hash
- `form-data.json` — collected values organized by section
- `session-log.json` — timestamped event log (field_collected, field_skipped, confirmations)
- Rendered files (PDF/CSV/HTML) — from templates referenced in spec (future)
