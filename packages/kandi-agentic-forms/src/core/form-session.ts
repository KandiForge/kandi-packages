/**
 * Client-side form session state machine
 *
 * Receives SSE events from the server and maintains local state.
 * Does not execute the agent — it's a passive state consumer.
 */

import type {
  AgenticFormSpec,
  AgenticFormSession,
  AgenticFieldValue,
  FormMessage,
  SSEEvent,
  FormEvent,
  FormEventListener,
} from './types.js';

export class FormSession {
  private state: AgenticFormSession;
  private spec: AgenticFormSpec;
  private listeners = new Set<FormEventListener>();

  constructor(spec: AgenticFormSpec, sessionId: string) {
    this.spec = spec;

    // Initialize field values from spec
    const fieldValues: Record<string, AgenticFieldValue> = {};
    for (const section of spec.sections) {
      for (const field of section.fields) {
        const path = `${section.id}.${field.id}`;
        fieldValues[path] = {
          fieldPath: path,
          value: null,
          status: 'pending',
          attempts: 0,
        };
      }
    }

    this.state = {
      id: sessionId,
      formName: spec.name,
      formVersion: spec.version,
      status: 'not_started',
      currentSectionId: spec.sections[0]?.id ?? null,
      currentFieldId: null,
      fieldValues,
      messages: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      uploads: [],
    };
  }

  /** Get current session state (readonly snapshot) */
  getState(): Readonly<AgenticFormSession> {
    return this.state;
  }

  /** Get the form spec */
  getSpec(): Readonly<AgenticFormSpec> {
    return this.spec;
  }

  /** Get all messages */
  getMessages(): readonly FormMessage[] {
    return this.state.messages;
  }

  /** Apply an SSE event to update state */
  applyEvent(event: SSEEvent): void {
    const now = new Date().toISOString();
    this.state.updatedAt = now;

    switch (event.type) {
      case 'message': {
        this.state.messages.push(event.data);
        if (this.state.status === 'not_started') {
          this.state.status = 'in_progress';
          this.emit({ type: 'status_change', sessionId: this.state.id });
        }
        this.emit({ type: 'message', sessionId: this.state.id, data: event.data });
        break;
      }

      case 'field_update': {
        const { fieldPath, value, status, validationErrors } = event.data;
        const existing = this.state.fieldValues[fieldPath];
        if (existing) {
          existing.value = value;
          existing.status = status;
          existing.attempts += 1;
          existing.collectedAt = now;
          if (validationErrors?.length) {
            existing.validationError = validationErrors[0];
          } else {
            existing.validationError = undefined;
          }
        }
        this.emit({ type: 'field_update', sessionId: this.state.id, data: event.data });
        break;
      }

      case 'status_change': {
        this.state.status = event.data.newStatus;
        if (event.data.newStatus === 'completed') {
          this.state.completedAt = now;
        }
        this.emit({ type: 'status_change', sessionId: this.state.id, data: event.data });
        break;
      }

      case 'output_ready': {
        this.emit({ type: 'session_complete', sessionId: this.state.id, data: event.data });
        break;
      }

      case 'error': {
        this.state.error = event.data.message;
        if (!event.data.recoverable) {
          this.state.status = 'error';
        }
        this.emit({ type: 'error', sessionId: this.state.id, data: event.data });
        break;
      }

      case 'done':
        // Stream completed, no state change needed
        break;
    }
  }

  /** Get progress as a number from 0 to 1 based on required fields */
  getProgress(): number {
    let total = 0;
    let completed = 0;

    for (const section of this.spec.sections) {
      for (const field of section.fields) {
        if (!field.required) continue;
        total++;
        const fv = this.state.fieldValues[`${section.id}.${field.id}`];
        if (fv && (fv.status === 'collected' || fv.status === 'confirmed')) {
          completed++;
        }
      }
    }

    return total === 0 ? 1 : completed / total;
  }

  /** Get the next unconfirmed required field */
  getNextPendingField(): { sectionId: string; fieldId: string } | null {
    for (const section of this.spec.sections) {
      for (const field of section.fields) {
        if (!field.required) continue;
        const path = `${section.id}.${field.id}`;
        const fv = this.state.fieldValues[path];
        if (fv && fv.status === 'pending') {
          return { sectionId: section.id, fieldId: field.id };
        }
      }
    }
    return null;
  }

  /** Subscribe to form events. Returns unsubscribe function. */
  onEvent(listener: FormEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Clean up listeners */
  destroy(): void {
    this.listeners.clear();
  }

  private emit(event: FormEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Don't let listener errors break the event loop
      }
    }
  }
}
