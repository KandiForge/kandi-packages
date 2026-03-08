/**
 * MuiLoginOverlay — Full-screen login overlay with provider buttons
 */

import React from 'react';
import {
  Backdrop,
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import type { OAuthProviderConfig } from '../../core/types.js';
import { LoginIcon, AppleIcon, GoogleIcon, FacebookIcon, HelloCoopIcon } from './icons.js';

const BUILT_IN_ICONS: Record<string, React.ReactNode> = {
  apple: <AppleIcon />,
  google: <GoogleIcon />,
  facebook: <FacebookIcon />,
  hellocoop: <HelloCoopIcon />,
};

export interface MuiLoginOverlayProps {
  open: boolean;
  onLogin: (provider?: string) => void;
  providers?: OAuthProviderConfig[];
  loading?: boolean;
  error?: string | null;
  brandingComponent?: React.ReactNode;
  appName?: string;
  className?: string;
}

export const MuiLoginOverlay: React.FC<MuiLoginOverlayProps> = ({
  open,
  onLogin,
  providers = [],
  loading = false,
  error = null,
  brandingComponent,
  appName = 'App',
  className,
}) => {
  return (
    <Backdrop
      open={open}
      className={className}
      sx={{
        zIndex: 9999,
        backgroundColor: 'background.default',
        color: 'text.primary',
        flexDirection: 'column',
        backdropFilter: 'blur(4px)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          maxWidth: 400,
          px: 4,
        }}
      >
        {brandingComponent || (
          <Typography variant="h1" sx={{ fontSize: 64, mb: 3 }}>
            {String.fromCodePoint(0x1f510)}
          </Typography>
        )}

        <Typography variant="h5" component="h1" sx={{ mb: 2, fontWeight: 600 }}>
          Welcome to {appName}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Sign in to continue
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
            {error}
          </Alert>
        )}

        {/* Provider buttons */}
        {providers.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', mb: 2 }}>
            {providers.filter(p => p.enabled !== false).map((provider) => (
              <Button
                key={provider.id}
                variant="outlined"
                fullWidth
                size="large"
                disabled={loading}
                onClick={() => onLogin(provider.id)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: 'divider',
                  color: 'text.primary',
                  gap: 1,
                  '&:hover': { borderColor: 'text.primary' },
                }}
              >
                {loading ? (
                  <CircularProgress size={20} />
                ) : (
                  <>
                    {provider.icon ?? BUILT_IN_ICONS[provider.id] ?? null}
                    Sign in with {provider.name}
                  </>
                )}
              </Button>
            ))}
          </Box>
        ) : (
          <Button
            variant="contained"
            size="large"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
            onClick={() => onLogin()}
            disabled={loading}
            sx={{ minWidth: 200, py: 1.5 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        )}
      </Box>
    </Backdrop>
  );
};
