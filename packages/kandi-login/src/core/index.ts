export { AuthService } from './auth-service.js';
export { detectPlatform, isTauri, isElectron, isWeb } from './platform-detector.js';
export {
  TauriKeychainStorage,
  WebLocalStorage,
  ElectronSecureStorage,
  createDefaultTokenStorage,
} from './token-storage.js';
export { TauriProvider, ElectronProvider, WebProvider } from './providers/index.js';
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
} from './types.js';
