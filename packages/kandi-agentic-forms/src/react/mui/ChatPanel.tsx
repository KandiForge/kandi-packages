/**
 * ChatPanel — collapsible right drawer with glassmorphism styling
 *
 * Header: form name, connection dot, collapse button
 * Messages: auto-scrolling list
 * Footer: ChatInput with send + stop
 */

import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import { getGlassPanel } from './theme.js';
import { MessageBubble } from './MessageBubble.js';
import { ChatInput } from './ChatInput.js';
import type { FormMessage, SessionStatus } from '../../core/types.js';

export interface ChatPanelProps {
  formName: string;
  messages: FormMessage[];
  isConnected: boolean;
  sessionStatus: SessionStatus | null;
  width: number;
  onSend: (content: string) => void;
  onStop: () => void;
  onCollapse: () => void;
}

export function ChatPanel({
  formName,
  messages,
  isConnected,
  sessionStatus,
  width,
  onSend,
  onStop,
  onCollapse,
}: ChatPanelProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const isActive = sessionStatus === 'in_progress' || sessionStatus === 'awaiting_confirmation';

  return (
    <Box
      sx={{
        width,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        ...getGlassPanel(isDark),
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1,
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        {/* Connection indicator */}
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: isConnected ? '#4caf50' : '#9e9e9e',
            boxShadow: isConnected ? '0 0 6px rgba(76,175,80,0.5)' : 'none',
            transition: 'all 0.3s ease',
          }}
        />
        <Typography
          variant="subtitle2"
          sx={{
            flex: 1,
            fontSize: '0.8rem',
            fontWeight: 600,
            color: theme.palette.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {formName}
        </Typography>
        <IconButton onClick={onCollapse} size="small" sx={{ color: theme.palette.text.secondary }}>
          <CollapseIcon />
        </IconButton>
      </Box>

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          py: 1,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderRadius: 2,
          },
        }}
      >
        {messages.length === 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', fontSize: '0.8rem' }}>
              No messages yet
            </Typography>
          </Box>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <ChatInput
        onSend={onSend}
        onStop={onStop}
        disabled={!isActive}
        isConnected={isConnected}
        isAgentActive={isActive && isConnected}
      />
    </Box>
  );
}

function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
  );
}
