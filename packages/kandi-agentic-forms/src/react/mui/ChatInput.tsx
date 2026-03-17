/**
 * ChatInput — text input with send and stop (interrupt) buttons
 *
 * Stop interrupts the current agent turn without cancelling the session.
 */

import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import { useTheme } from '@mui/material/styles';
import { getGlassInput } from './theme.js';

export interface ChatInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  disabled: boolean;
  isConnected: boolean;
  isAgentActive: boolean;
}

export function ChatInput({ onSend, onStop, disabled, isConnected, isAgentActive }: ChatInputProps) {
  const [value, setValue] = useState('');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  }, [value, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <Box sx={{ px: 1.5, py: 1, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 0.5,
          ...getGlassInput(isDark),
          px: 1,
          py: 0.5,
        }}
      >
        <InputBase
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Session not active' : 'Type a message...'}
          disabled={disabled}
          multiline
          maxRows={3}
          sx={{
            flex: 1,
            fontSize: '0.85rem',
            color: theme.palette.text.primary,
            '& .MuiInputBase-input::placeholder': {
              color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
              opacity: 1,
            },
          }}
        />
        {isAgentActive && isConnected ? (
          <IconButton
            onClick={onStop}
            size="small"
            sx={{
              color: '#f44336',
              '&:hover': { backgroundColor: 'rgba(244,67,54,0.1)' },
            }}
            title="Stop agent"
          >
            <StopIcon />
          </IconButton>
        ) : (
          <IconButton
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            size="small"
            sx={{
              color: value.trim() ? theme.palette.primary.main : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
            }}
            title="Send message"
          >
            <SendIcon />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}

// Inline SVG icons to avoid @mui/icons-material hard dependency
function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}
