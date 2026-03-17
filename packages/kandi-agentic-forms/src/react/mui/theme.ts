/**
 * Theme utilities — glassmorphism helpers, status colors, shared styles
 *
 * Follows kandi-login's MuiLoginChip glassmorphism pattern:
 * backdrop-filter blur, rgba gradients, inset shadows, theme-aware dark/light.
 */

import type { FieldStatus, SessionStatus } from '../../core/types.js';

// ---------------------------------------------------------------------------
// Glassmorphism
// ---------------------------------------------------------------------------

export const getGlassPanel = (isDark: boolean) => ({
  background: isDark
    ? 'linear-gradient(135deg, rgba(30, 30, 40, 0.85) 0%, rgba(20, 20, 30, 0.75) 100%)'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 248, 252, 0.8) 100%)',
  backdropFilter: 'blur(24px) saturate(140%)',
  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
  boxShadow: isDark
    ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
    : '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
});

export const getGlassCard = (isDark: boolean) => ({
  background: isDark
    ? 'rgba(40, 40, 55, 0.6)'
    : 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(12px)',
  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'}`,
  borderRadius: '12px',
  boxShadow: isDark
    ? '0 2px 8px rgba(0, 0, 0, 0.3)'
    : '0 2px 8px rgba(0, 0, 0, 0.04)',
});

export const getGlassInput = (isDark: boolean) => ({
  background: isDark
    ? 'rgba(255, 255, 255, 0.04)'
    : 'rgba(0, 0, 0, 0.02)',
  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
  borderRadius: '8px',
});

// ---------------------------------------------------------------------------
// Status Colors
// ---------------------------------------------------------------------------

export const fieldStatusColor: Record<FieldStatus, string> = {
  pending: '#9e9e9e',
  collected: '#2196f3',
  confirmed: '#4caf50',
  skipped: '#bdbdbd',
  error: '#f44336',
};

export const fieldStatusLabel: Record<FieldStatus, string> = {
  pending: 'Pending',
  collected: 'Collected',
  confirmed: 'Confirmed',
  skipped: 'Skipped',
  error: 'Error',
};

export const sessionStatusIcon: Record<SessionStatus, string> = {
  not_started: '○',
  in_progress: '⏳',
  awaiting_confirmation: '❓',
  completed: '✅',
  abandoned: '⊘',
  error: '⚠',
};

// ---------------------------------------------------------------------------
// Artifact type styling
// ---------------------------------------------------------------------------

export type ArtifactType =
  | 'field_collected'
  | 'field_confirmed'
  | 'field_skipped'
  | 'file_ready'
  | 'milestone'
  | 'error';

export const artifactTypeIcon: Record<ArtifactType, string> = {
  field_collected: '●',
  field_confirmed: '✓',
  field_skipped: '○',
  file_ready: '📄',
  milestone: '◆',
  error: '⚠',
};

export const artifactTypeColor: Record<ArtifactType, string> = {
  field_collected: '#2196f3',
  field_confirmed: '#4caf50',
  field_skipped: '#9e9e9e',
  file_ready: '#7c4dff',
  milestone: '#ff9800',
  error: '#f44336',
};

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------

export const DRAWER_TRANSITION = 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)';
export const CARD_ENTER_TRANSITION = 'opacity 300ms ease, transform 300ms ease';
