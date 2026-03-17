/**
 * Core module — types, spec parser, validator, session state, template interpolation
 */

export type {
  // Form spec types
  AgenticFormSpec,
  AgenticFormMeta,
  AgenticAgentConfig,
  AgenticErrorRecovery,
  AgenticConfirmation,
  AgenticCapabilities,
  AgenticSection,
  AgenticField,
  AgenticFieldType,
  AgenticOption,
  AgenticValidation,
  AgenticCondition,
  AgenticConditionClause,
  ConditionOperator,
  AgenticFileConfig,
  AgenticSignatureConfig,
  AgenticRepeatableConfig,
  AgenticOutputConfig,
  AgenticRenderedFileConfig,
  // MCP types
  AgenticMcpServer,
  McpTransport,
  // Session types
  AgenticFormSession,
  AgenticFieldValue,
  AgenticValue,
  AgenticRepeatableValue,
  AgenticUploadRecord,
  SessionStatus,
  FieldStatus,
  // Message types
  FormMessage,
  // SSE types
  SSEEvent,
  SSEEventType,
  FieldUpdate,
  StatusChange,
  ErrorEvent,
  // Output types
  AgenticFormManifest,
  AgenticOutputFile,
  AgenticSessionLog,
  AgenticSessionEvent,
  SessionEventType,
  // Config
  KandiAgenticFormConfig,
  // Events
  FormEvent,
  FormEventType,
  FormEventListener,
} from './types.js';

export { parseFormSpec } from './form-spec-parser.js';
export { validateFormSpec, type ValidationResult, type ValidationError } from './form-spec-validator.js';
export { FormSession } from './form-session.js';
export { interpolate } from './template-interpolator.js';
