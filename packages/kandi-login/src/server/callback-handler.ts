/**
 * Server-side OAuth callback handler
 *
 * Provides framework-agnostic handlers for Express and Vercel serverless.
 * Handles the OAuth callback redirect, exchanges the code for tokens,
 * and redirects to the appropriate URL (web or deep link).
 */

import type {
  CallbackHandlerConfig,
  CallbackRequest,
  CallbackResponse,
} from './types.js';

function getQueryParam(
  query: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = query[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Create an OAuth callback handler from configuration.
 *
 * @example
 * ```ts
 * import { createCallbackHandler } from 'kandi-login/server';
 *
 * const handler = createCallbackHandler({
 *   exchangeCode: async (code, provider) => {
 *     // Exchange code with your OAuth provider
 *     return { access_token: '...', refresh_token: '...', user: { ... } };
 *   },
 *   successRedirectUrl: 'https://myapp.com/dashboard',
 *   deepLinkScheme: 'myapp',
 * });
 *
 * // Express
 * app.get('/auth/callback', handler.handle);
 *
 * // Vercel
 * export default handler.handle;
 * ```
 */
export function createCallbackHandler(config: CallbackHandlerConfig) {
  async function handle(req: CallbackRequest, res: CallbackResponse): Promise<void> {
    const code = getQueryParam(req.query, 'code');
    const provider = getQueryParam(req.query, 'provider') ?? 'default';
    const errorParam = getQueryParam(req.query, 'error');
    const clientType = getQueryParam(req.query, 'client_type');

    // Handle error from OAuth provider
    if (errorParam) {
      const errorDesc = getQueryParam(req.query, 'error_description') ?? errorParam;
      redirectWithError(res, config, clientType, errorDesc);
      return;
    }

    if (!code) {
      redirectWithError(res, config, clientType, 'Missing authorization code');
      return;
    }

    try {
      const result = await config.exchangeCode(code, provider);

      // Desktop deep link
      if (clientType === 'desktop' && config.deepLinkScheme) {
        const deepLinkUrl = new URL(`${config.deepLinkScheme}://auth/callback`);
        deepLinkUrl.searchParams.set('access_token', result.access_token);
        deepLinkUrl.searchParams.set('refresh_token', result.refresh_token);
        res.redirect(deepLinkUrl.toString());
        return;
      }

      // Web redirect
      const redirectUrl = new URL(config.successRedirectUrl);
      redirectUrl.searchParams.set('access_token', result.access_token);
      redirectUrl.searchParams.set('refresh_token', result.refresh_token);
      res.redirect(redirectUrl.toString());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token exchange failed';
      redirectWithError(res, config, clientType, message);
    }
  }

  return { handle };
}

function redirectWithError(
  res: CallbackResponse,
  config: CallbackHandlerConfig,
  clientType: string | undefined,
  error: string,
): void {
  if (clientType === 'desktop' && config.deepLinkScheme) {
    const deepLinkUrl = new URL(`${config.deepLinkScheme}://auth/callback`);
    deepLinkUrl.searchParams.set('error', error);
    res.redirect(deepLinkUrl.toString());
    return;
  }

  const errorUrl = config.errorRedirectUrl ?? config.successRedirectUrl;
  const redirectUrl = new URL(errorUrl);
  redirectUrl.searchParams.set('error', error);
  res.redirect(redirectUrl.toString());
}
