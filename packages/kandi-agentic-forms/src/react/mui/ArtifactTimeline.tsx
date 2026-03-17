/**
 * ArtifactTimeline — scrollable vertical list of artifact cards
 *
 * Shows the evolving work product as artifacts are produced.
 * Newest entries at top. Empty and completed states.
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { ArtifactCard } from './ArtifactCard.js';
import type { Artifact } from './useArtifacts.js';
import type { SessionStatus } from '../../core/types.js';

export interface ArtifactTimelineProps {
  artifacts: Artifact[];
  sessionStatus: SessionStatus | null;
}

export function ArtifactTimeline({ artifacts, sessionStatus }: ArtifactTimelineProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (artifacts.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          px: 3,
        }}
      >
        <Typography
          sx={{
            color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
            fontSize: '0.85rem',
            textAlign: 'center',
          }}
        >
          {sessionStatus === 'not_started' || !sessionStatus
            ? 'Start a session to begin'
            : 'Waiting for agent...'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        overflowY: 'auto',
        px: 2,
        py: 1,
        // Hide scrollbar but keep scrollable
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderRadius: 2,
        },
      }}
    >
      {artifacts.map((artifact) => (
        <ArtifactCard
          key={artifact.id}
          artifact={artifact}
          expanded={expandedId === artifact.id}
          onToggle={() => setExpandedId(expandedId === artifact.id ? null : artifact.id)}
        />
      ))}
    </Box>
  );
}
