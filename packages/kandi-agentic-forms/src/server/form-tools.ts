/**
 * Form tools — auto-generated agent tools from a form spec
 *
 * These tools give the agent structured actions for updating field values,
 * confirming fields, checking progress, and completing the form. The agent
 * calls these tools during conversation to interact with form state rather
 * than trying to extract values from free-text responses.
 */

import type { AgenticFormSpec, FieldStatus, AgenticValue } from '../core/types.js';
import type { AgentToolDefinition } from './adapters/types.js';
import type { SessionManager } from './session-manager.js';

/** Create the set of agent tools for a given form spec and session */
export function createFormTools(
  spec: AgenticFormSpec,
  sessionManager: SessionManager,
  sessionId: string,
): Record<string, AgentToolDefinition> {
  // Build a list of valid field paths for validation
  const validPaths = new Set<string>();
  const fieldPathEnum: string[] = [];
  for (const section of spec.sections) {
    for (const field of section.fields) {
      const path = `${section.id}.${field.id}`;
      validPaths.add(path);
      fieldPathEnum.push(path);
    }
  }

  return {
    update_field: {
      name: 'update_field',
      description: `Set a field value. Valid field paths: ${fieldPathEnum.join(', ')}. The value will be validated against the field's constraints.`,
      parameters: {
        type: 'object',
        properties: {
          fieldPath: {
            type: 'string',
            description: 'Dot-delimited field path (section.field)',
            enum: fieldPathEnum,
          },
          value: {
            type: 'string',
            description: 'The value to set. Use JSON for arrays/objects, strings for text/dates, numbers for numeric fields.',
          },
        },
        required: ['fieldPath', 'value'],
      },
      execute: async (args) => {
        const { fieldPath, value } = args as { fieldPath: string; value: unknown };
        if (!validPaths.has(fieldPath)) {
          return { success: false, error: `Unknown field path: ${fieldPath}` };
        }

        const coerced = coerceValue(spec, fieldPath, value);
        const validationError = validateFieldValue(spec, fieldPath, coerced);
        if (validationError) {
          await sessionManager.updateField(sessionId, fieldPath, coerced, 'error', validationError);
          return { success: false, error: validationError };
        }

        await sessionManager.updateField(sessionId, fieldPath, coerced, 'collected');
        return { success: true, fieldPath, value: coerced };
      },
    },

    confirm_field: {
      name: 'confirm_field',
      description: 'Mark a field as confirmed after the user has verified its value.',
      parameters: {
        type: 'object',
        properties: {
          fieldPath: {
            type: 'string',
            description: 'Dot-delimited field path to confirm',
            enum: fieldPathEnum,
          },
        },
        required: ['fieldPath'],
      },
      execute: async (args) => {
        const { fieldPath } = args as { fieldPath: string };
        const session = await sessionManager.getSession(sessionId);
        if (!session) return { success: false, error: 'Session not found' };

        const fv = session.fieldValues[fieldPath];
        if (!fv || fv.status === 'pending') {
          return { success: false, error: `Field "${fieldPath}" has not been collected yet` };
        }

        await sessionManager.updateField(sessionId, fieldPath, fv.value, 'confirmed');
        return { success: true, fieldPath };
      },
    },

    get_progress: {
      name: 'get_progress',
      description: 'Get the current form completion progress — which fields are collected, pending, or skipped.',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const session = await sessionManager.getSession(sessionId);
        if (!session) return { error: 'Session not found' };

        const progress: Record<string, { status: FieldStatus; value: AgenticValue }> = {};
        let total = 0;
        let completed = 0;

        for (const section of spec.sections) {
          for (const field of section.fields) {
            const path = `${section.id}.${field.id}`;
            const fv = session.fieldValues[path];
            progress[path] = {
              status: fv?.status ?? 'pending',
              value: fv?.value ?? null,
            };
            if (field.required) {
              total++;
              if (fv && (fv.status === 'collected' || fv.status === 'confirmed')) {
                completed++;
              }
            }
          }
        }

        return {
          progress,
          completionRate: total > 0 ? completed / total : 1,
          totalRequired: total,
          completedRequired: completed,
        };
      },
    },

    skip_field: {
      name: 'skip_field',
      description: 'Skip an optional field. Cannot skip required fields.',
      parameters: {
        type: 'object',
        properties: {
          fieldPath: {
            type: 'string',
            description: 'Dot-delimited field path to skip',
            enum: fieldPathEnum,
          },
          reason: {
            type: 'string',
            description: 'Why the field is being skipped (e.g., "user declined optional field")',
          },
        },
        required: ['fieldPath'],
      },
      execute: async (args) => {
        const { fieldPath, reason } = args as { fieldPath: string; reason?: string };
        const field = findField(spec, fieldPath);
        if (!field) return { success: false, error: `Unknown field: ${fieldPath}` };
        if (field.required) return { success: false, error: `Cannot skip required field "${fieldPath}"` };

        await sessionManager.updateField(sessionId, fieldPath, null, 'skipped');
        return { success: true, fieldPath, reason: reason ?? 'user_declined_optional' };
      },
    },

    request_file_upload: {
      name: 'request_file_upload',
      description: 'Signal the client to show a file upload UI for a file or signature field.',
      parameters: {
        type: 'object',
        properties: {
          fieldPath: {
            type: 'string',
            description: 'Dot-delimited field path for the file/signature field',
          },
          prompt: {
            type: 'string',
            description: 'Message to show the user alongside the upload UI',
          },
        },
        required: ['fieldPath'],
      },
      execute: async (args) => {
        const { fieldPath, prompt } = args as { fieldPath: string; prompt?: string };
        const field = findField(spec, fieldPath);
        if (!field) return { success: false, error: `Unknown field: ${fieldPath}` };
        if (field.type !== 'file' && field.type !== 'signature') {
          return { success: false, error: `Field "${fieldPath}" is not a file or signature field` };
        }

        // The SSE event for this will be emitted by the session manager
        return {
          success: true,
          fieldPath,
          prompt: prompt ?? field.prompt ?? `Please upload for ${field.label}`,
          fileConfig: field.fileConfig,
          signatureConfig: field.signatureConfig,
        };
      },
    },

    complete_form: {
      name: 'complete_form',
      description: 'Finalize the form session. Only call this when all required fields are collected and confirmed.',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const session = await sessionManager.getSession(sessionId);
        if (!session) return { success: false, error: 'Session not found' };

        // Check all required fields are collected or confirmed
        const missing: string[] = [];
        for (const section of spec.sections) {
          for (const field of section.fields) {
            if (!field.required) continue;
            const path = `${section.id}.${field.id}`;
            const fv = session.fieldValues[path];
            if (!fv || fv.status === 'pending' || fv.status === 'error') {
              missing.push(path);
            }
          }
        }

        if (missing.length > 0) {
          return {
            success: false,
            error: `Cannot complete: missing required fields: ${missing.join(', ')}`,
            missingFields: missing,
          };
        }

        await sessionManager.completeSession(sessionId);
        return { success: true };
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findField(spec: AgenticFormSpec, fieldPath: string) {
  const [sectionId, fieldId] = fieldPath.split('.');
  const section = spec.sections.find((s) => s.id === sectionId);
  return section?.fields.find((f) => f.id === fieldId);
}

function coerceValue(spec: AgenticFormSpec, fieldPath: string, value: unknown): AgenticValue {
  const field = findField(spec, fieldPath);
  if (!field) return value as AgenticValue;

  switch (field.type) {
    case 'number':
      return Number(value);
    case 'checkbox':
      if (typeof value === 'string') return value.toLowerCase() === 'true';
      return Boolean(value);
    case 'multi-select':
      if (typeof value === 'string') {
        try { return JSON.parse(value) as string[]; } catch { return [value]; }
      }
      return value as string[];
    default:
      return typeof value === 'string' ? value : String(value);
  }
}

function validateFieldValue(spec: AgenticFormSpec, fieldPath: string, value: AgenticValue): string | undefined {
  const field = findField(spec, fieldPath);
  if (!field?.validation) return undefined;
  const v = field.validation;

  if (typeof value === 'string') {
    if (v.minLength != null && value.length < v.minLength) {
      return `Must be at least ${v.minLength} characters`;
    }
    if (v.maxLength != null && value.length > v.maxLength) {
      return `Must be at most ${v.maxLength} characters`;
    }
    if (v.pattern && !new RegExp(v.pattern.regex).test(value)) {
      return v.pattern.message || `Does not match required pattern`;
    }
  }

  if (typeof value === 'number') {
    if (v.min != null && value < Number(v.min)) return `Must be at least ${v.min}`;
    if (v.max != null && value > Number(v.max)) return `Must be at most ${v.max}`;
  }

  if (field.type === 'checkbox' && v.mustBeTrue && value !== true) {
    return v.mustBeTrue.message || 'Must be checked';
  }

  if (field.type === 'select' && field.options) {
    const validValues = field.options.map((o) => o.value);
    if (!validValues.includes(value as string)) {
      return `Invalid option. Must be one of: ${validValues.join(', ')}`;
    }
  }

  return undefined;
}
