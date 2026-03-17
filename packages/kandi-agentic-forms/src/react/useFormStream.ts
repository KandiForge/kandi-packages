/**
 * useFormStream — fetch-based SSE stream consumption hook
 *
 * Uses fetch + ReadableStream instead of native EventSource because
 * EventSource doesn't support custom headers (needed for Bearer token auth).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SSEEvent, SSEEventType } from '../core/types.js';

export interface UseFormStreamConfig {
  /** Form server base URL */
  serverUrl: string;
  /** Session ID to stream (null = disconnected) */
  sessionId: string | null;
  /** Function to get Bearer token (from kandi-login) */
  getToken: () => Promise<string | null>;
  /** Called for each SSE event */
  onEvent: (event: SSEEvent) => void;
  /** Called on stream error */
  onError: (error: Error) => void;
  /** Called when the stream disconnects */
  onDisconnect?: () => void;
}

export interface UseFormStreamReturn {
  /** Whether the SSE stream is currently connected */
  isConnected: boolean;
  /** Manually connect to the stream */
  connect: () => void;
  /** Manually disconnect from the stream */
  disconnect: () => void;
}

export function useFormStream(config: UseFormStreamConfig): UseFormStreamReturn {
  const [isConnected, setIsConnected] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const disconnect = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsConnected(false);
    configRef.current.onDisconnect?.();
  }, []);

  const connect = useCallback(async () => {
    const { serverUrl, sessionId, getToken, onEvent, onError } = configRef.current;
    if (!sessionId) return;

    // Disconnect previous stream
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await getToken();
      if (!token) {
        onError(new Error('No auth token available'));
        return;
      }

      const url = `${serverUrl}/sessions/${sessionId}/stream`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null — streaming not supported');
      }

      setIsConnected(true);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

        let currentEventType: string | null = null;
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            currentData += line.slice(6);
          } else if (line === '' && currentEventType) {
            // Empty line = end of event
            try {
              const data = currentData ? JSON.parse(currentData) : null;
              onEvent({ type: currentEventType as SSEEventType, data } as SSEEvent);
            } catch {
              // Skip malformed events
            }
            currentEventType = null;
            currentData = '';
          } else if (line.startsWith(':')) {
            // SSE comment (keepalive), ignore
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // Expected when disconnecting
        return;
      }
      configRef.current.onError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsConnected(false);
      configRef.current.onDisconnect?.();
    }
  }, []);

  // Auto-connect when sessionId changes
  useEffect(() => {
    if (config.sessionId) {
      connect();
    } else {
      disconnect();
    }

    return () => disconnect();
  }, [config.sessionId, connect, disconnect]);

  return { isConnected, connect, disconnect };
}
