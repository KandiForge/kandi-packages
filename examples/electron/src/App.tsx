/**
 * Electron example app — kandi-login desktop integration
 *
 * Demonstrates AuthProvider + MuiLoginChip in an Electron renderer.
 * Platform detection is automatic: kandi-login detects the Electron
 * user-agent and uses ElectronProvider + ElectronSecureStorage.
 *
 * @license MIT
 * @author KandiForge
 */

import { useState, useMemo, useCallback } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Typography,
  Avatar,
  Button,
  Chip,
  Collapse,
  Divider,
} from '@mui/material';
import { AuthProvider, useAuth } from 'kandi-login';
import { MuiLoginChip } from 'kandi-login/react/mui';
import type { KandiLoginConfig, OAuthProviderConfig } from 'kandi-login';

// ---------------------------------------------------------------------------
// Auth configuration — pre-configured against the hosted API
// To point at your own server, change authServerUrl below:
//   authServerUrl: 'https://your-auth-server.example.com',
// ---------------------------------------------------------------------------

const AUTH_SERVER_URL = 'https://kandi-packages-api.vercel.app';

const providers: OAuthProviderConfig[] = [
  { id: 'google', name: 'Google' },
  { id: 'apple', name: 'Apple' },
];

const authConfig: KandiLoginConfig = {
  authServerUrl: AUTH_SERVER_URL,
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
// Test Personas
// ---------------------------------------------------------------------------

interface TestPersona {
  id: string;
  name: string;
  email: string;
  role: string;
}

const TEST_PERSONAS: TestPersona[] = [
  { id: 'admin-alex', name: 'Alex Admin', email: 'alex@test.kandi.dev', role: 'admin' },
  { id: 'designer-dana', name: 'Dana Designer', email: 'dana@test.kandi.dev', role: 'user' },
  { id: 'viewer-val', name: 'Val Viewer', email: 'val@test.kandi.dev', role: 'viewer' },
  { id: 'new-user-naya', name: 'Naya Newbie', email: 'naya@test.kandi.dev', role: 'user' },
];

/**
 * TestPanel — quick-login buttons for each test persona.
 * Calls POST /test/login-as on the auth server and injects the returned
 * tokens into the Electron secure storage, then reloads to restore session.
 */
function TestPanel() {
  const { isAuthenticated, logout } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleLoginAs = useCallback(
    async (personaId: string) => {
      setLoading(personaId);
      setError(null);
      try {
        const res = await fetch(`${AUTH_SERVER_URL}/test/login-as`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personaId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as Record<string, string>).error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { access_token: string; refresh_token: string };

        // Store tokens via Electron's secure storage API, then reload so
        // AuthProvider picks them up during session restore.
        const api = (window as unknown as { electronAPI: {
          secureStorage: {
            set: (key: string, value: string) => Promise<void>;
          };
        } }).electronAPI;
        await api.secureStorage.set('access_token', data.access_token);
        await api.secureStorage.set('refresh_token', data.refresh_token);
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login-as failed');
        setLoading(null);
      }
    },
    [],
  );

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
        maxWidth: 420,
        width: '100%',
      }}
    >
      <Button
        size="small"
        onClick={() => setExpanded(!expanded)}
        sx={{ textTransform: 'none', mb: expanded ? 1 : 0 }}
      >
        {expanded ? 'Hide' : 'Show'} Test Personas
      </Button>

      <Collapse in={expanded}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Quick-login as a test persona (no OAuth required).
        </Typography>

        {isAuthenticated && (
          <Button
            size="small"
            variant="outlined"
            color="warning"
            onClick={() => { void logout(); }}
            sx={{ mb: 1, textTransform: 'none' }}
          >
            Logout first
          </Button>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {TEST_PERSONAS.map((p) => (
            <Button
              key={p.id}
              variant="outlined"
              size="small"
              disabled={loading !== null}
              onClick={() => { void handleLoginAs(p.id); }}
              sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <span>{p.name}</span>
                <Chip label={p.role} size="small" variant="outlined" sx={{ ml: 'auto' }} />
                {loading === p.id && (
                  <Typography variant="caption" color="text.secondary">
                    ...
                  </Typography>
                )}
              </Box>
            </Button>
          ))}
        </Box>

        {error && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            {error}
          </Typography>
        )}
      </Collapse>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// User info panel (shown when authenticated)
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

  if (!isAuthenticated || !user) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sign in to get started.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 3,
        borderRadius: 2,
        bgcolor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        maxWidth: 420,
        width: '100%',
      }}
    >
      {user.avatar_url ? (
        <Avatar src={user.avatar_url} alt={user.name ?? 'User'} sx={{ width: 48, height: 48 }} />
      ) : (
        <Avatar sx={{ width: 48, height: 48 }}>{(user.name ?? user.email)[0]?.toUpperCase()}</Avatar>
      )}
      <Box>
        <Typography variant="body1" fontWeight={600}>
          {user.name ?? user.email ?? 'User'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {user.email}
        </Typography>
        {typeof user.role === 'string' && (
          <Typography variant="caption" color="text.secondary">
            Role: {user.role}
          </Typography>
        )}
      </Box>
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
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              p: 4,
            }}
          >
            <AuthStatus />
            <Divider sx={{ width: '100%', maxWidth: 420 }} />
            <TestPanel />
          </Box>
        </Box>
      </AuthProvider>
    </ThemeProvider>
  );
}
