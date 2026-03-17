/**
 * Output generator — produces kandi-agentic-form-files from a completed session
 *
 * Generates:
 * - manifest.json — file list with hashes, session metadata
 * - form-data.json — collected values organized by section
 * - session-log.json — timestamped event log
 * - (future) rendered files from templates
 */

import { createHash } from 'crypto';
import type {
  AgenticFormSpec,
  AgenticFormSession,
  AgenticFormManifest,
  AgenticOutputFile,
  AgenticSessionLog,
} from '../core/types.js';

/** Result of output generation */
export interface GeneratedOutput {
  manifest: AgenticFormManifest;
  /** Map of filename → file content as Buffer */
  files: Map<string, Buffer>;
}

/** Generate all output files for a completed session */
export function generateOutputFiles(
  spec: AgenticFormSpec,
  session: AgenticFormSession,
  sessionLog: AgenticSessionLog,
): GeneratedOutput {
  const files = new Map<string, Buffer>();
  const outputFiles: AgenticOutputFile[] = [];

  // 1. Raw data file
  const rawData = buildRawData(spec, session);
  const rawDataJson = JSON.stringify(rawData, null, 2);
  const rawDataBuffer = Buffer.from(rawDataJson, 'utf-8');
  files.set(spec.output.rawDataFilename, rawDataBuffer);
  outputFiles.push({
    id: 'raw-data',
    filename: spec.output.rawDataFilename,
    format: 'json',
    sizeBytes: rawDataBuffer.length,
    sha256: sha256(rawDataBuffer),
  });

  // 2. Session log file
  const logJson = JSON.stringify(sessionLog, null, 2);
  const logBuffer = Buffer.from(logJson, 'utf-8');
  files.set(spec.output.sessionLogFilename, logBuffer);
  outputFiles.push({
    id: 'session-log',
    filename: spec.output.sessionLogFilename,
    format: 'json',
    sizeBytes: logBuffer.length,
    sha256: sha256(logBuffer),
  });

  // 3. Rendered files (template-based — placeholder for future implementation)
  // TODO: Implement template rendering for PDF, CSV, HTML outputs
  // This requires a template engine (e.g., Handlebars) and format-specific generators

  // 4. Manifest
  const manifest: AgenticFormManifest = {
    version: '1.0.0',
    form: {
      name: spec.name,
      version: spec.version,
      specHash: sha256(Buffer.from(JSON.stringify(spec), 'utf-8')),
    },
    session: {
      id: session.id,
      startedAt: session.startedAt,
      completedAt: session.completedAt ?? new Date().toISOString(),
      status: session.status,
      durationMs: session.completedAt
        ? new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()
        : 0,
    },
    files: outputFiles,
    uploads: session.uploads,
  };

  const manifestJson = JSON.stringify(manifest, null, 2);
  const manifestBuffer = Buffer.from(manifestJson, 'utf-8');
  files.set(spec.output.manifestFilename, manifestBuffer);

  return { manifest, files };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRawData(
  spec: AgenticFormSpec,
  session: AgenticFormSession,
): Record<string, unknown> {
  const sections: Record<string, Record<string, unknown>> = {};

  for (const section of spec.sections) {
    const sectionData: Record<string, unknown> = {};
    for (const field of section.fields) {
      const path = `${section.id}.${field.id}`;
      const fv = session.fieldValues[path];
      sectionData[field.id] = fv?.value ?? null;
    }
    sections[section.id] = sectionData;
  }

  return {
    $schema: 'https://kandiforge.com/schemas/agentic-form-data/v1',
    formName: spec.name,
    formVersion: spec.version,
    sessionId: session.id,
    collectedAt: session.completedAt ?? new Date().toISOString(),
    sections,
  };
}

function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}
