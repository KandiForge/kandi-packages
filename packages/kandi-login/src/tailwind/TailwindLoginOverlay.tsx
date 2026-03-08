/**
 * TailwindLoginOverlay — Full-screen login overlay styled with Tailwind CSS
 */

import React from 'react';
import type { OAuthProviderConfig } from '../core/types.js';

const PROVIDER_ICONS: Record<string, string> = {
  apple: 'M14.94 13.067c-.326.753-.482 1.09-.901 1.753-.585.924-1.41 2.076-2.432 2.087-1.022.012-1.284-.665-2.669-.656-1.385.008-1.673.67-2.695.658-1.022-.012-1.802-1.044-2.387-1.968C2.24 12.5 2.078 9.913 3.004 8.54c.66-0.98 1.707-1.555 2.688-1.555.999 0 1.627.668 2.453.668.801 0 1.29-.67 2.446-.67.875 0 1.8.476 2.458 1.299-2.16 1.184-1.81 4.27.391 5.286zM10.77 5.225c.462-.594.813-1.432.685-2.285-.753.05-1.634.532-2.148 1.157-.467.567-.85 1.416-.7 2.24.82.027 1.668-.464 2.163-1.112z',
};

export interface TailwindLoginOverlayProps {
  open: boolean;
  onLogin: (provider?: string) => void;
  providers?: OAuthProviderConfig[];
  loading?: boolean;
  error?: string | null;
  brandingComponent?: React.ReactNode;
  appName?: string;
  className?: string;
}

export const TailwindLoginOverlay: React.FC<TailwindLoginOverlayProps> = ({
  open,
  onLogin,
  providers = [],
  loading = false,
  error = null,
  brandingComponent,
  appName = 'App',
  className = '',
}) => {
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm ${className}`}
      style={{ backgroundColor: 'var(--kl-bg, #fff)' }}
    >
      <div className="flex flex-col items-center text-center max-w-sm px-8">
        {brandingComponent || (
          <div className="text-6xl mb-6">{String.fromCodePoint(0x1f510)}</div>
        )}

        <h1
          className="text-2xl font-semibold mb-2"
          style={{ color: 'var(--kl-text)' }}
        >
          Welcome to {appName}
        </h1>

        <p
          className="mb-8"
          style={{ color: 'var(--kl-text-secondary)' }}
        >
          Sign in to continue
        </p>

        {error && (
          <div
            className="w-full mb-6 px-4 py-3 rounded-md text-sm"
            style={{
              backgroundColor: 'var(--kl-error-bg)',
              color: 'var(--kl-error)',
              border: '1px solid var(--kl-error)',
            }}
          >
            {error}
          </div>
        )}

        {providers.length > 0 ? (
          <div className="flex flex-col gap-3 w-full">
            {providers.filter(p => p.enabled !== false).map((provider) => (
              <button
                key={provider.id}
                disabled={loading}
                onClick={() => onLogin(provider.id)}
                className="w-full py-3 px-4 rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                style={{
                  color: 'var(--kl-text)',
                  border: '1px solid var(--kl-border)',
                  borderRadius: 'var(--kl-radius)',
                }}
              >
                {loading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    {provider.icon ?? (
                      PROVIDER_ICONS[provider.id] ? (
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                          <path d={PROVIDER_ICONS[provider.id]} />
                        </svg>
                      ) : null
                    )}
                    Sign in with {provider.name}
                  </>
                )}
              </button>
            ))}
          </div>
        ) : (
          <button
            disabled={loading}
            onClick={() => onLogin()}
            className="py-3 px-8 rounded-md font-semibold text-sm transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--kl-primary)',
              color: 'var(--kl-text-on-primary)',
              borderRadius: 'var(--kl-radius)',
            }}
          >
            {loading ? <LoadingSpinner /> : 'Sign In'}
          </button>
        )}
      </div>
    </div>
  );
};

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      style={{ color: 'var(--kl-text-secondary)' }}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
