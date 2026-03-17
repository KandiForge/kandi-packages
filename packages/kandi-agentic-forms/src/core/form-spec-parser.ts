/**
 * XML spec parser — converts kandi-agentic-form-spec XML into AgenticFormSpec
 *
 * Uses fast-xml-parser to produce a plain object tree, then maps it
 * into strongly typed interfaces. Attributes are accessed via @_ prefix.
 */

import { XMLParser } from 'fast-xml-parser';
import type {
  AgenticFormSpec,
  AgenticFormMeta,
  AgenticAgentConfig,
  AgenticSection,
  AgenticField,
  AgenticFieldType,
  AgenticOption,
  AgenticValidation,
  AgenticCondition,
  AgenticConditionClause,
  ConditionOperator,
  AgenticFileConfig,
  AgenticSignatureConfig,
  AgenticRepeatableConfig,
  AgenticOutputConfig,
  AgenticRenderedFileConfig,
  AgenticErrorRecovery,
  AgenticConfirmation,
  AgenticCapabilities,
  AgenticMcpServer,
  McpTransport,
} from './types.js';

// ---------------------------------------------------------------------------
// Parser instance (reusable)
// ---------------------------------------------------------------------------

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  parseAttributeValue: true,
  trimValues: true,
  isArray: (tagName) => {
    // These elements should always be arrays even if only one child exists
    const arrayTags = [
      'section', 'field', 'sub-field', 'option', 'tag',
      'constraint', 'when', 'confirm', 'rendered-file',
      'mcp-server',
    ];
    return arrayTags.includes(tagName);
  },
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Parse a kandi-agentic-form-spec XML string into an AgenticFormSpec */
export function parseFormSpec(xml: string): AgenticFormSpec {
  const parsed = xmlParser.parse(xml);
  const root = parsed['agentic-form'];

  if (!root) {
    throw new ParseError('Missing root <agentic-form> element');
  }

  return {
    name: requireAttr(root, 'name', 'agentic-form'),
    version: String(requireAttr(root, 'version', 'agentic-form')),
    description: root['@_description'] ?? root.description ?? '',
    meta: root.meta ? parseMeta(root.meta) : undefined,
    agent: parseAgent(root.agent),
    sections: parseSections(root.sections),
    output: parseOutput(root.output),
    mcpServers: root['mcp-servers']
      ? parseMcpServers(root['mcp-servers'])
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

// ---------------------------------------------------------------------------
// Internal parsers
// ---------------------------------------------------------------------------

function requireAttr(node: Record<string, unknown>, attr: string, element: string): string {
  const value = node[`@_${attr}`];
  if (value == null || value === '') {
    throw new ParseError(`<${element}> requires attribute "${attr}"`);
  }
  return String(value);
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

// -- Meta --

function parseMeta(node: Record<string, unknown>): AgenticFormMeta {
  return {
    author: node.author as string | undefined,
    created: node.created as string | undefined,
    locale: node.locale as string | undefined,
    tags: node.tags
      ? ensureArray((node.tags as Record<string, unknown>).tag as string[]).map(String)
      : undefined,
  };
}

// -- Agent --

function parseAgent(node: Record<string, unknown> | undefined): AgenticAgentConfig {
  if (!node) {
    return {
      errorRecovery: { strategy: 'retry-with-hint', maxRetries: 3 },
      confirmations: [],
      capabilities: { allowSkipOptional: true, allowGoBack: true, allowSaveProgress: false },
    };
  }

  return {
    tone: node.tone as string | undefined,
    systemPrompt: node['system-prompt'] as string | undefined,
    greeting: node.greeting as string | undefined,
    completionMessage: node['completion-message'] as string | undefined,
    errorRecovery: parseErrorRecovery(node['error-recovery']),
    confirmations: parseConfirmations(node.confirmations),
    capabilities: parseCapabilities(node.capabilities),
  };
}

function parseErrorRecovery(node: unknown): AgenticErrorRecovery {
  if (!node || typeof node !== 'object') {
    return { strategy: 'retry-with-hint', maxRetries: 3 };
  }
  const n = node as Record<string, unknown>;
  return {
    strategy: (n['@_strategy'] as AgenticErrorRecovery['strategy']) ?? 'retry-with-hint',
    maxRetries: Number(n['@_max-retries'] ?? 3),
  };
}

function parseConfirmations(node: unknown): AgenticConfirmation[] {
  if (!node || typeof node !== 'object') return [];
  const n = node as Record<string, unknown>;
  return ensureArray(n.confirm as Record<string, unknown>[]).map((c) => ({
    trigger: String(c['@_before'] ?? 'submit'),
    message: String(c['#text'] ?? c ?? ''),
  }));
}

function parseCapabilities(node: unknown): AgenticCapabilities {
  if (!node || typeof node !== 'object') {
    return { allowSkipOptional: true, allowGoBack: true, allowSaveProgress: false };
  }
  const n = node as Record<string, unknown>;
  return {
    allowSkipOptional: parseBool(n['allow-skip-optional'], true),
    allowGoBack: parseBool(n['allow-go-back'], true),
    allowSaveProgress: parseBool(n['allow-save-progress'], false),
  };
}

function parseBool(value: unknown, fallback: boolean): boolean {
  if (value == null) return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
}

// -- Sections & Fields --

function parseSections(node: Record<string, unknown> | undefined): AgenticSection[] {
  if (!node) {
    throw new ParseError('Missing <sections> element');
  }
  const sections = ensureArray(node.section as Record<string, unknown>[]);
  if (sections.length === 0) {
    throw new ParseError('<sections> must contain at least one <section>');
  }

  return sections.map((s) => ({
    id: requireAttr(s, 'id', 'section'),
    label: requireAttr(s, 'label', 'section'),
    order: Number(s['@_order'] ?? 0),
    description: s.description as string | undefined,
    fields: parseFields(ensureArray(s.field as Record<string, unknown>[])),
  })).sort((a, b) => a.order - b.order);
}

function parseFields(nodes: Record<string, unknown>[]): AgenticField[] {
  return nodes.map((f) => {
    const type = requireAttr(f, 'type', 'field') as AgenticFieldType;
    const field: AgenticField = {
      id: requireAttr(f, 'id', 'field'),
      type,
      required: parseBool(f['@_required'], false),
      label: String(f.label ?? ''),
      prompt: f.prompt as string | undefined,
      hint: f.hint as string | undefined,
    };

    if (f.link) {
      const link = f.link as Record<string, unknown>;
      field.link = { url: String(link['@_url'] ?? ''), text: String(link['#text'] ?? link ?? '') };
    }

    if (f.validation) field.validation = parseValidation(f.validation as Record<string, unknown>);
    if (f.condition) field.condition = parseCondition(f.condition as Record<string, unknown>);
    if (f.options) field.options = parseOptions(f.options as Record<string, unknown>);
    if (f['file-config']) field.fileConfig = parseFileConfig(f['file-config'] as Record<string, unknown>);
    if (f['signature-config']) field.signatureConfig = parseSignatureConfig(f['signature-config'] as Record<string, unknown>);
    if (f['repeatable-config']) field.repeatableConfig = parseRepeatableConfig(f['repeatable-config'] as Record<string, unknown>);

    return field;
  });
}

function parseValidation(node: Record<string, unknown>): AgenticValidation {
  const v: AgenticValidation = {};
  if (node['min-length'] != null) v.minLength = Number(node['min-length']);
  if (node['max-length'] != null) v.maxLength = Number(node['max-length']);
  if (node.min != null) v.min = node.min as string | number;
  if (node.max != null) v.max = node.max as string | number;
  if (node.pattern) {
    const p = node.pattern as Record<string, unknown>;
    v.pattern = { regex: String(p['@_regex'] ?? ''), message: String(p['@_message'] ?? '') };
  }
  if (node['must-be-true']) {
    const m = node['must-be-true'] as Record<string, unknown>;
    v.mustBeTrue = { message: String(m['@_message'] ?? '') };
  }
  if (node.custom) {
    const c = node.custom as Record<string, unknown>;
    v.custom = {
      validator: String(c['@_validator'] ?? ''),
      params: c['@_params'] ? JSON.parse(String(c['@_params'])) : {},
    };
  }
  return v;
}

function parseCondition(node: Record<string, unknown>): AgenticCondition {
  // Check for <any> wrapper (OR mode)
  if (node.any) {
    const anyNode = node.any as Record<string, unknown>;
    return {
      mode: 'any',
      clauses: ensureArray(anyNode.when as Record<string, unknown>[]).map(parseClause),
    };
  }

  // Default: AND mode with direct <when> children
  return {
    mode: 'all',
    clauses: ensureArray(node.when as Record<string, unknown>[]).map(parseClause),
  };
}

function parseClause(node: Record<string, unknown>): AgenticConditionClause {
  const field = String(node['@_field'] ?? '');
  // Determine operator from which attribute is present
  const operatorMap: [string, ConditionOperator][] = [
    ['equals', 'equals'],
    ['not-equals', 'not-equals'],
    ['in', 'in'],
    ['not-in', 'not-in'],
    ['gt', 'gt'],
    ['lt', 'lt'],
    ['gte', 'gte'],
    ['lte', 'lte'],
    ['matches', 'matches'],
    ['is-empty', 'is-empty'],
    ['is-not-empty', 'is-not-empty'],
  ];

  for (const [attr, op] of operatorMap) {
    if (node[`@_${attr}`] != null) {
      return { field, operator: op, value: String(node[`@_${attr}`]) };
    }
  }

  // Check for boolean-style operators (no value)
  if (node['@_is-empty'] === true || node['@_is-empty'] === '') {
    return { field, operator: 'is-empty' };
  }
  if (node['@_is-not-empty'] === true || node['@_is-not-empty'] === '') {
    return { field, operator: 'is-not-empty' };
  }

  throw new ParseError(`<when> for field "${field}" has no recognized operator attribute`);
}

function parseOptions(node: Record<string, unknown>): AgenticOption[] {
  return ensureArray(node.option as Record<string, unknown>[]).map((o) => ({
    value: String(o['@_value'] ?? ''),
    label: String(o['#text'] ?? o ?? ''),
  }));
}

function parseFileConfig(node: Record<string, unknown>): AgenticFileConfig {
  return {
    accept: node.accept as string | undefined,
    maxSizeMb: node['max-size-mb'] != null ? Number(node['max-size-mb']) : undefined,
    maxFiles: node['max-files'] != null ? Number(node['max-files']) : undefined,
  };
}

function parseSignatureConfig(node: Record<string, unknown>): AgenticSignatureConfig {
  return {
    format: node.format as AgenticSignatureConfig['format'] | undefined,
    maxSizeMb: node['max-size-mb'] != null ? Number(node['max-size-mb']) : undefined,
  };
}

function parseRepeatableConfig(node: Record<string, unknown>): AgenticRepeatableConfig {
  return {
    min: Number(node['@_min'] ?? 0),
    max: Number(node['@_max'] ?? 100),
    subFields: parseFields(ensureArray(node['sub-field'] as Record<string, unknown>[])),
  };
}

// -- Output --

function parseOutput(node: Record<string, unknown> | undefined): AgenticOutputConfig {
  if (!node) {
    return {
      manifestFilename: 'manifest.json',
      rawDataFilename: 'form-data.json',
      sessionLogFilename: 'session-log.json',
      renderedFiles: [],
    };
  }

  const manifest = node.manifest as Record<string, unknown> | undefined;
  const rawData = node['raw-data'] as Record<string, unknown> | undefined;
  const sessionLog = node['session-log'] as Record<string, unknown> | undefined;

  return {
    manifestFilename: String(manifest?.['@_filename'] ?? 'manifest.json'),
    rawDataFilename: String(rawData?.['@_filename'] ?? 'form-data.json'),
    sessionLogFilename: String(sessionLog?.['@_filename'] ?? 'session-log.json'),
    renderedFiles: ensureArray(node['rendered-file'] as Record<string, unknown>[]).map(parseRenderedFile),
  };
}

function parseRenderedFile(node: Record<string, unknown>): AgenticRenderedFileConfig {
  return {
    id: requireAttr(node, 'id', 'rendered-file'),
    format: requireAttr(node, 'format', 'rendered-file') as AgenticRenderedFileConfig['format'],
    templateRef: String((node.template as Record<string, unknown>)?.['@_ref'] ?? ''),
    filenameTemplate: String((node.filename as Record<string, unknown>)?.['#text'] ?? node.filename ?? ''),
  };
}

// -- MCP Servers --

function parseMcpServers(node: Record<string, unknown>): AgenticMcpServer[] {
  return ensureArray(node['mcp-server'] as Record<string, unknown>[]).map((s) => {
    const server: AgenticMcpServer = {
      id: requireAttr(s, 'id', 'mcp-server'),
      name: String(s.name ?? s['@_name'] ?? ''),
      description: s.description as string | undefined,
      transport: requireAttr(s, 'transport', 'mcp-server') as McpTransport,
      endpoint: String(s.endpoint ?? ''),
    };

    if (s.args) {
      const argsNode = s.args as Record<string, unknown>;
      server.args = ensureArray(argsNode.arg as string[]).map(String);
    }

    if (s.env) {
      const envNode = s.env as Record<string, unknown>;
      server.env = {};
      const vars = ensureArray(envNode.var as Record<string, unknown>[]);
      for (const v of vars) {
        server.env[String(v['@_name'] ?? '')] = String(v['@_value'] ?? v['#text'] ?? '');
      }
    }

    if (s['allowed-tools']) {
      const toolsNode = s['allowed-tools'] as Record<string, unknown>;
      server.allowedTools = ensureArray(toolsNode.tool as string[]).map(String);
    }

    if (s['allowed-resources']) {
      const resNode = s['allowed-resources'] as Record<string, unknown>;
      server.allowedResources = ensureArray(resNode.resource as string[]).map(String);
    }

    if (s.headers) {
      const headersNode = s.headers as Record<string, unknown>;
      server.headers = {};
      const hdrs = ensureArray(headersNode.header as Record<string, unknown>[]);
      for (const h of hdrs) {
        server.headers[String(h['@_name'] ?? '')] = String(h['@_value'] ?? h['#text'] ?? '');
      }
    }

    return server;
  });
}
