/**
 * Server-side types for kandi-agentic-forms
 */

import type {
  AgenticFormSpec,
  AgenticFormSession,
  AgenticOutputFile,
  AgenticFormManifest,
} from '../core/types.js';
import type { AgentAdapter } from './adapters/types.js';

// ---------------------------------------------------------------------------
// Request / Response (Framework-Agnostic)
// ---------------------------------------------------------------------------

/** Minimal request interface (works with Express, Next.js, Vercel, etc.) */
export interface FormRequest {
  method: string;
  url?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

/** Minimal response interface with SSE streaming support */
export interface FormResponse {
  status(code: number): FormResponse;
  json(data: unknown): void;
  send(body: string): void;
  setHeader(name: string, value: string): FormResponse;
  /** Write a chunk to the response (for SSE streaming) */
  write(chunk: string): boolean;
  /** Flush the response buffer (for SSE in some frameworks) */
  flush?(): void;
  /** End the response */
  end(): void;
  /** Whether the client has disconnected */
  writableEnded?: boolean;
}

/** Handler function signature */
export type FormHandler = (req: FormRequest, res: FormResponse) => Promise<void>;

// ---------------------------------------------------------------------------
// Session Store Adapter
// ---------------------------------------------------------------------------

/**
 * Persistence adapter for form sessions.
 * Consumers implement this to connect to their database/cache.
 */
export interface SessionStoreAdapter {
  /** Create a new session. Returns the session ID. */
  createSession(userId: string, spec: AgenticFormSpec): Promise<string>;
  /** Get a session by ID */
  getSession(sessionId: string): Promise<AgenticFormSession | null>;
  /** Get the form spec associated with a session */
  getSpec(sessionId: string): Promise<AgenticFormSpec | null>;
  /** Update a session (partial patch) */
  updateSession(sessionId: string, patch: Partial<AgenticFormSession>): Promise<void>;
  /** Delete a session */
  deleteSession(sessionId: string): Promise<void>;
  /** List sessions for a user */
  listUserSessions(userId: string): Promise<AgenticFormSession[]>;
  /** Store output files for a completed session */
  storeOutputFiles?(sessionId: string, manifest: AgenticFormManifest, files: Map<string, Buffer>): Promise<void>;
  /** Retrieve an output file */
  getOutputFile?(sessionId: string, fileId: string): Promise<{ data: Buffer; filename: string; mimeType: string } | null>;
}

// ---------------------------------------------------------------------------
// Adapter Configuration
// ---------------------------------------------------------------------------

/** LLM provider configuration for the agent adapter */
export interface AdapterConfig {
  /** LLM provider identifier */
  provider: 'openai' | 'anthropic' | 'google';
  /** API key (from environment — never from client) */
  apiKey: string;
  /** Model identifier (e.g., "gpt-4o", "claude-sonnet-4-20250514") */
  model: string;
  /** Maximum agent tool-calling rounds per turn (default: 10) */
  maxSteps?: number;
}

// ---------------------------------------------------------------------------
// Form Server Configuration
// ---------------------------------------------------------------------------

/** Full configuration for createFormServer() */
export interface FormServerConfig {
  /** Agent adapter (default: VercelAdapter) */
  adapter?: AgentAdapter;

  /** LLM provider configuration */
  adapterConfig: AdapterConfig;

  /** Session persistence adapter */
  sessionStore: SessionStoreAdapter;

  /**
   * Token verification function — validates Bearer tokens from kandi-login.
   * Should return at minimum { sub: string } (the user ID).
   */
  verifyToken: (token: string) => Promise<{ sub: string; [key: string]: unknown }>;

  /** CORS allowed origins */
  corsOrigins?: string[];

  /** Session TTL in milliseconds (default: 1800000 — 30 minutes) */
  sessionTtl?: number;

  /** Maximum concurrent sessions per user (default: 5) */
  maxSessionsPerUser?: number;

  /** Called when a form session completes */
  onSessionComplete?: (sessionId: string, files: AgenticOutputFile[]) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Form Server Instance
// ---------------------------------------------------------------------------

/** The form server instance returned by createFormServer() */
export interface FormServer {
  /** POST /sessions — Create a new form session from an XML spec */
  handleCreateSession: FormHandler;

  /** GET /sessions/:id/stream — SSE stream for a session */
  handleStream: FormHandler;

  /** POST /sessions/:id/message — Send a user message */
  handleSendMessage: FormHandler;

  /** GET /sessions/:id — Get session state */
  handleGetSession: FormHandler;

  /** POST /sessions/:id/complete — Trigger output generation */
  handleComplete: FormHandler;

  /** DELETE /sessions/:id — Cancel/delete a session */
  handleDeleteSession: FormHandler;

  /** GET /sessions/:id/files — List output files */
  handleGetFiles: FormHandler;

  /** GET /sessions/:id/files/:fileId — Download an output file */
  handleDownloadFile: FormHandler;

  /** POST /specs/validate — Validate a form spec XML */
  handleValidateSpec: FormHandler;
}
