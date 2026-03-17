/**
 * Agent adapter interface — abstracts the AI SDK layer
 *
 * Implement this interface to swap between Vercel AI SDK, a Forge adapter,
 * or any other LLM execution engine. The form server is adapter-agnostic;
 * it only interacts with the agent through this interface.
 */

import type { AdapterConfig } from '../types.js';

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

/** JSON Schema for a tool parameter */
export interface AgentToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  properties?: Record<string, AgentToolParameter>;
  required?: string[];
  items?: AgentToolParameter;
}

/** A tool the agent can call */
export interface AgentToolDefinition {
  /** Tool name (e.g., "update_field") */
  name: string;
  /** Description shown to the LLM */
  description: string;
  /** JSON Schema for parameters */
  parameters: AgentToolParameter;
  /** Execute the tool and return a result */
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Stream Types
// ---------------------------------------------------------------------------

/** A single part of an agent stream */
export type AgentStreamPart =
  | { type: 'text-delta'; text: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: Record<string, unknown> }
  | { type: 'tool-result'; toolCallId: string; result: unknown }
  | { type: 'step-finish'; stepType: string }
  | { type: 'finish'; reason: string }
  | { type: 'error'; error: unknown };

/** Result returned from executeStream */
export interface AgentStreamResult {
  /** Async iterable of stream parts */
  stream: AsyncIterable<AgentStreamPart>;
  /** Promise that resolves when the full response is available */
  response: Promise<AgentResponse>;
}

/** Final response after the stream completes */
export interface AgentResponse {
  /** Full text output from the agent */
  text: string;
  /** All tool calls made during the stream */
  toolCalls: Array<{ toolCallId: string; toolName: string; args: Record<string, unknown> }>;
  /** All tool results */
  toolResults: Array<{ toolCallId: string; result: unknown }>;
  /** Token usage */
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

// ---------------------------------------------------------------------------
// Adapter Interface
// ---------------------------------------------------------------------------

/** Message in the conversation */
export interface AgentMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  toolCallId?: string;
}

/** Parameters for executeStream */
export interface ExecuteStreamParams {
  /** System prompt for the agent */
  systemPrompt: string;
  /** Conversation messages */
  messages: AgentMessage[];
  /** Available tools */
  tools: Record<string, AgentToolDefinition>;
  /** Provider configuration */
  config: AdapterConfig;
}

/**
 * Core agent adapter interface.
 * Implement this to swap AI providers (Vercel AI SDK, Forge, etc.)
 */
export interface AgentAdapter {
  /** Execute a multi-step agent turn, returning a streaming result */
  executeStream(params: ExecuteStreamParams): AgentStreamResult;
}
