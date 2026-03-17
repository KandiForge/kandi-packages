/**
 * Core types for kandi-agentic-forms
 * Shared interfaces for XML spec, session state, SSE events, and output files
 */

// ---------------------------------------------------------------------------
// Field Types
// ---------------------------------------------------------------------------

/** Supported field input types in a form spec */
export type AgenticFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multi-select'
  | 'checkbox'
  | 'file'
  | 'signature'
  | 'repeatable';

/** Comparison operators for conditional field visibility */
export type ConditionOperator =
  | 'equals'
  | 'not-equals'
  | 'in'
  | 'not-in'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'matches'
  | 'is-empty'
  | 'is-not-empty';

// ---------------------------------------------------------------------------
// Parsed Form Spec (mirrors XML structure)
// ---------------------------------------------------------------------------

/** Parsed representation of a <agentic-form> XML document */
export interface AgenticFormSpec {
  /** Form identifier (kebab-case) */
  name: string;
  /** Semantic version of the form spec */
  version: string;
  /** Human-readable description */
  description: string;
  /** Optional metadata */
  meta?: AgenticFormMeta;
  /** Agent behavior configuration */
  agent: AgenticAgentConfig;
  /** Ordered list of form sections */
  sections: AgenticSection[];
  /** Output file configuration */
  output: AgenticOutputConfig;
  /** Allowed MCP servers for this form (defines agent's capability boundaries) */
  mcpServers?: AgenticMcpServer[];
}

/** Form metadata from <meta> element */
export interface AgenticFormMeta {
  author?: string;
  created?: string;
  locale?: string;
  tags?: string[];
}

/** Agent behavior hints from <agent> element */
export interface AgenticAgentConfig {
  /** Conversation tone keyword (e.g., "professional-friendly") */
  tone?: string;
  /** System prompt injected into the agent context */
  systemPrompt?: string;
  /** Opening message to the user */
  greeting?: string;
  /** Message shown after successful completion (supports {{}} interpolation) */
  completionMessage?: string;
  /** Error recovery configuration */
  errorRecovery: AgenticErrorRecovery;
  /** Confirmation prompts triggered at specific moments */
  confirmations: AgenticConfirmation[];
  /** Agent capability flags */
  capabilities: AgenticCapabilities;
}

/** Error recovery strategy for the agent */
export interface AgenticErrorRecovery {
  strategy: 'retry-with-hint' | 'retry-silent' | 'skip-and-return' | 'escalate';
  maxRetries: number;
}

/** A confirmation prompt the agent must present at a trigger point */
export interface AgenticConfirmation {
  /** When to trigger: "submit", "section-change", or a custom event name */
  trigger: string;
  /** Prompt template (supports {{}} interpolation) */
  message: string;
}

/** Agent capability flags controlling user interactions */
export interface AgenticCapabilities {
  allowSkipOptional: boolean;
  allowGoBack: boolean;
  allowSaveProgress: boolean;
}

// ---------------------------------------------------------------------------
// Sections & Fields
// ---------------------------------------------------------------------------

/** A logical grouping of related fields */
export interface AgenticSection {
  /** Unique section identifier */
  id: string;
  /** Display label */
  label: string;
  /** Sort order */
  order: number;
  /** Optional description shown to the user */
  description?: string;
  /** Fields within this section */
  fields: AgenticField[];
}

/** A single form field definition */
export interface AgenticField {
  /** Unique field identifier within its section */
  id: string;
  /** Input type */
  type: AgenticFieldType;
  /** Whether the field must be collected */
  required: boolean;
  /** Display label */
  label: string;
  /** Conversational prompt the agent uses to ask for this field */
  prompt?: string;
  /** Hint text for the user */
  hint?: string;
  /** Link associated with this field (e.g., privacy policy) */
  link?: { url: string; text: string };
  /** Validation rules */
  validation?: AgenticValidation;
  /** Conditional visibility logic */
  condition?: AgenticCondition;
  /** Select/multi-select options */
  options?: AgenticOption[];
  /** File upload configuration */
  fileConfig?: AgenticFileConfig;
  /** Signature capture configuration */
  signatureConfig?: AgenticSignatureConfig;
  /** Repeatable field group configuration */
  repeatableConfig?: AgenticRepeatableConfig;
}

/** A select/multi-select option */
export interface AgenticOption {
  value: string;
  label: string;
}

/** Validation rules for a field */
export interface AgenticValidation {
  minLength?: number;
  maxLength?: number;
  min?: string | number;
  max?: string | number;
  pattern?: { regex: string; message: string };
  mustBeTrue?: { message: string };
  custom?: { validator: string; params: Record<string, unknown> };
}

/** Conditional visibility: field shown only when clauses are satisfied */
export interface AgenticCondition {
  /** Conjunction mode: "all" (AND) or "any" (OR) */
  mode: 'all' | 'any';
  clauses: AgenticConditionClause[];
}

/** A single conditional clause */
export interface AgenticConditionClause {
  /** Dot-delimited field path (section.field) */
  field: string;
  operator: ConditionOperator;
  /** Comparison value(s). For in/not-in, comma-separated string. */
  value?: string;
}

/** File upload configuration */
export interface AgenticFileConfig {
  /** MIME type accept string (e.g., "image/*,.pdf") */
  accept?: string;
  maxSizeMb?: number;
  maxFiles?: number;
}

/** Signature capture configuration */
export interface AgenticSignatureConfig {
  format?: 'image/png' | 'image/svg+xml';
  maxSizeMb?: number;
}

/** Configuration for repeatable (array) field groups */
export interface AgenticRepeatableConfig {
  min: number;
  max: number;
  /** Sub-fields collected for each repetition */
  subFields: AgenticField[];
}

// ---------------------------------------------------------------------------
// Output Configuration
// ---------------------------------------------------------------------------

/** Output file generation configuration from <output> element */
export interface AgenticOutputConfig {
  /** Manifest filename (default: "manifest.json") */
  manifestFilename: string;
  /** Raw data filename (default: "form-data.json") */
  rawDataFilename: string;
  /** Session log filename (default: "session-log.json") */
  sessionLogFilename: string;
  /** Rendered/templated output files */
  renderedFiles: AgenticRenderedFileConfig[];
}

/** Configuration for a single rendered output file */
export interface AgenticRenderedFileConfig {
  /** Unique identifier for this output */
  id: string;
  /** Output format */
  format: 'pdf' | 'csv' | 'html' | 'txt' | 'json';
  /** Path to the template file (Handlebars, etc.) */
  templateRef: string;
  /** Output filename template (supports {{}} interpolation) */
  filenameTemplate: string;
}

// ---------------------------------------------------------------------------
// MCP Server Definitions
// ---------------------------------------------------------------------------

/** MCP transport type */
export type McpTransport = 'stdio' | 'sse' | 'http';

/** An MCP server the agent is allowed to use during this form session */
export interface AgenticMcpServer {
  /** Unique identifier for this MCP server */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this MCP server provides */
  description?: string;
  /** Transport type */
  transport: McpTransport;
  /** For stdio: command to spawn. For sse/http: endpoint URL. */
  endpoint: string;
  /** For stdio: command arguments */
  args?: string[];
  /** Environment variables to pass to stdio process */
  env?: Record<string, string>;
  /** Allowlist of tool names from this server (empty = all tools allowed) */
  allowedTools?: string[];
  /** Allowlist of resource URIs from this server (empty = all resources allowed) */
  allowedResources?: string[];
  /** Headers for HTTP/SSE transport (e.g., auth headers) */
  headers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Session State (runtime)
// ---------------------------------------------------------------------------

/** Status of the overall form session */
export type SessionStatus =
  | 'not_started'
  | 'in_progress'
  | 'awaiting_confirmation'
  | 'completed'
  | 'abandoned'
  | 'error';

/** Validation state for a single field */
export type FieldStatus = 'pending' | 'collected' | 'confirmed' | 'skipped' | 'error';

/** Runtime value of a single field, including validation state */
export interface AgenticFieldValue {
  /** Dot-delimited field path (section.field) */
  fieldPath: string;
  /** The collected value (null if not yet collected) */
  value: AgenticValue;
  /** Current status */
  status: FieldStatus;
  /** Number of collection attempts */
  attempts: number;
  /** Most recent validation error, if any */
  validationError?: string;
  /** Timestamp when the value was last set */
  collectedAt?: string;
}

/** Possible field value types */
export type AgenticValue =
  | string
  | number
  | boolean
  | string[]
  | AgenticRepeatableValue[]
  | null;

/** A single entry in a repeatable field */
export type AgenticRepeatableValue = Record<string, string | number | boolean | null>;

/** Full session state */
export interface AgenticFormSession {
  /** Unique session identifier */
  id: string;
  /** Reference to the form spec */
  formName: string;
  formVersion: string;
  /** Current session status */
  status: SessionStatus;
  /** ID of the section currently being collected */
  currentSectionId: string | null;
  /** ID of the field currently being collected */
  currentFieldId: string | null;
  /** All field values keyed by fieldPath (section.field) */
  fieldValues: Record<string, AgenticFieldValue>;
  /** Conversation messages */
  messages: FormMessage[];
  /** Timestamps */
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  /** File uploads tracked during the session */
  uploads: AgenticUploadRecord[];
  /** Error information if status is 'error' */
  error?: string;
}

/** Record of an uploaded file */
export interface AgenticUploadRecord {
  /** Field path this upload belongs to */
  fieldPath: string;
  /** Stored filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  sizeBytes: number;
  /** SHA-256 hash of the file contents */
  sha256: string;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** A single message in the form conversation */
export interface FormMessage {
  id: string;
  role: 'agent' | 'user' | 'system';
  content: string;
  timestamp: number;
  /** If agent is asking about a specific field */
  relatedFieldId?: string;
  /** Structured data the agent extracted from this exchange */
  extractedData?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// SSE Events
// ---------------------------------------------------------------------------

/** SSE event types streamed from server to client */
export type SSEEventType =
  | 'message'
  | 'field_update'
  | 'status_change'
  | 'output_ready'
  | 'error'
  | 'done';

/** A typed SSE event */
export type SSEEvent =
  | { type: 'message'; data: FormMessage }
  | { type: 'field_update'; data: FieldUpdate }
  | { type: 'status_change'; data: StatusChange }
  | { type: 'output_ready'; data: AgenticOutputFile }
  | { type: 'error'; data: ErrorEvent }
  | { type: 'done'; data: null };

/** A field value update from the agent */
export interface FieldUpdate {
  fieldPath: string;
  value: AgenticValue;
  status: FieldStatus;
  validationErrors?: string[];
}

/** A session status transition */
export interface StatusChange {
  previousStatus: SessionStatus;
  newStatus: SessionStatus;
}

/** An error event */
export interface ErrorEvent {
  code: string;
  message: string;
  recoverable: boolean;
}

// ---------------------------------------------------------------------------
// Output Files Manifest
// ---------------------------------------------------------------------------

/** The manifest.json file written after form completion */
export interface AgenticFormManifest {
  /** Manifest schema version */
  version: string;
  /** Form identification */
  form: {
    name: string;
    version: string;
    /** SHA-256 hash of the XML spec used */
    specHash: string;
  };
  /** Session summary */
  session: {
    id: string;
    startedAt: string;
    completedAt: string;
    status: SessionStatus;
    durationMs: number;
    agentModel?: string;
  };
  /** Generated output files */
  files: AgenticOutputFile[];
  /** Uploaded files */
  uploads: AgenticUploadRecord[];
}

/** A single generated output file entry in the manifest */
export interface AgenticOutputFile {
  /** Matches the id from AgenticRenderedFileConfig, or "raw-data" / "session-log" */
  id: string;
  /** Resolved filename */
  filename: string;
  /** File format */
  format: string;
  /** File size in bytes */
  sizeBytes: number;
  /** SHA-256 hash of the file contents */
  sha256: string;
}

// ---------------------------------------------------------------------------
// Session Log Events
// ---------------------------------------------------------------------------

/** Event types recorded in the session log */
export type SessionEventType =
  | 'session_start'
  | 'session_complete'
  | 'session_abandon'
  | 'section_enter'
  | 'section_complete'
  | 'field_collected'
  | 'field_skipped'
  | 'field_error'
  | 'confirmation'
  | 'go_back'
  | 'save_progress';

/** A single event in the session log */
export interface AgenticSessionEvent {
  type: SessionEventType;
  timestamp: string;
  /** Present for field-level events */
  fieldPath?: string;
  /** Present for section-level events */
  sectionId?: string;
  /** Number of attempts for this field */
  attempts?: number;
  /** Validation errors encountered */
  validationErrors?: Array<{ attempt: number; error: string }>;
  /** For field_skipped events */
  reason?: string;
  /** For confirmation events */
  trigger?: string;
  accepted?: boolean;
  /** Summary stats for session_complete */
  totalFields?: number;
  collectedFields?: number;
  skippedFields?: number;
}

/** Complete session log file structure */
export interface AgenticSessionLog {
  sessionId: string;
  formName: string;
  events: AgenticSessionEvent[];
}

// ---------------------------------------------------------------------------
// Client Configuration
// ---------------------------------------------------------------------------

/** Main configuration for kandi-agentic-forms client */
export interface KandiAgenticFormConfig {
  /** Form server base URL */
  formServerUrl: string;
  /** Function to get Bearer token (typically from kandi-login's getToken) */
  getToken: () => Promise<string | null>;
  /** Path overrides */
  sessionsPath?: string;
  specsPath?: string;
}

// ---------------------------------------------------------------------------
// Form Events
// ---------------------------------------------------------------------------

/** Form event types emitted by the client-side session */
export type FormEventType =
  | 'session_start'
  | 'message'
  | 'field_update'
  | 'status_change'
  | 'session_complete'
  | 'error';

/** Structured form event */
export interface FormEvent {
  type: FormEventType;
  sessionId: string;
  data?: unknown;
}

/** Form event listener callback */
export type FormEventListener = (event: FormEvent) => void;
