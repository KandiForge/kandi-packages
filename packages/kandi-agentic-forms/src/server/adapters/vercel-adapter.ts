/**
 * Vercel AI SDK adapter — default agent executor
 *
 * Uses `streamText` with `maxSteps` for agent mode (multi-step tool calling).
 * Uses `jsonSchema()` helper to avoid a hard dependency on Zod.
 *
 * Type assertions are used at the AI SDK boundary because the SDK's
 * types are complex and version-dependent. Our public interface
 * (AgentAdapter) is strongly typed — the adapter internalizes the mismatch.
 */

import type {
  AgentAdapter,
  AgentStreamResult,
  AgentStreamPart,
  AgentResponse,
  ExecuteStreamParams,
} from './types.js';

/**
 * Default adapter using the Vercel AI SDK (v4+).
 *
 * Requires `ai` and one of `@ai-sdk/openai`, `@ai-sdk/anthropic`
 * as peer dependencies.
 */
export class VercelAdapter implements AgentAdapter {
  executeStream(params: ExecuteStreamParams): AgentStreamResult {
    const streamPromise = this.createStream(params);

    const stream = createLazyAsyncIterable(
      streamPromise.then((s) => s.stream),
    );

    const response: Promise<AgentResponse> = streamPromise.then((s) => s.response);

    return { stream, response };
  }

  private async createStream(params: ExecuteStreamParams): Promise<{
    stream: AsyncIterable<AgentStreamPart>;
    response: Promise<AgentResponse>;
  }> {
    const ai = await import('ai');
    const model = await this.resolveModel(params.config);

    // Convert tool definitions to Vercel AI SDK format
    const tools: Record<string, unknown> = {};
    for (const [name, def] of Object.entries(params.tools)) {
      tools[name] = ai.tool({
        description: def.description,
        parameters: ai.jsonSchema(def.parameters as unknown as Record<string, unknown>),
        execute: async (args: unknown) => def.execute(args as Record<string, unknown>),
      });
    }

    // Build messages — filter out system (handled via system param)
    const messages = params.messages
      .filter((m) => m.role !== 'system')
      .map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'tool' as const,
            content: [{ type: 'tool-result' as const, toolCallId: m.toolCallId ?? '', result: m.content }],
          };
        }
        return { role: m.role as 'user' | 'assistant', content: m.content };
      });

    // Use streamText with maxSteps for agent mode (v4 API)
    const streamTextFn = ai.streamText as unknown as (opts: Record<string, unknown>) => Record<string, unknown>;
    const result = streamTextFn({
      model,
      system: params.systemPrompt,
      messages,
      tools,
      maxSteps: params.config.maxSteps ?? 10,
    });

    // Adapt the fullStream to our AgentStreamPart format
    const agentStream = this.adaptStream(result.fullStream as AsyncIterable<unknown>);

    // Build response promise from textStream
    const responsePromise = (async (): Promise<AgentResponse> => {
      let fullText = '';
      const textStream = result.textStream as AsyncIterable<string>;
      for await (const delta of textStream) {
        fullText += delta;
      }
      return {
        text: fullText,
        toolCalls: [],
        toolResults: [],
        usage: undefined,
      };
    })();

    return { stream: agentStream, response: responsePromise };
  }

  private async *adaptStream(
    fullStream: AsyncIterable<unknown>,
  ): AsyncIterable<AgentStreamPart> {
    for await (const chunk of fullStream) {
      const part = chunk as Record<string, unknown>;
      const type = part.type as string;

      switch (type) {
        case 'text-delta':
          yield { type: 'text-delta', text: String(part.textDelta ?? '') };
          break;
        case 'tool-call':
          yield {
            type: 'tool-call',
            toolCallId: String(part.toolCallId ?? ''),
            toolName: String(part.toolName ?? ''),
            args: (part.args as Record<string, unknown>) ?? {},
          };
          break;
        case 'tool-result':
          yield {
            type: 'tool-result',
            toolCallId: String(part.toolCallId ?? ''),
            result: part.result,
          };
          break;
        case 'step-finish':
          yield { type: 'step-finish', stepType: String(part.finishReason ?? 'unknown') };
          break;
        case 'finish':
          yield { type: 'finish', reason: String(part.finishReason ?? 'stop') };
          break;
        case 'error':
          yield { type: 'error', error: part.error };
          break;
      }
    }
  }

  private async resolveModel(config: { provider: string; apiKey: string; model: string }) {
    switch (config.provider) {
      case 'openai': {
        const { createOpenAI } = await import('@ai-sdk/openai');
        const openai = createOpenAI({ apiKey: config.apiKey });
        return openai(config.model);
      }
      case 'anthropic': {
        const { createAnthropic } = await import('@ai-sdk/anthropic');
        const anthropic = createAnthropic({ apiKey: config.apiKey });
        return anthropic(config.model);
      }
      default:
        throw new Error(
          `Unsupported provider: "${config.provider}". Supported: openai, anthropic. ` +
          `For other providers, install the @ai-sdk provider package and extend VercelAdapter.resolveModel().`
        );
    }
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function createLazyAsyncIterable<T>(
  iterablePromise: Promise<AsyncIterable<T>>,
): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<T> {
      let inner: AsyncIterator<T> | null = null;
      return {
        async next(): Promise<IteratorResult<T>> {
          if (!inner) {
            const iterable = await iterablePromise;
            inner = iterable[Symbol.asyncIterator]();
          }
          return inner.next();
        },
      };
    },
  };
}
