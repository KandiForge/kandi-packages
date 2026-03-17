/**
 * MessageBubble — single chat message with role-based styling
 *
 * Agent: left-aligned, subtle glass background
 * User: right-aligned, primary color
 * System: centered, muted italic
 */

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { FormMessage } from '../../core/types.js';

export interface MessageBubbleProps {
  message: FormMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (message.role === 'system') {
    return (
      <Box sx={{ textAlign: 'center', py: 0.5, px: 2 }}>
        <Typography
          variant="caption"
          sx={{
            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
            fontStyle: 'italic',
            fontSize: '0.75rem',
          }}
        >
          {message.content}
        </Typography>
      </Box>
    );
  }

  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        px: 1.5,
        py: 0.5,
      }}
    >
      <Box
        sx={{
          maxWidth: '85%',
          px: 1.5,
          py: 1,
          borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          backgroundColor: isUser
            ? theme.palette.primary.main
            : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          color: isUser
            ? theme.palette.primary.contrastText
            : theme.palette.text.primary,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.85rem',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            '& code': {
              fontFamily: 'monospace',
              backgroundColor: isUser
                ? 'rgba(255,255,255,0.15)'
                : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              px: '4px',
              py: '1px',
              borderRadius: '4px',
              fontSize: '0.8rem',
            },
          }}
        >
          {message.content}
        </Typography>
      </Box>
    </Box>
  );
}
