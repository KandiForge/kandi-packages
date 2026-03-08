/**
 * AuthProvider — React context provider for kandi-login
 *
 * Wraps your app to provide authentication state and actions.
 * Creates an AuthService instance from config and auto-restores session on mount.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { AuthService } from '../core/auth-service.js';
import type {
  KandiLoginConfig,
  KandiLoginUser,
  AuthEvent,
} from '../core/types.js';

export interface AuthContextValue {
  /** The underlying AuthService instance */
  authService: AuthService;
  /** Current authenticated user (null if not logged in) */
  user: KandiLoginUser | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether auth state is being loaded/restored */
  isLoading: boolean;
  /** Current error message (null if none) */
  error: string | null;
  /** Start OAuth login flow for a provider */
  login: (provider?: string) => Promise<void>;
  /** Log out the current user */
  logout: () => Promise<void>;
  /** Refresh the user profile from the API */
  refreshUser: () => Promise<void>;
  /** Get the current access token */
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  /** kandi-login configuration */
  config: KandiLoginConfig;
  children: React.ReactNode;
  /** Called after successful login */
  onLogin?: (user: KandiLoginUser) => void;
  /** Called after logout */
  onLogout?: () => void;
  /** Called on auth error */
  onError?: (error: Error) => void;
}

export function AuthProvider({
  config,
  children,
  onLogin,
  onLogout,
  onError,
}: AuthProviderProps) {
  const [user, setUser] = useState<KandiLoginUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable refs for callbacks to avoid re-creating AuthService
  const onLoginRef = useRef(onLogin);
  const onLogoutRef = useRef(onLogout);
  const onErrorRef = useRef(onError);
  onLoginRef.current = onLogin;
  onLogoutRef.current = onLogout;
  onErrorRef.current = onError;

  // Create AuthService once from config (stable reference)
  const authService = useMemo(() => new AuthService(config), [config]);

  // Subscribe to auth events and restore session
  useEffect(() => {
    const unsubscribe = authService.onAuthEvent((event: AuthEvent) => {
      switch (event.type) {
        case 'login':
          setUser(event.user ?? null);
          setError(null);
          if (event.user) {
            onLoginRef.current?.(event.user);
          }
          break;
        case 'logout':
          setUser(null);
          setError(null);
          onLogoutRef.current?.();
          break;
        case 'error':
          setError(event.error?.message ?? 'Authentication error');
          onErrorRef.current?.(event.error ?? new Error('Authentication error'));
          break;
        case 'token_refresh':
          // Token refreshed — no UI change needed
          break;
      }
    });

    // Restore session on mount
    authService.restoreSession().then((restoredUser) => {
      if (restoredUser) {
        setUser(restoredUser);
      }
    }).catch(() => {
      // Session restore failed silently
    }).finally(() => {
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      authService.destroy();
    };
  }, [authService]);

  const login = useCallback(async (provider?: string) => {
    setError(null);
    try {
      await authService.login(provider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    }
  }, [authService]);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await authService.logout();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      throw err;
    }
  }, [authService]);

  const refreshUser = useCallback(async () => {
    const freshUser = await authService.getUser(true);
    setUser(freshUser);
  }, [authService]);

  const getToken = useCallback(async () => {
    return authService.getToken();
  }, [authService]);

  const value = useMemo<AuthContextValue>(() => ({
    authService,
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    refreshUser,
    getToken,
  }), [authService, user, isLoading, error, login, logout, refreshUser, getToken]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Access the auth context. Must be used within an AuthProvider.
 * @internal — prefer the useAuth hook instead.
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}
