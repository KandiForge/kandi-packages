/**
 * Electron example app — kandi-login desktop integration
 *
 * Demonstrates AuthProvider + MuiLoginChip in an Electron renderer.
 * Platform detection is automatic: kandi-login detects the Electron
 * user-agent and uses ElectronProvider + ElectronSecureStorage.
 */

import { useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, Typography } from '@mui/material';
import { AuthProvider, useAuth } from 'kandi-login';
import { MuiLoginChip } from 'kandi-login/react/mui';
import type { KandiLoginConfig, OAuthProviderConfig } from 'kandi-login';

// ---------------------------------------------------------------------------
// Auth configuration — pre-configured against the hosted API
// ---------------------------------------------------------------------------

const providers: OAuthProviderConfig[] = [
  { id: 'google', name: 'Google' },
  { id: 'apple', name: 'Apple' },
];

const authConfig: KandiLoginConfig = {
  authServerUrl: 'https://kandi-packages-api.vercel.app',
  providers,
  deepLinkScheme: 'kandi-example',
};

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

// ---------------------------------------------------------------------------
// Inner component (has access to auth context)
// ---------------------------------------------------------------------------

function AuthStatus() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Restoring session...
      </Typography>
    );
  }

  if (!isAuthenticated) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sign in to get started.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="body1">
        Welcome, {user?.name ?? user?.email ?? 'User'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {user?.email}
      </Typography>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
  const config = useMemo(() => authConfig, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AuthProvider config={config}>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <Box
            component="header"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 3,
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              Electron Example
            </Typography>
            <MuiLoginChip
              providers={providers}
              showOverlayWhenUnauthenticated
              appName="Electron Example"
            />
          </Box>

          {/* Content */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
            }}
          >
            <AuthStatus />
          </Box>
        </Box>
      </AuthProvider>
    </ThemeProvider>
  );
}
