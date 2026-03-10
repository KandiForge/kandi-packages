import { ThemeProvider, createTheme, CssBaseline, Box, Typography, Avatar } from '@mui/material';
import { AuthProvider, useAuth } from 'kandi-login';
import { MuiLoginChip } from 'kandi-login/react/mui';
import type { KandiLoginConfig } from 'kandi-login';

// ---------------------------------------------------------------------------
// Auth configuration
// To point at your own server, change authServerUrl below.
// ---------------------------------------------------------------------------
const authConfig: KandiLoginConfig = {
  authServerUrl: 'https://kandi-packages-api.vercel.app',
  providers: [
    { id: 'google', name: 'Google' },
    { id: 'apple', name: 'Apple' },
  ],
};

// ---------------------------------------------------------------------------
// MUI dark theme
// ---------------------------------------------------------------------------
const darkTheme = createTheme({
  palette: { mode: 'dark' },
});

// ---------------------------------------------------------------------------
// User info panel (shown when authenticated)
// ---------------------------------------------------------------------------
function UserInfo() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Loading session...
      </Typography>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Sign in using the button above to see your profile.
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
      }}
    >
      {user.avatar_url ? (
        <Avatar src={user.avatar_url} alt={user.name ?? 'User'} sx={{ width: 56, height: 56 }} />
      ) : (
        <Avatar sx={{ width: 56, height: 56 }}>{(user.name ?? user.email)[0]?.toUpperCase()}</Avatar>
      )}

      <Box>
        {user.name && (
          <Typography variant="h6" sx={{ lineHeight: 1.3 }}>
            {user.name}
          </Typography>
        )}
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {user.email}
        </Typography>
        {typeof user.role === 'string' && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AuthProvider config={authConfig}>
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
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              kandi-login &middot; Vite Example
            </Typography>
            <MuiLoginChip providers={authConfig.providers} />
          </Box>

          {/* Main content */}
          <Box
            component="main"
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              px: 3,
              py: 6,
              maxWidth: 480,
              mx: 'auto',
              width: '100%',
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center' }}>
              Vite + React SPA
            </Typography>

            <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              A minimal single-page app demonstrating <code>kandi-login</code> with MUI.
            </Typography>

            <UserInfo />
          </Box>
        </Box>
      </AuthProvider>
    </ThemeProvider>
  );
}
