/**
 * FormProvider — React context provider for kandi-agentic-forms
 *
 * Wraps your app to provide agentic form session state and actions.
 * Manages SSE stream connection and session lifecycle.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type {
  KandiAgenticFormConfig,
  AgenticFormSession,
  AgenticFormSpec,
  FormMessage,
  SSEEvent,
  AgenticOutputFile,
} from '../core/types.js';
import { FormSession } from '../core/form-session.js';
import { parseFormSpec } from '../core/form-spec-parser.js';
import { useFormStream } from './useFormStream.js';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface FormContextValue {
  /** Current session state (null if no active session) */
  session: AgenticFormSession | null;
  /** All conversation messages */
  messages: FormMessage[];
  /** Form completion progress (0-1) */
  progress: number;
  /** Whether a session is being loaded/created */
  isLoading: boolean;
  /** Whether the SSE stream is connected */
  isConnected: boolean;
  /** Current error message */
  error: string | null;
  /** The parsed form spec (null if no active session) */
  spec: AgenticFormSpec | null;
  /** Start a new form session from an XML spec string */
  startSession: (specXml: string) => Promise<void>;
  /** Send a message to the agent */
  sendMessage: (content: string) => Promise<void>;
  /** Get output files for a completed session */
  getFiles: () => Promise<AgenticOutputFile[]>;
  /** Cancel/delete the current session */
  cancelSession: () => Promise<void>;
  /** Interrupt the current agent turn (disconnects + reconnects SSE) */
  interrupt: () => void;
}

const FormContext = createContext<FormContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface FormProviderProps {
  /** kandi-agentic-forms configuration */
  config: KandiAgenticFormConfig;
  children: React.ReactNode;
  /** Called when a form session completes */
  onSessionComplete?: (files: AgenticOutputFile[]) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

export function FormProvider({
  config,
  children,
  onSessionComplete,
  onError,
}: FormProviderProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [formSession, setFormSession] = useState<FormSession | null>(null);
  const [sessionState, setSessionState] = useState<AgenticFormSession | null>(null);
  const [spec, setSpec] = useState<AgenticFormSpec | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable callback refs
  const onSessionCompleteRef = useRef(onSessionComplete);
  const onErrorRef = useRef(onError);
  onSessionCompleteRef.current = onSessionComplete;
  onErrorRef.current = onError;

  // SSE event handler
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    if (!formSession) return;
    formSession.applyEvent(event);
    setSessionState({ ...formSession.getState() });
  }, [formSession]);

  const handleSSEError = useCallback((err: Error) => {
    setError(err.message);
    onErrorRef.current?.(err);
  }, []);

  // SSE stream
  const { isConnected } = useFormStream({
    serverUrl: config.formServerUrl,
    sessionId,
    getToken: config.getToken,
    onEvent: handleSSEEvent,
    onError: handleSSEError,
  });

  // Start a new session
  const startSession = useCallback(async (specXml: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Parse spec locally for client-side state
      const parsedSpec = parseFormSpec(specXml);
      setSpec(parsedSpec);

      // Create session on server
      const token = await config.getToken();
      const response = await fetch(`${config.formServerUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ spec: specXml }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to create session' }));
        throw new Error(data.error ?? `HTTP ${response.status}`);
      }

      const data = await response.json();
      const newSessionId = data.sessionId as string;

      // Create client-side session tracker
      const session = new FormSession(parsedSpec, newSessionId);
      setFormSession(session);
      setSessionState(session.getState());
      setSessionId(newSessionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start session';
      setError(message);
      onErrorRef.current?.(err instanceof Error ? err : new Error(message));
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!sessionId) {
      setError('No active session');
      return;
    }

    try {
      const token = await config.getToken();
      const response = await fetch(`${config.formServerUrl}/sessions/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, content }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to send message' }));
        throw new Error(data.error ?? `HTTP ${response.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setError(message);
      onErrorRef.current?.(err instanceof Error ? err : new Error(message));
    }
  }, [sessionId, config]);

  // Get files
  const getFiles = useCallback(async (): Promise<AgenticOutputFile[]> => {
    if (!sessionId) return [];

    try {
      const token = await config.getToken();
      const response = await fetch(`${config.formServerUrl}/sessions/${sessionId}/files`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) return [];
      const data = await response.json();
      return data.files ?? [];
    } catch {
      return [];
    }
  }, [sessionId, config]);

  // Cancel session
  const cancelSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      const token = await config.getToken();
      await fetch(`${config.formServerUrl}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch {
      // Best-effort cleanup
    }

    formSession?.destroy();
    setFormSession(null);
    setSessionState(null);
    setSessionId(null);
    setSpec(null);
    setError(null);
  }, [sessionId, formSession, config]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      formSession?.destroy();
    };
  }, [formSession]);

  const messages = sessionState?.messages ?? [];
  const progress = formSession?.getProgress() ?? 0;

  const value = useMemo<FormContextValue>(() => ({
    session: sessionState,
    messages,
    progress,
    isLoading,
    isConnected,
    error,
    spec,
    startSession,
    sendMessage,
    getFiles,
    cancelSession,
  }), [sessionState, messages, progress, isLoading, isConnected, error, spec, startSession, sendMessage, getFiles, cancelSession]);

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
}

/** Access the form context. Must be used within a FormProvider. */
export function useFormContext(): FormContextValue {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useAgenticForm must be used within a <FormProvider>');
  }
  return context;
}
