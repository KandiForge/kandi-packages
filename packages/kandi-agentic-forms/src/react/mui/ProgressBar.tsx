/**
 * ProgressBar — top-level progress indicator showing form completion
 */

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { AgenticFormSpec, AgenticFormSession } from '../../core/types.js';

export interface ProgressBarProps {
  progress: number;
  spec: AgenticFormSpec | null;
  session: AgenticFormSession | null;
}

export function ProgressBar({ progress, spec, session }: ProgressBarProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const percent = Math.round(progress * 100);
  const isComplete = percent >= 100;

  // Count sections for label
  const totalSections = spec?.sections.length ?? 0;
  const completedSections = spec && session
    ? spec.sections.filter((s) => {
        return s.fields
          .filter((f) => f.required)
          .every((f) => {
            const fv = session.fieldValues[`${s.id}.${f.id}`];
            return fv && (fv.status === 'collected' || fv.status === 'confirmed');
          });
      }).length
    : 0;

  return (
    <Box sx={{ px: 2, py: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {spec?.name ?? 'Form'}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
            fontSize: '0.7rem',
          }}
        >
          {totalSections > 0
            ? `${completedSections} of ${totalSections} sections — ${percent}%`
            : `${percent}%`}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percent}
        sx={{
          height: 4,
          borderRadius: 2,
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 2,
            backgroundColor: isComplete ? '#4caf50' : theme.palette.primary.main,
            transition: 'transform 0.6s ease, background-color 0.3s ease',
          },
        }}
      />
    </Box>
  );
}
