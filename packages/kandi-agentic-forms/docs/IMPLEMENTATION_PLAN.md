# kandi-agentic-forms — Implementation Plan

## Overview

AI-powered conversational system where an agent uses MCP tools and conversation to guide users toward a **predefined end state** defined in an XML specification (`kandi-agentic-form-spec`). The end state produces a set of output files (`kandi-agentic-form-files`). Use cases include data collection, build documentation, configuration workflows, and artifact assembly.

---

## Phase 1: Core Package Scaffold ✅ COMPLETE

**Goal:** Establish the package structure, types, and build system.

### Deliverables
- [x] Package scaffold (package.json, tsconfig.json, tsup.config.ts, eslint.config.js)
- [x] Core types (`src/core/types.ts`) — all shared interfaces for specs, sessions, SSE events, output files, MCP servers
- [x] XML spec parser (`src/core/form-spec-parser.ts`) — `fast-xml-parser` based, converts XML → `AgenticFormSpec`
- [x] Spec validator (`src/core/form-spec-validator.ts`) — semantic validation (field refs, conditions, nesting, options)
- [x] Template interpolator (`src/core/template-interpolator.ts`) — `{{expression}}` resolution
- [x] Client-side session state machine (`src/core/form-session.ts`) — applies SSE events, tracks progress
- [x] Barrel exports for `core`, `react`, `react/headless`, `server`
- [x] Build passing: ESM + CJS + DTS

### Export Paths
| Path | Status |
|---|---|
| `kandi-agentic-forms` | ✅ |
| `kandi-agentic-forms/core` | ✅ |
| `kandi-agentic-forms/react` | ✅ |
| `kandi-agentic-forms/react/headless` | ✅ |
| `kandi-agentic-forms/server` | ✅ |

---

## Phase 2: Server Foundation ✅ COMPLETE

**Goal:** Framework-agnostic server SDK with agent adapter abstraction.

### Deliverables
- [x] Server types (`src/server/types.ts`) — FormRequest/FormResponse, FormServerConfig, SessionStoreAdapter
- [x] Agent adapter interface (`src/server/adapters/types.ts`) — `AgentAdapter`, `AgentStreamResult`, `AgentStreamPart`
- [x] Vercel AI SDK adapter (`src/server/adapters/vercel-adapter.ts`) — `streamText` + `maxSteps` agent mode
- [x] Form tools (`src/server/form-tools.ts`) — auto-generated from spec: update_field, confirm_field, get_progress, skip_field, request_file_upload, complete_form
- [x] Session manager (`src/server/session-manager.ts`) — session lifecycle, SSE event emission, event logging
- [x] Output generator (`src/server/output-generator.ts`) — produces manifest.json, form-data.json, session-log.json
- [x] Server factory (`src/server/create-form-server.ts`) — `createFormServer(config)` returns 9 framework-agnostic handlers

### Server Handlers
| Handler | Method | Path |
|---|---|---|
| handleCreateSession | POST | /sessions |
| handleStream | GET | /sessions/:id/stream |
| handleSendMessage | POST | /sessions/:id/message |
| handleGetSession | GET | /sessions/:id |
| handleComplete | POST | /sessions/:id/complete |
| handleDeleteSession | DELETE | /sessions/:id |
| handleGetFiles | GET | /sessions/:id/files |
| handleDownloadFile | GET | /sessions/:id/files/:fileId |
| handleValidateSpec | POST | /specs/validate |

---

## Phase 3: React Client Foundation ✅ COMPLETE

**Goal:** React hooks and headless components for consuming the form server.

### Deliverables
- [x] SSE stream hook (`src/react/useFormStream.ts`) — fetch-based (supports Bearer auth headers)
- [x] Form provider (`src/react/FormProvider.tsx`) — context provider managing session state
- [x] Primary hook (`src/react/useAgenticForm.ts`) — exposes session, messages, progress, actions
- [x] Headless chat (`src/react/headless/HeadlessFormChat.tsx`) — render-prop component

### FormContextValue API
```
session, messages, progress, isLoading, isConnected, error, spec,
startSession(specXml), sendMessage(content), getFiles(), cancelSession(), interrupt()
```

---

## Phase 4: MUI Container Component ✅ COMPLETE

**Goal:** Production-ready, styled UI container using MUI + glassmorphism.

### Architecture

**Layout:** Collapsible chat drawer (right side) + artifact timeline (main content)

```
Collapsed:                        Expanded:
┌────────────────────────[💬]┐   ┌──────────────────┬──────────┐
│  ▓▓▓▓▓▓▓░░░ 60%           │   │  ▓▓▓▓▓▓▓░░░ 60%  │ Form Name│
│                            │   │                   │ [■ Stop] │
│  ✅ config.yaml            │   │  ✅ config.yaml   │────────── │
│  ┌─────────────────────┐   │   │  [expanded...]    │ Agent: Hi│
│  │ preview content     │   │   │                   │ You: ... │
│  └─────────────────────┘   │   │  ⏳ Verifying...  │          │
│  ⏳ Verifying deps...      │   │                   │ [input]  │
│  ✅ package.json           │   │                   │          │
└────────────────────────────┘   └──────────────────┴──────────┘
```

### File Structure
```
src/react/mui/
├── index.ts                          # Barrel export
├── KandiAgenticFormContainer.tsx      # Top-level: layout + drawer state
├── ChatPanel.tsx                      # Collapsible chat drawer (glassmorphism)
├── MessageBubble.tsx                  # Chat message (agent/user/system variants)
├── ChatInput.tsx                      # Text input + send + stop (interrupt) buttons
├── ArtifactTimeline.tsx              # Main content: scrollable artifact cards
├── ArtifactCard.tsx                   # Expandable card (files, milestones, field updates)
├── ProgressBar.tsx                    # Top progress bar with section labels
├── FieldStatusChip.tsx               # Status badge (pending/collected/confirmed/error)
└── theme.ts                          # Glassmorphism helpers, status colors, animations
```

### Component Breakdown

**KandiAgenticFormContainer** — Top-level orchestrator
- Props: height, defaultDrawerOpen, drawerWidth, onStop, onComplete
- Local state: drawerOpen, expandedArtifactId
- Uses `useAgenticForm()` + custom `useArtifacts()` hook

**ChatPanel** — Collapsible right drawer
- Glassmorphism Paper backdrop
- Header with form title, connection indicator, collapse button
- Auto-scrolling message list
- ChatInput at bottom

**ArtifactTimeline** — Main content area
- Scrollable vertical list, newest at top
- Artifacts from SSE events: field_update → card, output_ready → file card, status_change → milestone
- Empty state, completed state with summary

**ArtifactCard** — Expandable artifact
- Collapsed: icon + title + timestamp + status chip
- Expanded: content preview (JSON visual layout with raw toggle, file download, field values)

**ChatInput** — Input with stop
- Text field + send button
- Stop button: interrupts current agent turn (disconnect + reconnect SSE, does NOT cancel session)
- Disabled states based on connection/session status

### Hooks to Add
- `useArtifacts(session, spec)` — derives Artifact[] from session state changes
- `interrupt()` — added to FormContextValue (disconnect + reconnect SSE)

### Dependencies (optional peer deps)
- `@mui/material` ^5.0.0 || ^6.0.0 || ^7.0.0
- `@emotion/react` ^11.0.0
- `@emotion/styled` ^11.0.0

### Export Path
| Path | Status |
|---|---|
| `kandi-agentic-forms/react/mui` | ✅ |

### Sub-steps
- [x] Add react/mui export to package.json + tsup.config.ts
- [x] Add MUI peer/dev dependencies
- [x] Add interrupt() to FormContextValue + FormProvider
- [x] theme.ts — glassmorphism + status colors
- [x] FieldStatusChip, MessageBubble, ProgressBar, ChatInput
- [x] ArtifactCard, ArtifactTimeline + useArtifacts hook
- [x] ChatPanel
- [x] KandiAgenticFormContainer
- [x] Build + type-check passing

---

## Phase 5: SessionStoreAdapter Implementation ○ PLANNED

**Goal:** Provide reference implementations of the `SessionStoreAdapter` for common backends.

### Deliverables
- [ ] In-memory store (for development/testing)
- [ ] PostgreSQL/Drizzle adapter (for production)
- [ ] Redis adapter (for serverless/edge)

### Key Interface
```
createSession(userId, spec) → sessionId
getSession(sessionId) → session | null
getSpec(sessionId) → spec | null
updateSession(sessionId, patch) → void
deleteSession(sessionId) → void
listUserSessions(userId) → sessions[]
storeOutputFiles?(sessionId, manifest, files) → void
getOutputFile?(sessionId, fileId) → { data, filename, mimeType } | null
```

---

## Phase 6: Integration with www ○ PLANNED

**Goal:** Wire up the form server into the Next.js `www` app.

### Deliverables
- [ ] API routes in `www/app/api/forms/[...path]/route.ts`
- [ ] Mount all `FormServer` handlers
- [ ] Wire `verifyToken` to existing kandi-login auth
- [ ] Create a demo page with `KandiAgenticFormContainer`
- [ ] Sample XML spec for testing

---

## Phase 7: Forge Adapter ○ PLANNED

**Goal:** Implement the Forge agent adapter as an alternative to Vercel AI SDK.

### Deliverables
- [ ] `src/server/adapters/forge-adapter.ts` — implements `AgentAdapter`
- [ ] Forge-specific MCP server integration
- [ ] Adapter selection in `FormServerConfig`

---

## Phase 8: Template Rendering ○ PLANNED

**Goal:** Rendered output files (PDF, CSV, HTML) from Handlebars templates.

### Deliverables
- [ ] Template engine integration (Handlebars or similar)
- [ ] PDF generation from templates
- [ ] CSV generation from field data
- [ ] HTML report generation
- [ ] Template validation in spec parser

---

## Architecture Reference

```
┌─────────────────────────────────────────────────┐
│ React Client                                     │
│  FormProvider → useAgenticForm()                 │
│  KandiAgenticFormContainer (MUI)                 │
│    ├── ArtifactTimeline                          │
│    └── ChatPanel (collapsible)                   │
│         └── useFormStream (SSE + Bearer auth)    │
├─────────────────────────────────────────────────┤
│ Server (Node.js, serverless)                     │
│  createFormServer(config)                        │
│    ├── SessionManager → SessionStoreAdapter      │
│    ├── AgentAdapter (Vercel / Forge)             │
│    │   └── streamText + maxSteps + form tools    │
│    ├── MCP Servers (per-form, stdio/http)        │
│    └── OutputGenerator → form-files              │
├─────────────────────────────────────────────────┤
│ XML Spec (kandi-agentic-form-spec)               │
│  <agentic-form> → <agent> <sections> <output>   │
│  <mcp-servers> per-form capability boundaries    │
└─────────────────────────────────────────────────┘
```

---

## Key Design Decisions

1. **Agent adapter abstraction** — swap Vercel AI SDK for Forge without changing form logic
2. **MCP servers per-form** — XML spec declares allowed MCP servers, defining agent capability boundaries
3. **Form tools over prompt parsing** — structured tool calls (update_field, confirm_field) not free-text extraction
4. **Fetch-based SSE** — supports Bearer token auth (EventSource doesn't support custom headers)
5. **Artifact timeline** — content panel shows evolving work product, not just data fields
6. **Interrupt, don't cancel** — stop button severs current agent turn but preserves session state
7. **Framework-agnostic server** — handlers use FormRequest/FormResponse, mountable on any framework
8. **Auth via kandi-login** — reuse existing JWT tokens, no separate auth system
