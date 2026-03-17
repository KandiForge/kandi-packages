/**
 * createFormServer — Factory that produces a complete agentic form server.
 *
 * Returns framework-agnostic handlers for session management, SSE streaming,
 * message handling, and output file retrieval. Mount them on Express, Next.js,
 * Vercel, Fastify, or any Node.js HTTP framework.
 *
 * @example
 * ```ts
 * import { createFormServer } from 'kandi-agentic-forms/server';
 *
 * const forms = createFormServer({
 *   adapterConfig: {
 *     provider: 'anthropic',
 *     apiKey: process.env.ANTHROPIC_API_KEY!,
 *     model: 'claude-sonnet-4-20250514',
 *   },
 *   sessionStore: mySessionStore,
 *   verifyToken: async (token) => auth.verifyToken(token),
 * });
 *
 * // Express
 * app.post('/forms/sessions', forms.handleCreateSession);
 * app.get('/forms/sessions/:id/stream', forms.handleStream);
 * app.post('/forms/sessions/:id/message', forms.handleSendMessage);
 * ```
 */

import type {
  FormServerConfig,
  FormServer,
  FormRequest,
  FormResponse,
  FormHandler,
} from './types.js';
import type { AgentMessage } from './adapters/types.js';
import type { AgenticFormSpec, FormMessage, SSEEvent } from '../core/types.js';
import { parseFormSpec } from '../core/form-spec-parser.js';
import { validateFormSpec } from '../core/form-spec-validator.js';
import { VercelAdapter } from './adapters/vercel-adapter.js';
import { SessionManager } from './session-manager.js';
import { createFormTools } from './form-tools.js';
import { generateOutputFiles } from './output-generator.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getQueryParam(
  query: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = query[key];
  return Array.isArray(value) ? value[0] : value;
}

function getBody(req: FormRequest): Record<string, unknown> {
  if (typeof req.body === 'object' && req.body !== null) {
    return req.body as Record<string, unknown>;
  }
  return {};
}

function extractBearerToken(headers: Record<string, string | string[] | undefined>): string | null {
  const auth = headers.authorization ?? headers.Authorization;
  const value = Array.isArray(auth) ? auth[0] : auth;
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice(7);
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatSSE(event: SSEEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createFormServer(config: FormServerConfig): FormServer {
  const adapter = config.adapter ?? new VercelAdapter();
  const sessionManager = new SessionManager(config.sessionStore);
  const maxSessionsPerUser = config.maxSessionsPerUser ?? 5;

  // -- Auth helper --

  async function authenticate(req: FormRequest, res: FormResponse): Promise<string | null> {
    const token = extractBearerToken(req.headers);
    if (!token) {
      res.status(401).json({ error: 'Missing Bearer token' });
      return null;
    }
    try {
      const payload = await config.verifyToken(token);
      return payload.sub;
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
      return null;
    }
  }

  // -- Build system prompt from spec --

  function buildSystemPrompt(spec: AgenticFormSpec): string {
    const parts: string[] = [];

    parts.push('You are a form-filling assistant. Your job is to guide the user through completing a structured form by asking questions and collecting their responses.');
    parts.push(`\nForm: ${spec.name} (v${spec.version})`);
    if (spec.description) parts.push(`Description: ${spec.description}`);

    if (spec.agent.tone) {
      parts.push(`\nTone: ${spec.agent.tone}`);
    }

    if (spec.agent.systemPrompt) {
      parts.push(`\n${spec.agent.systemPrompt}`);
    }

    parts.push('\n## Instructions');
    parts.push('- Ask for one field at a time in section order.');
    parts.push('- Use the update_field tool to record each answer.');
    parts.push('- Validate responses before confirming. If invalid, explain the issue and ask again.');
    parts.push('- For optional fields, offer to skip if the user prefers.');
    parts.push('- After collecting all required fields, call complete_form.');
    parts.push('- Be conversational but efficient.');

    if (spec.agent.capabilities.allowGoBack) {
      parts.push('- If the user wants to change a previous answer, update that field.');
    }

    // List sections and fields for context
    parts.push('\n## Form Structure');
    for (const section of spec.sections) {
      parts.push(`\n### ${section.label}`);
      if (section.description) parts.push(section.description);
      for (const field of section.fields) {
        const req = field.required ? '(required)' : '(optional)';
        parts.push(`- ${field.id}: ${field.label} [${field.type}] ${req}`);
        if (field.prompt) parts.push(`  Suggested prompt: "${field.prompt}"`);
        if (field.options) {
          parts.push(`  Options: ${field.options.map((o) => o.label).join(', ')}`);
        }
      }
    }

    return parts.join('\n');
  }

  // -- Handlers --

  const handleCreateSession: FormHandler = async (req, res) => {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const body = getBody(req);
    const specXml = body.spec as string;
    if (!specXml) {
      res.status(400).json({ error: 'Missing "spec" field (XML string)' });
      return;
    }

    // Parse and validate
    let spec: AgenticFormSpec;
    try {
      spec = parseFormSpec(specXml);
    } catch (err) {
      res.status(400).json({ error: `Invalid XML: ${(err as Error).message}` });
      return;
    }

    const validation = validateFormSpec(spec);
    if (!validation.valid) {
      res.status(400).json({ error: 'Invalid form spec', errors: validation.errors });
      return;
    }

    // Check session limit
    const existing = await config.sessionStore.listUserSessions(userId);
    const active = existing.filter((s) => s.status === 'in_progress' || s.status === 'not_started');
    if (active.length >= maxSessionsPerUser) {
      res.status(429).json({ error: `Maximum ${maxSessionsPerUser} active sessions reached` });
      return;
    }

    const sessionId = await sessionManager.createSession(userId, spec);

    res.status(201).json({ sessionId, formName: spec.name, formVersion: spec.version });
  };

  const handleStream: FormHandler = async (req, res) => {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const sessionId = getQueryParam(req.query, 'sessionId') ?? getQueryParam(req.query, 'id');
    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.status(200);

    // Subscribe to session events
    const unsubscribe = sessionManager.subscribe(sessionId, (event) => {
      if (!res.writableEnded) {
        res.write(formatSSE(event));
        if (res.flush) res.flush();
      }
    });

    // Send initial state
    res.write(formatSSE({
      type: 'status_change',
      data: { previousStatus: 'not_started', newStatus: session.status },
    }));
    if (res.flush) res.flush();

    // Keep-alive interval
    const keepAlive = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': keepalive\n\n');
        if (res.flush) res.flush();
      }
    }, 15_000);

    // Cleanup on disconnect (best-effort — framework-dependent)
    const cleanup = () => {
      clearInterval(keepAlive);
      unsubscribe();
    };

    // For frameworks that support abort signals
    if (req.headers['x-request-abort']) {
      cleanup();
    }

    // The stream stays open. It will be closed by the client
    // or when the session completes via the 'done' event.
  };

  const handleSendMessage: FormHandler = async (req, res) => {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const body = getBody(req);
    const sessionId = body.sessionId as string ?? getQueryParam(req.query, 'sessionId');
    const content = body.content as string ?? body.message as string;

    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }
    if (!content) {
      res.status(400).json({ error: 'Missing message content' });
      return;
    }

    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Parse the spec from the session to build tools and system prompt
    // In production you'd cache this, but for now we rebuild
    const spec = await config.sessionStore.getSpec(sessionId);
    if (!spec) {
      res.status(500).json({ error: 'Could not retrieve form spec for session' });
      return;
    }

    // Add user message
    const userMessage: FormMessage = {
      id: generateMessageId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    await sessionManager.addMessage(sessionId, userMessage);

    // Build agent messages from session history
    const agentMessages: AgentMessage[] = session.messages.map((m) => ({
      role: m.role === 'agent' ? 'assistant' : m.role,
      content: m.content,
    }));
    agentMessages.push({ role: 'user', content });

    // Create tools and execute
    const tools = createFormTools(spec, sessionManager, sessionId);
    const systemPrompt = buildSystemPrompt(spec);

    try {
      const result = adapter.executeStream({
        systemPrompt,
        messages: agentMessages,
        tools,
        config: config.adapterConfig,
      });

      // Collect text from the stream
      let fullText = '';
      for await (const part of result.stream) {
        if (part.type === 'text-delta') {
          fullText += part.text;
          // Stream text deltas as partial messages
          sessionManager.emit(sessionId, {
            type: 'message',
            data: {
              id: generateMessageId(),
              role: 'agent',
              content: part.text,
              timestamp: Date.now(),
            },
          });
        }
        if (part.type === 'error') {
          sessionManager.emit(sessionId, {
            type: 'error',
            data: {
              code: 'AGENT_ERROR',
              message: String(part.error),
              recoverable: true,
            },
          });
        }
      }

      // Store the complete agent message
      if (fullText) {
        const agentMessage: FormMessage = {
          id: generateMessageId(),
          role: 'agent',
          content: fullText,
          timestamp: Date.now(),
        };
        await sessionManager.addMessage(sessionId, agentMessage);
      }

      res.status(200).json({ success: true });
    } catch (err) {
      sessionManager.emit(sessionId, {
        type: 'error',
        data: {
          code: 'EXECUTION_ERROR',
          message: (err as Error).message,
          recoverable: true,
        },
      });
      res.status(500).json({ error: (err as Error).message });
    }
  };

  const handleGetSession: FormHandler = async (req, res) => {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const sessionId = getQueryParam(req.query, 'sessionId') ?? getQueryParam(req.query, 'id');
    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.status(200).json(session);
  };

  const handleComplete: FormHandler = async (req, res) => {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const body = getBody(req);
    const sessionId = body.sessionId as string ?? getQueryParam(req.query, 'sessionId');
    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const spec = await config.sessionStore.getSpec(sessionId);
    if (!spec) {
      res.status(500).json({ error: 'Could not retrieve form spec for session' });
      return;
    }

    // Complete and generate output
    const sessionLog = await sessionManager.completeSession(sessionId);
    if (!sessionLog) {
      res.status(500).json({ error: 'Failed to complete session' });
      return;
    }

    const output = generateOutputFiles(spec, session, sessionLog);

    // Store output files
    if (config.sessionStore.storeOutputFiles) {
      await config.sessionStore.storeOutputFiles(sessionId, output.manifest, output.files);
    }

    // Emit output_ready events
    for (const file of output.manifest.files) {
      sessionManager.emit(sessionId, { type: 'output_ready', data: file });
    }
    sessionManager.emit(sessionId, { type: 'done', data: null });

    // Callback
    if (config.onSessionComplete) {
      await config.onSessionComplete(sessionId, output.manifest.files);
    }

    res.status(200).json({ manifest: output.manifest });
  };

  const handleDeleteSession: FormHandler = async (req, res) => {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const sessionId = getQueryParam(req.query, 'sessionId') ?? getQueryParam(req.query, 'id');
    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    await config.sessionStore.deleteSession(sessionId);
    sessionManager.cleanup(sessionId);

    res.status(200).json({ success: true });
  };

  const handleGetFiles: FormHandler = async (req, res) => {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const sessionId = getQueryParam(req.query, 'sessionId') ?? getQueryParam(req.query, 'id');
    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Return file metadata from the session
    // Actual file content requires handleDownloadFile
    res.status(200).json({ sessionId, status: session.status });
  };

  const handleDownloadFile: FormHandler = async (req, res) => {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const sessionId = getQueryParam(req.query, 'sessionId') ?? getQueryParam(req.query, 'id');
    const fileId = getQueryParam(req.query, 'fileId');
    if (!sessionId || !fileId) {
      res.status(400).json({ error: 'Missing sessionId or fileId' });
      return;
    }

    if (!config.sessionStore.getOutputFile) {
      res.status(501).json({ error: 'File download not supported by this session store' });
      return;
    }

    const file = await config.sessionStore.getOutputFile(sessionId, fileId);
    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.status(200).send(file.data.toString('utf-8'));
  };

  const handleValidateSpec: FormHandler = async (req, res) => {
    // Spec validation doesn't require auth — useful for developer tooling
    const body = getBody(req);
    const specXml = body.spec as string;
    if (!specXml) {
      res.status(400).json({ error: 'Missing "spec" field (XML string)' });
      return;
    }

    try {
      const spec = parseFormSpec(specXml);
      const result = validateFormSpec(spec);
      res.status(200).json({ valid: result.valid, errors: result.errors, spec });
    } catch (err) {
      res.status(400).json({ valid: false, error: (err as Error).message });
    }
  };

  return {
    handleCreateSession,
    handleStream,
    handleSendMessage,
    handleGetSession,
    handleComplete,
    handleDeleteSession,
    handleGetFiles,
    handleDownloadFile,
    handleValidateSpec,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// rebuildSpec is no longer needed — we use config.sessionStore.getSpec() directly
