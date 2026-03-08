/**
 * MuiLoginChip — MUI-styled login chip with glass/flat variants
 *
 * Shows a login button when unauthenticated, avatar + dropdown when authenticated.
 * Extracted from KandiForge's KandiLoginChip with app-specific features removed.
 */

import React, { useState, useCallback } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Box,
  Typography,
  Divider,
  useTheme,
} from '@mui/material';
import type { ChipVariant, LoginChipMenuItem, OAuthProviderConfig } from '../../core/types.js';
import { useAuth } from '../useAuth.js';
import { useLoginOverlay } from '../useLoginOverlay.js';
import { MuiUserAvatar } from './MuiUserAvatar.js';
import { MuiLoginOverlay } from './MuiLoginOverlay.js';
import { LoginIcon, LogoutIcon, ChevronDownIcon } from './icons.js';

// ---------------------------------------------------------------------------
// Glassmorphism styles
// ---------------------------------------------------------------------------

const getChipGlass = (isDark: boolean) => ({
  background: isDark
    ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.6) 0%, rgba(25, 25, 25, 0.4) 100%)'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(245, 245, 245, 0.6) 100%)',
  backdropFilter: 'blur(32px) saturate(160%)',
  border: isDark
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)',
  boxShadow: isDark
    ? '0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
    : '0 8px 32px 0 rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
});

const getChipGlassHover = (isDark: boolean) => ({
  borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
  background: isDark
    ? 'linear-gradient(135deg, rgba(55, 55, 55, 0.7) 0%, rgba(35, 35, 35, 0.5) 100%)'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(250, 250, 250, 0.7) 100%)',
  boxShadow: isDark
    ? '0 10px 40px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
    : '0 10px 40px 0 rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
});

const getChipFlat = (_isDark: boolean) => ({
  background: 'transparent',
  backdropFilter: 'none',
  border: '1px solid transparent',
  boxShadow: 'none',
});

const getChipFlatHover = (isDark: boolean) => ({
  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
  background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
  boxShadow: 'none',
});

const getMenuGlass = (isDark: boolean) => ({
  background: isDark
    ? 'linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.85) 100%)'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 250, 0.9) 100%)',
  backdropFilter: 'blur(32px) saturate(160%)',
  border: isDark
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.1)',
  boxShadow: isDark
    ? '0 16px 48px 0 rgba(0, 0, 0, 0.5)'
    : '0 16px 48px 0 rgba(0, 0, 0, 0.15)',
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface MuiLoginChipProps {
  /** Visual variant: 'glass' (default) for glassmorphism, 'flat' for minimal */
  variant?: ChipVariant;
  /** Custom menu items for the authenticated dropdown */
  menuItems?: LoginChipMenuItem[];
  /** Whether to show full-screen login overlay when unauthenticated */
  showOverlayWhenUnauthenticated?: boolean;
  /** OAuth providers shown on the overlay */
  providers?: OAuthProviderConfig[];
  /** App name for overlay branding */
  appName?: string;
  /** Custom branding component for overlay */
  brandingComponent?: React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Border radius in pixels (default: 6) */
  borderRadius?: number;
}

export const MuiLoginChip: React.FC<MuiLoginChipProps> = ({
  variant = 'glass',
  menuItems = [],
  showOverlayWhenUnauthenticated = false,
  providers = [],
  appName = 'App',
  brandingComponent,
  className,
  borderRadius = 6,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { showOverlay, isLoggingIn, error, handleLogin } = useLoginOverlay();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const isFlat = variant === 'flat';
  const chipStyle = isFlat ? getChipFlat(isDark) : getChipGlass(isDark);
  const chipHoverStyle = isFlat ? getChipFlatHover(isDark) : getChipGlassHover(isDark);
  const menuGlass = getMenuGlass(isDark);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleLogout = useCallback(async () => {
    handleMenuClose();
    await logout();
  }, [handleMenuClose, logout]);

  const displayName = user?.name ?? user?.display_name ?? user?.email ?? 'User';
  const email = user?.email ?? '';

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ px: 2 }} className={className}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // Unauthenticated state
  if (!isAuthenticated) {
    return (
      <>
        <Button
          variant="outlined"
          startIcon={<LoginIcon />}
          onClick={() => handleLogin()}
          disabled={isLoggingIn}
          className={className}
          size="small"
          sx={{
            height: 32,
            background: chipStyle.background,
            backdropFilter: chipStyle.backdropFilter,
            WebkitBackdropFilter: chipStyle.backdropFilter,
            border: chipStyle.border,
            boxShadow: chipStyle.boxShadow,
            borderRadius: `${borderRadius}px`,
            transition: 'all 0.15s ease',
            '&:hover': {
              borderColor: chipHoverStyle.borderColor,
              background: chipHoverStyle.background,
              boxShadow: chipHoverStyle.boxShadow,
            },
          }}
        >
          {isLoggingIn ? 'Signing in...' : 'Sign In'}
        </Button>

        {showOverlayWhenUnauthenticated && (
          <MuiLoginOverlay
            open={showOverlay}
            onLogin={handleLogin}
            providers={providers}
            loading={isLoggingIn}
            error={error}
            appName={appName}
            brandingComponent={brandingComponent}
          />
        )}
      </>
    );
  }

  // Authenticated state
  const topItems = menuItems.filter(item => item.position !== 'bottom');
  const bottomItems = menuItems.filter(item => item.position === 'bottom');

  return (
    <>
      <Button
        onClick={handleMenuOpen}
        className={className}
        sx={{
          textTransform: 'none',
          color: 'text.primary',
          px: 1,
          py: 0.25,
          minWidth: 'auto',
          height: 32,
          background: chipStyle.background,
          backdropFilter: chipStyle.backdropFilter,
          WebkitBackdropFilter: chipStyle.backdropFilter,
          border: chipStyle.border,
          boxShadow: chipStyle.boxShadow,
          borderRadius: `${borderRadius}px`,
          transition: 'all 0.15s ease',
          '&:hover': {
            borderColor: chipHoverStyle.borderColor,
            background: chipHoverStyle.background,
            boxShadow: chipHoverStyle.boxShadow,
          },
        }}
        endIcon={<ChevronDownIcon />}
        aria-controls={menuOpen ? 'kandi-login-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={menuOpen ? 'true' : undefined}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MuiUserAvatar email={email} name={String(displayName)} size="small" />
          <Typography
            variant="body2"
            sx={{
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </Typography>
        </Box>
      </Button>

      <Menu
        id="kandi-login-menu"
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            elevation: 3,
            sx: {
              minWidth: 180,
              backgroundImage: menuGlass.background,
              backdropFilter: menuGlass.backdropFilter,
              WebkitBackdropFilter: menuGlass.backdropFilter,
              border: menuGlass.border,
              boxShadow: menuGlass.boxShadow,
              borderRadius: `${borderRadius}px`,
            },
          },
        }}
      >
        {/* Top menu items */}
        {topItems.map((item, index) => (
          <React.Fragment key={`top-${index}`}>
            <MenuItem onClick={() => { handleMenuClose(); item.onClick(); }}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText>{item.label}</ListItemText>
            </MenuItem>
            {item.dividerAfter && <Divider sx={{ my: 0.5 }} />}
          </React.Fragment>
        ))}

        {/* Bottom menu items */}
        {bottomItems.map((item, index) => (
          <React.Fragment key={`bottom-${index}`}>
            <MenuItem onClick={() => { handleMenuClose(); item.onClick(); }}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText>{item.label}</ListItemText>
            </MenuItem>
            {item.dividerAfter && <Divider sx={{ my: 0.5 }} />}
          </React.Fragment>
        ))}

        {(topItems.length > 0 || bottomItems.length > 0) && <Divider sx={{ my: 0.5 }} />}

        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
            primaryTypographyProps={{ color: 'error' }}
          />
        </MenuItem>
      </Menu>
    </>
  );
};
