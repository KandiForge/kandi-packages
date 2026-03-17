/**
 * ArtifactCard — expandable card in the artifact timeline
 *
 * Collapsed: icon + title + timestamp
 * Expanded: full content with raw data toggle for files
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { getGlassCard, artifactTypeIcon, artifactTypeColor, CARD_ENTER_TRANSITION } from './theme.js';
import { FieldStatusChip } from './FieldStatusChip.js';
import type { Artifact } from './useArtifacts.js';

export interface ArtifactCardProps {
  artifact: Artifact;
  expanded: boolean;
  onToggle: () => void;
}

export function ArtifactCard({ artifact, expanded, onToggle }: ArtifactCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [showRaw, setShowRaw] = useState(false);

  const icon = artifactTypeIcon[artifact.type];
  const color = artifactTypeColor[artifact.type];
  const timeStr = new Date(artifact.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Box
      sx={{
        ...getGlassCard(isDark),
        mb: 1,
        transition: CARD_ENTER_TRANSITION,
        cursor: 'pointer',
        '&:hover': {
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
        },
      }}
      onClick={onToggle}
    >
      {/* Collapsed header — always visible */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1 }}>
        <Typography component="span" sx={{ color, fontSize: '0.9rem', lineHeight: 1, minWidth: 18, textAlign: 'center' }}>
          {icon}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            fontSize: '0.8rem',
            fontWeight: 500,
            color: theme.palette.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: expanded ? 'normal' : 'nowrap',
          }}
        >
          {artifact.title}
        </Typography>
        {artifact.fieldStatus && <FieldStatusChip status={artifact.fieldStatus} />}
        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
          {timeStr}
        </Typography>
      </Box>

      {/* Expanded content */}
      {expanded && (
        <Box
          sx={{
            px: 1.5,
            pb: 1.5,
            pt: 0,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* File artifact */}
          {artifact.outputFile && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 0.5 }}>
                <FormatBadge format={artifact.outputFile.format} />
                <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                  {formatBytes(artifact.outputFile.sizeBytes)}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Typography
                  component="span"
                  variant="caption"
                  sx={{
                    color: theme.palette.primary.main,
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                  onClick={() => setShowRaw(!showRaw)}
                >
                  {showRaw ? 'Hide raw' : 'Show raw'}
                </Typography>
              </Box>
              {showRaw && artifact.rawData != null && (
                <Box
                  component="pre"
                  sx={{
                    mt: 1,
                    p: 1,
                    borderRadius: '6px',
                    backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
                    fontSize: '0.7rem',
                    fontFamily: 'monospace',
                    overflow: 'auto',
                    maxHeight: 200,
                    whiteSpace: 'pre-wrap',
                    color: theme.palette.text.secondary,
                    margin: 0,
                  }}
                >
                  {String(typeof artifact.rawData === 'string'
                    ? artifact.rawData
                    : JSON.stringify(artifact.rawData, null, 2))}
                </Box>
              )}
            </Box>
          )}

          {/* Field artifact with value */}
          {artifact.fieldValue !== undefined && !artifact.outputFile && (
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                {typeof artifact.fieldValue === 'object'
                  ? JSON.stringify(artifact.fieldValue, null, 2)
                  : String(artifact.fieldValue)}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function FormatBadge({ format }: { format: string }) {
  return (
    <Typography
      component="span"
      sx={{
        display: 'inline-block',
        px: '6px',
        py: '1px',
        borderRadius: '4px',
        backgroundColor: '#7c4dff20',
        color: '#7c4dff',
        fontSize: '0.65rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {format}
    </Typography>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
