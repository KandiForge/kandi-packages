import { useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, Typography, AppBar, Toolbar } from '@mui/material';
import { AuthProvider, useAuth } from 'kandi-login/react';
import { MuiLoginChip } from 'kandi-login/react/mui';
import type { KandiLoginConfig, OAuthProviderConfig } from 'kandi-login';

const providers: OAuthProviderConfig[] = [
  { id: 'google', name: 'Google' },
  { id: 'apple', name: 'Apple' },
];

const authConfig: KandiLoginConfig = {
  authServerUrl: 'https://kandi-packages-api.vercel.app',
  providers,
  deepLinkScheme: 'kandi-example',
  keychainService: 'com.kandiforge.example',
};

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function UserInfo() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Typography variant="body1" color="text.secondary">
        Restoring session...
      </Typography>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h5" gutterBottom>
          Welcome to the kandi-login Tauri Example
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Click &ldquo;Sign In&rdquo; in the top-right corner to authenticate.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h5" gutterBottom>
        Welcome, {user.name ?? user.email}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {user.email}
      </Typography>
      <Box
        component="pre"
        sx={{
          mx: 'auto',
          maxWidth: 480,
          p: 2,
          borderRadius: 1,
          bgcolor: 'background.paper',
          textAlign: 'left',
          fontSize: 13,
          overflow: 'auto',
        }}
      >
        {JSON.stringify(user, null, 2)}
      </Box>
    </Box>
  );
}

export default function App() {
  const config = useMemo(() => authConfig, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AuthProvider config={config}>
        <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              kandi-login
            </Typography>
            <MuiLoginChip
              providers={providers}
              showOverlayWhenUnauthenticated
              appName="Tauri Example"
            />
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 3 }}>
          <UserInfo />
        </Box>
      </AuthProvider>
    </ThemeProvider>
  );
}
