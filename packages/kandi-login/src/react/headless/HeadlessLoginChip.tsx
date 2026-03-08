/**
 * HeadlessLoginChip — Render-prop component with zero styling
 *
 * Exposes all auth state and UI state for consumers to render however they want.
 * This is the foundation that MUI and Tailwind variants build upon.
 */

import React, { useState, useCallback } from 'react';
import type { KandiLoginUser, OAuthProviderConfig } from '../../core/types.js';
import { useAuth } from '../useAuth.js';
import { useLoginOverlay } from '../useLoginOverlay.js';

export interface HeadlessLoginChipRenderProps {
  /** Current user (null if not logged in) */
  user: KandiLoginUser | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether auth state is being loaded */
  isLoading: boolean;
  /** Whether a login attempt is in progress */
  isLoggingIn: boolean;
  /** Current error message */
  error: string | null;
  /** Start OAuth login for a provider */
  login: (provider?: string) => Promise<void>;
  /** Log out */
  logout: () => Promise<void>;
  /** Whether the dropdown menu is open */
  menuOpen: boolean;
  /** Open the dropdown menu */
  openMenu: (event: React.MouseEvent<HTMLElement>) => void;
  /** Close the dropdown menu */
  closeMenu: () => void;
  /** Anchor element for the menu (for positioning) */
  anchorEl: HTMLElement | null;
  /** Display name (computed from user fields) */
  displayName: string;
  /** User email */
  email: string;
}

export interface HeadlessLoginChipProps {
  /** Configured OAuth providers */
  providers?: OAuthProviderConfig[];
  /** Render function receiving all state and actions */
  children: (props: HeadlessLoginChipRenderProps) => React.ReactNode;
}

export const HeadlessLoginChip: React.FC<HeadlessLoginChipProps> = ({
  children,
}) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { isLoggingIn, error, handleLogin } = useLoginOverlay();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(anchorEl);

  const openMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const closeMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const displayName = (user?.name ?? user?.display_name ?? user?.email ?? 'User') as string;
  const email = user?.email ?? '';

  return (
    <>
      {children({
        user,
        isAuthenticated,
        isLoading,
        isLoggingIn,
        error,
        login: handleLogin,
        logout,
        menuOpen,
        openMenu,
        closeMenu,
        anchorEl,
        displayName,
        email,
      })}
    </>
  );
};
