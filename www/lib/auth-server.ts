import { createAuthServer, type AuthServer } from 'kandi-login/server';
import { userAdapter } from './user-adapter';

let _auth: AuthServer | null = null;

export function getAuth(): AuthServer {
  if (!_auth) {
    _auth = createAuthServer({
      jwt: {
        secret: process.env.JWT_SECRET!,
        issuer: process.env.JWT_ISSUER ?? 'packages.kandiforge.com',
      },
      providers: {
        google: process.env.GOOGLE_CLIENT_ID
          ? { clientId: process.env.GOOGLE_CLIENT_ID }
          : undefined,
        apple: process.env.APPLE_CLIENT_ID
          ? { clientId: process.env.APPLE_CLIENT_ID }
          : undefined,
        hellocoop: process.env.HELLO_CLIENT_ID
          ? { clientId: process.env.HELLO_CLIENT_ID }
          : undefined,
        facebook:
          process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET
            ? {
                appId: process.env.FACEBOOK_APP_ID,
                appSecret: process.env.FACEBOOK_APP_SECRET,
              }
            : undefined,
      },
      userAdapter,
      baseUrl:
        process.env.BASE_URL ?? 'https://packages.kandiforge.com',
      successRedirectUrl:
        process.env.SUCCESS_REDIRECT_URL ?? 'https://packages.kandiforge.com',
      corsOrigins: [
        'https://packages.kandiforge.com',
        'http://localhost:3100',
      ],
      enableTestPersonas: true,
      testTokenEncryptionSecret: process.env.TEST_TOKEN_SECRET,
    });
  }
  return _auth;
}
