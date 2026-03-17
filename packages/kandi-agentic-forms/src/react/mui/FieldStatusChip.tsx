/**
 * FieldStatusChip — small badge showing field collection status
 */

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { FieldStatus } from '../../core/types.js';
import { fieldStatusColor, fieldStatusLabel } from './theme.js';

export interface FieldStatusChipProps {
  status: FieldStatus;
}

export function FieldStatusChip({ status }: FieldStatusChipProps) {
  const color = fieldStatusColor[status];

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        px: '8px',
        py: '2px',
        borderRadius: '10px',
        backgroundColor: `${color}18`,
        border: `1px solid ${color}40`,
      }}
    >
      <Box
        component="span"
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      <Typography variant="caption" sx={{ color, fontWeight: 500, fontSize: '0.7rem', lineHeight: 1 }}>
        {fieldStatusLabel[status]}
      </Typography>
    </Box>
  );
}
