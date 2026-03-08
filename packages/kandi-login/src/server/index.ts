// Main factory
export { createAuthServer } from './create-auth-server.js';

// JWT utilities
export {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './jwt.js';

// Security utilities
export { generateState, verifyState, generateNonce, extractBearerToken } from './security.js';

// Encryption utilities
export { encrypt, decrypt } from './encryption.js';

// Test personas
export { DEFAULT_PERSONAS, seedTestPersonas } from './test-personas.js';

// Provider utilities (for advanced use)
export {
  buildHelloCoopAuthUrl,
  buildHelloCoopAuthUrlWithHint,
  exchangeHelloCoopCode,
  fetchHelloCoopProfile,
  verifyAppleIdToken,
  verifyGoogleIdToken,
  buildFacebookAuthUrl,
  exchangeFacebookCode,
  fetchFacebookProfile,
} from './providers/index.js';

// Legacy callback handler (v0 compat)
export { createCallbackHandler } from './callback-handler.js';

// Types
export type {
  AuthServerConfig,
  AuthServer,
  AuthHandler,
  AuthRequest,
  AuthResponse,
  AccessTokenPayload,
  JwtConfig,
  HelloCoopCredentials,
  GoogleCredentials,
  AppleCredentials,
  FacebookCredentials,
  ProviderCredentials,
  OAuthProfile,
  UserAdapter,
  TestPersonaDefinition,
  // Legacy
  CallbackHandlerConfig,
  CallbackRequest,
  CallbackResponse,
} from './types.js';
