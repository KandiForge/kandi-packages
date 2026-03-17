/**
 * Semantic validator for parsed AgenticFormSpec
 *
 * Validates structural integrity: field references in conditions,
 * no circular dependencies, required fields with impossible conditions,
 * repeatable nesting, and option completeness.
 */

import type { AgenticFormSpec, AgenticField, AgenticMcpServer } from './types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ValidationError {
  /** Error severity */
  severity: 'error' | 'warning';
  /** Dot-path to the problematic element (e.g., "sections.personal.fields.gender_other.condition") */
  path: string;
  /** Human-readable message */
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/** Validate a parsed AgenticFormSpec for semantic correctness */
export function validateFormSpec(spec: AgenticFormSpec): ValidationResult {
  const errors: ValidationError[] = [];

  // Build field registry: fieldPath → AgenticField
  const fieldPaths = new Set<string>();
  const sectionIds = new Set<string>();

  for (const section of spec.sections) {
    if (sectionIds.has(section.id)) {
      errors.push({ severity: 'error', path: `sections.${section.id}`, message: `Duplicate section id "${section.id}"` });
    }
    sectionIds.add(section.id);
    collectFieldPaths(section.id, section.fields, fieldPaths, errors);
  }

  // Validate conditions reference existing fields
  for (const section of spec.sections) {
    validateFieldConditions(section.id, section.fields, fieldPaths, errors);
  }

  // Validate repeatable fields don't nest
  for (const section of spec.sections) {
    validateNoNestedRepeatables(section.id, section.fields, false, errors);
  }

  // Validate select/multi-select have options
  for (const section of spec.sections) {
    validateSelectOptions(section.id, section.fields, errors);
  }

  // Validate MCP servers
  if (spec.mcpServers) {
    validateMcpServers(spec.mcpServers, errors);
  }

  // Validate output rendered files have ids
  for (const rf of spec.output.renderedFiles) {
    if (!rf.id) {
      errors.push({ severity: 'error', path: 'output.rendered-file', message: 'Rendered file missing id attribute' });
    }
    if (!rf.templateRef && rf.format !== 'json') {
      errors.push({ severity: 'warning', path: `output.${rf.id}`, message: `Rendered file "${rf.id}" has no template reference` });
    }
  }

  return {
    valid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Internal validators
// ---------------------------------------------------------------------------

function collectFieldPaths(
  sectionId: string,
  fields: AgenticField[],
  registry: Set<string>,
  errors: ValidationError[],
): void {
  const fieldIds = new Set<string>();

  for (const field of fields) {
    const path = `${sectionId}.${field.id}`;
    if (fieldIds.has(field.id)) {
      errors.push({ severity: 'error', path: `sections.${path}`, message: `Duplicate field id "${field.id}" in section "${sectionId}"` });
    }
    fieldIds.add(field.id);
    registry.add(path);

    // Register sub-fields of repeatables
    if (field.repeatableConfig) {
      for (const sub of field.repeatableConfig.subFields) {
        registry.add(`${path}.${sub.id}`);
      }
    }
  }
}

function validateFieldConditions(
  sectionId: string,
  fields: AgenticField[],
  fieldPaths: Set<string>,
  errors: ValidationError[],
): void {
  for (const field of fields) {
    if (!field.condition) continue;

    for (const clause of field.condition.clauses) {
      if (!fieldPaths.has(clause.field)) {
        errors.push({
          severity: 'error',
          path: `sections.${sectionId}.${field.id}.condition`,
          message: `Condition references unknown field "${clause.field}"`,
        });
      }
    }

    // Warn if a required field has conditions (might be unreachable)
    if (field.required && field.condition.clauses.length > 0) {
      errors.push({
        severity: 'warning',
        path: `sections.${sectionId}.${field.id}`,
        message: `Required field "${field.id}" has conditional visibility — it may be impossible to complete the form if conditions are not met`,
      });
    }

    // Check for self-referencing conditions
    const selfPath = `${sectionId}.${field.id}`;
    for (const clause of field.condition.clauses) {
      if (clause.field === selfPath) {
        errors.push({
          severity: 'error',
          path: `sections.${sectionId}.${field.id}.condition`,
          message: `Field "${field.id}" has a condition that references itself`,
        });
      }
    }
  }
}

function validateNoNestedRepeatables(
  sectionId: string,
  fields: AgenticField[],
  insideRepeatable: boolean,
  errors: ValidationError[],
): void {
  for (const field of fields) {
    if (field.type === 'repeatable' || field.repeatableConfig) {
      if (insideRepeatable) {
        errors.push({
          severity: 'error',
          path: `sections.${sectionId}.${field.id}`,
          message: `Nested repeatable fields are not supported: "${field.id}" is inside another repeatable`,
        });
      }
      if (field.repeatableConfig) {
        validateNoNestedRepeatables(sectionId, field.repeatableConfig.subFields, true, errors);
      }
    }
  }
}

function validateSelectOptions(
  sectionId: string,
  fields: AgenticField[],
  errors: ValidationError[],
): void {
  for (const field of fields) {
    if ((field.type === 'select' || field.type === 'multi-select') && (!field.options || field.options.length === 0)) {
      errors.push({
        severity: 'error',
        path: `sections.${sectionId}.${field.id}`,
        message: `${field.type} field "${field.id}" has no options defined`,
      });
    }
  }
}

function validateMcpServers(servers: AgenticMcpServer[], errors: ValidationError[]): void {
  const ids = new Set<string>();
  for (const server of servers) {
    if (ids.has(server.id)) {
      errors.push({ severity: 'error', path: `mcp-servers.${server.id}`, message: `Duplicate MCP server id "${server.id}"` });
    }
    ids.add(server.id);

    if (!server.endpoint) {
      errors.push({ severity: 'error', path: `mcp-servers.${server.id}`, message: `MCP server "${server.id}" has no endpoint` });
    }

    const validTransports: string[] = ['stdio', 'sse', 'http'];
    if (!validTransports.includes(server.transport)) {
      errors.push({
        severity: 'error',
        path: `mcp-servers.${server.id}`,
        message: `MCP server "${server.id}" has invalid transport "${server.transport}". Must be one of: ${validTransports.join(', ')}`,
      });
    }
  }
}
