/**
 * useLoginOverlay — Hook for managing a full-screen login overlay
 *
 * Provides state for showing/hiding a login overlay with loading
 * and error states. Used by both MUI and Tailwind overlay components.
 */

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth.js';

export interface UseLoginOverlayReturn {
  /** Whether the overlay should be shown */
  showOverlay: boolean;
  /** Whether a login attempt is in progress */
  isLoggingIn: boolean;
  /** Error message from the last login attempt */
  error: string | null;
  /** Start login flow (opens OAuth) */
  handleLogin: (provider?: string) => Promise<void>;
  /** Dismiss the error */
  clearError: () => void;
}

export function useLoginOverlay(): UseLoginOverlayReturn {
  const { isAuthenticated, login, error: authError } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleLogin = useCallback(async (provider?: string) => {
    setIsLoggingIn(true);
    setLocalError(null);
    try {
      await login(provider);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  }, [login]);

  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  return {
    showOverlay: !isAuthenticated,
    isLoggingIn,
    error: localError ?? authError,
    handleLogin,
    clearError,
  };
}
