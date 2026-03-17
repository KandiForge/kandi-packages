/**
 * KandiAgenticFormContainer — top-level UI container
 *
 * Layout: artifact timeline (main) + collapsible chat drawer (right)
 * Must be rendered inside a <FormProvider>.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import { useAgenticForm } from '../useAgenticForm.js';
import { useArtifacts } from './useArtifacts.js';
import { ProgressBar } from './ProgressBar.js';
import { ArtifactTimeline } from './ArtifactTimeline.js';
import { ChatPanel } from './ChatPanel.js';
import { DRAWER_TRANSITION } from './theme.js';
import type { AgenticOutputFile } from '../../core/types.js';

export interface KandiAgenticFormContainerProps {
  /** Height of the container (default: '100%') */
  height?: string | number;
  /** Initial drawer state (default: true = open) */
  defaultDrawerOpen?: boolean;
  /** Drawer width in px when open (default: 380) */
  drawerWidth?: number;
  /** Called when user clicks Stop */
  onStop?: () => void;
  /** Called when session completes */
  onComplete?: (files: AgenticOutputFile[]) => void;
  /** Children rendered below the progress bar, above the timeline */
  children?: React.ReactNode;
}

export function KandiAgenticFormContainer({
  height = '100%',
  defaultDrawerOpen = true,
  drawerWidth = 380,
  onStop,
  onComplete,
  children,
}: KandiAgenticFormContainerProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [drawerOpen, setDrawerOpen] = useState(defaultDrawerOpen);
  const [outputFiles, setOutputFiles] = useState<AgenticOutputFile[]>([]);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const form = useAgenticForm();
  const artifacts = useArtifacts(form.session, form.spec, outputFiles);

  // Fetch output files when session completes
  useEffect(() => {
    if (form.session?.status === 'completed') {
      form.getFiles().then((files) => {
        setOutputFiles(files);
        onCompleteRef.current?.(files);
      });
    }
  }, [form.session?.status, form]);

  const handleStop = useCallback(() => {
    form.interrupt();
    onStop?.();
  }, [form, onStop]);

  return (
    <Box
      sx={{
        height,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: isDark ? '#0a0a0f' : '#f5f5f8',
        borderRadius: '12px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      {/* Progress bar */}
      <ProgressBar
        progress={form.progress}
        spec={form.spec}
        session={form.session}
      />

      {/* Custom header slot */}
      {children}

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Artifact timeline — fills available space */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: DRAWER_TRANSITION,
          }}
        >
          <ArtifactTimeline
            artifacts={artifacts}
            sessionStatus={form.session?.status ?? null}
          />
        </Box>

        {/* Chat drawer — collapsible */}
        {drawerOpen ? (
          <ChatPanel
            formName={form.spec?.name ?? 'Agentic Form'}
            messages={form.messages}
            isConnected={form.isConnected}
            sessionStatus={form.session?.status ?? null}
            width={drawerWidth}
            onSend={form.sendMessage}
            onStop={handleStop}
            onCollapse={() => setDrawerOpen(false)}
          />
        ) : (
          /* Collapsed: just a toggle button */
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              pt: 1,
              px: 0.5,
              borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
            }}
          >
            <IconButton
              onClick={() => setDrawerOpen(true)}
              size="small"
              sx={{
                color: theme.palette.text.secondary,
                '&:hover': { color: theme.palette.primary.main },
              }}
              title="Open chat"
            >
              <ChatIcon />
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
    </svg>
  );
}
