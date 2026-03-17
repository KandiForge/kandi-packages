/**
 * HeadlessFormChat — Render-prop component for complete UI control
 *
 * Provides all form chat state through render props without any styling.
 * Consumers render their own UI using the provided data and actions.
 */

import React from 'react';
import { useAgenticForm } from '../useAgenticForm.js';
import type {
  AgenticFormSession,
  AgenticFormSpec,
  FormMessage,
  AgenticOutputFile,
} from '../../core/types.js';

export interface HeadlessFormChatRenderProps {
  /** Current session state */
  session: AgenticFormSession | null;
  /** All conversation messages */
  messages: FormMessage[];
  /** Form completion progress (0-1) */
  progress: number;
  /** Whether the session is loading */
  isLoading: boolean;
  /** Whether the SSE stream is connected */
  isConnected: boolean;
  /** Current error message */
  error: string | null;
  /** The parsed form spec */
  spec: AgenticFormSpec | null;
  /** Start a new session */
  startSession: (specXml: string) => Promise<void>;
  /** Send a user message */
  sendMessage: (content: string) => Promise<void>;
  /** Get output files */
  getFiles: () => Promise<AgenticOutputFile[]>;
  /** Cancel the current session */
  cancelSession: () => Promise<void>;
}

export interface HeadlessFormChatProps {
  /** Render function receiving all form chat state and actions */
  children: (props: HeadlessFormChatRenderProps) => React.ReactNode;
}

/** Headless form chat — zero styling, full control via render props */
export function HeadlessFormChat({ children }: HeadlessFormChatProps) {
  const form = useAgenticForm();
  return <>{children(form)}</>;
}
