/**
 * useAuth — Primary hook for accessing authentication state and actions
 */

import type { KandiLoginUser } from '../core/types.js';
import { useAuthContext } from './AuthProvider.js';

export interface UseAuthReturn {
  /** Current authenticated user (null if not logged in) */
  user: KandiLoginUser | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether auth state is being loaded/restored */
  isLoading: boolean;
  /** Current error message (null if none) */
  error: string | null;
  /** Start OAuth login flow. Pass a provider id to go directly to that provider. */
  login: (provider?: string) => Promise<void>;
  /** Log out the current user */
  logout: () => Promise<void>;
  /** Refresh the user profile from the API */
  refreshUser: () => Promise<void>;
  /** Get the current access token (for manual API calls) */
  getToken: () => Promise<string | null>;
}

/**
 * Hook for managing authentication state.
 * Must be used within an `<AuthProvider>`.
 *
 * @example
 * ```tsx
 * function App() {
 *   const { user, isAuthenticated, login, logout } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={() => login('google')}>Sign in with Google</button>;
 *   }
 *
 *   return <p>Hello, {user?.name}! <button onClick={logout}>Logout</button></p>;
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshUser,
    getToken,
  } = useAuthContext();

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshUser,
    getToken,
  };
}
