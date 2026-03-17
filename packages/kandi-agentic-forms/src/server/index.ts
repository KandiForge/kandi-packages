/**
 * Server module — createFormServer factory, adapters, session management
 */

export { createFormServer } from './create-form-server.js';
export type {
  FormServerConfig,
  FormServer,
  FormHandler,
  FormRequest,
  FormResponse,
  SessionStoreAdapter,
  AdapterConfig,
} from './types.js';
export type { AgentAdapter, AgentStreamResult, AgentStreamPart, AgentToolDefinition, AgentResponse } from './adapters/types.js';
export { VercelAdapter } from './adapters/vercel-adapter.js';
export { createFormTools } from './form-tools.js';
export { SessionManager } from './session-manager.js';
export { generateOutputFiles } from './output-generator.js';
