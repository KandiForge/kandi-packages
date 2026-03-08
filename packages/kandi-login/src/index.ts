// Core
export { AuthService } from './core/auth-service.js';
export { detectPlatform, isTauri, isElectron, isWeb } from './core/platform-detector.js';
export {
  TauriKeychainStorage,
  WebLocalStorage,
  ElectronSecureStorage,
  createDefaultTokenStorage,
} from './core/token-storage.js';
export type {
  KandiLoginUser,
  KandiLoginConfig,
  OAuthProviderConfig,
  BuiltInProvider,
  TokenStorageAdapter,
  PlatformAdapter,
  OAuthCallbackPayload,
  Platform,
  AuthEvent,
  AuthEventType,
  AuthEventListener,
  AuthState,
  LoginChipMenuItem,
  ChipVariant,
} from './core/types.js';

// React
export { AuthProvider } from './react/AuthProvider.js';
export type { AuthProviderProps, AuthContextValue } from './react/AuthProvider.js';
export { useAuth } from './react/useAuth.js';
export type { UseAuthReturn } from './react/useAuth.js';
export { useLoginOverlay } from './react/useLoginOverlay.js';
export type { UseLoginOverlayReturn } from './react/useLoginOverlay.js';
