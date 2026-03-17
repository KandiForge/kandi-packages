/**
 * Session manager — server-side session lifecycle
 *
 * Coordinates between the agent adapter, form tools, and the
 * session store. Manages session creation, field updates, SSE event
 * emission, and completion.
 */

import type {
  AgenticFormSpec,
  AgenticFormSession,
  AgenticFieldValue,
  AgenticValue,
  FieldStatus,
  FormMessage,
  SSEEvent,
  SessionStatus,
  AgenticSessionEvent,
  AgenticSessionLog,
} from '../core/types.js';
import type { SessionStoreAdapter } from './types.js';

/** Callback for SSE events during a session */
export type SSEEventCallback = (event: SSEEvent) => void;

export class SessionManager {
  private store: SessionStoreAdapter;
  /** Active SSE listeners keyed by sessionId */
  private listeners = new Map<string, Set<SSEEventCallback>>();
  /** Session event logs for generating session-log.json */
  private eventLogs = new Map<string, AgenticSessionEvent[]>();

  constructor(store: SessionStoreAdapter) {
    this.store = store;
  }

  /** Create a new session from a parsed form spec */
  async createSession(userId: string, spec: AgenticFormSpec): Promise<string> {
    const sessionId = await this.store.createSession(userId, spec);

    // Initialize event log
    this.eventLogs.set(sessionId, [
      { type: 'session_start', timestamp: new Date().toISOString() },
    ]);

    return sessionId;
  }

  /** Get a session by ID */
  async getSession(sessionId: string): Promise<AgenticFormSession | null> {
    return this.store.getSession(sessionId);
  }

  /** Update a field value and emit SSE event */
  async updateField(
    sessionId: string,
    fieldPath: string,
    value: AgenticValue,
    status: FieldStatus,
    validationError?: string,
  ): Promise<void> {
    const session = await this.store.getSession(sessionId);
    if (!session) return;

    const existing = session.fieldValues[fieldPath];
    const updated: AgenticFieldValue = {
      fieldPath,
      value,
      status,
      attempts: (existing?.attempts ?? 0) + 1,
      collectedAt: new Date().toISOString(),
      validationError,
    };

    session.fieldValues[fieldPath] = updated;
    await this.store.updateSession(sessionId, {
      fieldValues: session.fieldValues,
      updatedAt: new Date().toISOString(),
    });

    // Log event
    const events = this.eventLogs.get(sessionId) ?? [];
    if (status === 'skipped') {
      events.push({ type: 'field_skipped', fieldPath, timestamp: new Date().toISOString(), reason: 'user_declined_optional' });
    } else if (status === 'error') {
      events.push({
        type: 'field_error',
        fieldPath,
        timestamp: new Date().toISOString(),
        attempts: updated.attempts,
        validationErrors: validationError ? [{ attempt: updated.attempts, error: validationError }] : undefined,
      });
    } else {
      events.push({ type: 'field_collected', fieldPath, timestamp: new Date().toISOString(), attempts: updated.attempts });
    }

    // Emit SSE event
    this.emit(sessionId, {
      type: 'field_update',
      data: {
        fieldPath,
        value,
        status,
        validationErrors: validationError ? [validationError] : undefined,
      },
    });
  }

  /** Add a message to the session */
  async addMessage(sessionId: string, message: FormMessage): Promise<void> {
    const session = await this.store.getSession(sessionId);
    if (!session) return;

    session.messages.push(message);
    await this.store.updateSession(sessionId, {
      messages: session.messages,
      updatedAt: new Date().toISOString(),
      status: session.status === 'not_started' ? 'in_progress' : session.status,
    });

    this.emit(sessionId, { type: 'message', data: message });
  }

  /** Update session status */
  async updateStatus(sessionId: string, newStatus: SessionStatus): Promise<void> {
    const session = await this.store.getSession(sessionId);
    if (!session) return;

    const previousStatus = session.status;
    const patch: Partial<AgenticFormSession> = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    if (newStatus === 'completed') {
      patch.completedAt = new Date().toISOString();
    }

    await this.store.updateSession(sessionId, patch);

    this.emit(sessionId, {
      type: 'status_change',
      data: { previousStatus, newStatus },
    });
  }

  /** Complete a session and generate the session log */
  async completeSession(sessionId: string): Promise<AgenticSessionLog | null> {
    const session = await this.store.getSession(sessionId);
    if (!session) return null;

    await this.updateStatus(sessionId, 'completed');

    // Build session log
    const events = this.eventLogs.get(sessionId) ?? [];
    let totalFields = 0;
    let collectedFields = 0;
    let skippedFields = 0;

    for (const fv of Object.values(session.fieldValues)) {
      totalFields++;
      if (fv.status === 'collected' || fv.status === 'confirmed') collectedFields++;
      if (fv.status === 'skipped') skippedFields++;
    }

    events.push({
      type: 'session_complete',
      timestamp: new Date().toISOString(),
      totalFields,
      collectedFields,
      skippedFields,
    });

    const log: AgenticSessionLog = {
      sessionId,
      formName: session.formName,
      events,
    };

    return log;
  }

  /** Subscribe to SSE events for a session */
  subscribe(sessionId: string, callback: SSEEventCallback): () => void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }
    this.listeners.get(sessionId)!.add(callback);

    return () => {
      const set = this.listeners.get(sessionId);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.listeners.delete(sessionId);
      }
    };
  }

  /** Emit an SSE event to all subscribers of a session */
  emit(sessionId: string, event: SSEEvent): void {
    const set = this.listeners.get(sessionId);
    if (!set) return;
    for (const callback of set) {
      try {
        callback(event);
      } catch {
        // Don't let listener errors break the event loop
      }
    }
  }

  /** Get the event log for a session */
  getEventLog(sessionId: string): AgenticSessionEvent[] {
    return this.eventLogs.get(sessionId) ?? [];
  }

  /** Clean up session resources */
  cleanup(sessionId: string): void {
    this.listeners.delete(sessionId);
    this.eventLogs.delete(sessionId);
  }
}
