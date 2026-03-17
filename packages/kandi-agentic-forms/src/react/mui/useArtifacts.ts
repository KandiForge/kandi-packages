/**
 * useArtifacts — derives an artifact timeline from session state changes
 *
 * Watches session.fieldValues, session.status, and output files.
 * Produces a reverse-chronological list of Artifact entries for the timeline.
 */

import { useEffect, useRef, useState } from 'react';
import type {
  AgenticFormSession,
  AgenticFormSpec,
  AgenticOutputFile,
  FieldStatus,
  SessionStatus,
} from '../../core/types.js';
import type { ArtifactType } from './theme.js';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  timestamp: number;
  fieldPath?: string;
  fieldValue?: unknown;
  fieldStatus?: FieldStatus;
  outputFile?: AgenticOutputFile;
  status?: SessionStatus;
  rawData?: unknown;
}

/**
 * Derive an artifact timeline from form session state.
 * Returns artifacts sorted newest-first.
 */
export function useArtifacts(
  session: AgenticFormSession | null,
  spec: AgenticFormSpec | null,
  outputFiles: AgenticOutputFile[],
): Artifact[] {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const prevFieldStatuses = useRef<Record<string, FieldStatus>>({});
  const prevStatus = useRef<SessionStatus | null>(null);
  const seenFileIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!session || !spec) return;

    const newArtifacts: Artifact[] = [];
    const now = Date.now();

    // Detect field status changes
    for (const [path, fv] of Object.entries(session.fieldValues)) {
      const prev = prevFieldStatuses.current[path];
      if (prev === fv.status) continue;

      // Find the field label from spec
      const [sectionId, fieldId] = path.split('.');
      const section = spec.sections.find((s) => s.id === sectionId);
      const field = section?.fields.find((f) => f.id === fieldId);
      const label = field?.label ?? fieldId;

      if (fv.status === 'collected' && prev !== 'collected') {
        newArtifacts.push({
          id: `field_${path}_${now}`,
          type: 'field_collected',
          title: `${label}: ${formatValue(fv.value)}`,
          timestamp: fv.collectedAt ? new Date(fv.collectedAt).getTime() : now,
          fieldPath: path,
          fieldValue: fv.value,
          fieldStatus: fv.status,
        });
      } else if (fv.status === 'confirmed' && prev !== 'confirmed') {
        newArtifacts.push({
          id: `field_${path}_confirmed_${now}`,
          type: 'field_confirmed',
          title: `${label} confirmed`,
          timestamp: now,
          fieldPath: path,
          fieldValue: fv.value,
          fieldStatus: fv.status,
        });
      } else if (fv.status === 'skipped' && prev !== 'skipped') {
        newArtifacts.push({
          id: `field_${path}_skipped_${now}`,
          type: 'field_skipped',
          title: `${label} skipped`,
          timestamp: now,
          fieldPath: path,
          fieldStatus: fv.status,
        });
      } else if (fv.status === 'error' && prev !== 'error') {
        newArtifacts.push({
          id: `field_${path}_error_${now}`,
          type: 'error',
          title: `${label}: ${fv.validationError ?? 'validation error'}`,
          timestamp: now,
          fieldPath: path,
          fieldStatus: fv.status,
        });
      }

      prevFieldStatuses.current[path] = fv.status;
    }

    // Detect session status changes
    if (session.status !== prevStatus.current) {
      const statusLabels: Record<SessionStatus, string> = {
        not_started: 'Session created',
        in_progress: 'Session started',
        awaiting_confirmation: 'Awaiting confirmation',
        completed: 'Session completed',
        abandoned: 'Session abandoned',
        error: `Error: ${session.error ?? 'unknown'}`,
      };

      newArtifacts.push({
        id: `status_${session.status}_${now}`,
        type: session.status === 'error' ? 'error' : 'milestone',
        title: statusLabels[session.status],
        timestamp: now,
        status: session.status,
      });

      prevStatus.current = session.status;
    }

    if (newArtifacts.length > 0) {
      setArtifacts((prev) => [...newArtifacts, ...prev]);
    }
  }, [session, spec, session?.fieldValues, session?.status]);

  // Detect new output files
  useEffect(() => {
    const newFileArtifacts: Artifact[] = [];
    for (const file of outputFiles) {
      if (seenFileIds.current.has(file.id)) continue;
      seenFileIds.current.add(file.id);
      newFileArtifacts.push({
        id: `file_${file.id}_${Date.now()}`,
        type: 'file_ready',
        title: file.filename,
        timestamp: Date.now(),
        outputFile: file,
      });
    }
    if (newFileArtifacts.length > 0) {
      setArtifacts((prev) => [...newFileArtifacts, ...prev]);
    }
  }, [outputFiles]);

  return artifacts;
}

function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value.length > 60 ? value.slice(0, 57) + '...' : value;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}
