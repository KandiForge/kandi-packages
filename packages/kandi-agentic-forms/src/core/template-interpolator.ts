/**
 * Template interpolator for {{expression}} syntax
 *
 * Resolves expressions like {{fields.personal.first_name}}, {{session.id}},
 * {{today}}, and {{date:YYYY-MM-DD}} against session data.
 */

/** Context available for template interpolation */
export interface InterpolationContext {
  fields: Record<string, Record<string, unknown>>;
  session: { id: string; [key: string]: unknown };
  summary?: string;
}

const TEMPLATE_REGEX = /\{\{([^}]+)\}\}/g;

/**
 * Interpolate a template string, replacing {{...}} expressions with values from context.
 *
 * Supported expressions:
 * - `{{fields.section.field}}` — field value
 * - `{{session.id}}` — session property
 * - `{{summary}}` — summary string
 * - `{{today}}` — current date (YYYY-MM-DD)
 * - `{{date:FORMAT}}` — current date with custom format (YYYY, MM, DD, HH, mm, ss)
 */
export function interpolate(template: string, context: InterpolationContext): string {
  return template.replace(TEMPLATE_REGEX, (_match, expr: string) => {
    const expression = expr.trim();

    // Special: {{today}}
    if (expression === 'today') {
      return formatDate(new Date(), 'YYYY-MM-DD');
    }

    // Special: {{date:FORMAT}}
    if (expression.startsWith('date:')) {
      return formatDate(new Date(), expression.slice(5));
    }

    // Special: {{summary}}
    if (expression === 'summary') {
      return context.summary ?? '';
    }

    // Dot-path resolution: {{fields.personal.first_name}} or {{session.id}}
    return String(resolvePath(context, expression) ?? '');
  });
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function resolvePath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function formatDate(date: Date, format: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return format
    .replace('YYYY', String(date.getFullYear()))
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()))
    .replace('ss', pad(date.getSeconds()));
}
