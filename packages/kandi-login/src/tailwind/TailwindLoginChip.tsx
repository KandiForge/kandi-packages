/**
 * TailwindLoginChip — Login chip styled with Tailwind CSS + CSS custom properties
 *
 * Import 'kandi-login/tailwind/kandi-login.css' for theming variables.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ChipVariant, LoginChipMenuItem, OAuthProviderConfig } from '../core/types.js';
import { getInitials, generateAvatarColor } from '../react/mui/avatar-utils.js';
import { useAuth } from '../react/useAuth.js';
import { useLoginOverlay } from '../react/useLoginOverlay.js';
import { TailwindLoginOverlay } from './TailwindLoginOverlay.js';

export interface TailwindLoginChipProps {
  variant?: ChipVariant;
  menuItems?: LoginChipMenuItem[];
  showOverlayWhenUnauthenticated?: boolean;
  providers?: OAuthProviderConfig[];
  appName?: string;
  brandingComponent?: React.ReactNode;
  className?: string;
}

export const TailwindLoginChip: React.FC<TailwindLoginChipProps> = ({
  variant = 'glass',
  menuItems = [],
  showOverlayWhenUnauthenticated = false,
  providers = [],
  appName = 'App',
  brandingComponent,
  className = '',
}) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { showOverlay, isLoggingIn, error, handleLogin } = useLoginOverlay();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleLogout = useCallback(async () => {
    setMenuOpen(false);
    await logout();
  }, [logout]);

  const displayName = (user?.name ?? user?.display_name ?? user?.email ?? 'User') as string;
  const email = user?.email ?? '';
  const initials = getInitials(displayName);
  const avatarGradient = generateAvatarColor(email);

  const isGlass = variant === 'glass';

  const chipBaseStyle: React.CSSProperties = isGlass
    ? {
        background: 'var(--kl-glass-bg)',
        backdropFilter: 'var(--kl-glass-blur)',
        WebkitBackdropFilter: 'var(--kl-glass-blur)',
        border: '1px solid var(--kl-border)',
        boxShadow: 'var(--kl-glass-shadow)',
        borderRadius: 'var(--kl-radius)',
      }
    : {
        background: 'transparent',
        border: '1px solid transparent',
        borderRadius: 'var(--kl-radius)',
      };

  // Loading
  if (isLoading) {
    return (
      <div className={`inline-flex items-center px-4 ${className}`}>
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // Unauthenticated
  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={() => handleLogin()}
          disabled={isLoggingIn}
          className={`inline-flex items-center gap-2 px-3 text-sm font-medium transition-all duration-150 disabled:opacity-50 ${className}`}
          style={{
            ...chipBaseStyle,
            height: 'var(--kl-chip-height)',
            color: 'var(--kl-text)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
          </svg>
          {isLoggingIn ? 'Signing in...' : 'Sign In'}
        </button>

        {showOverlayWhenUnauthenticated && (
          <TailwindLoginOverlay
            open={showOverlay}
            onLogin={handleLogin}
            providers={providers}
            loading={isLoggingIn}
            error={error}
            appName={appName}
            brandingComponent={brandingComponent}
          />
        )}
      </>
    );
  }

  // Authenticated
  const topItems = menuItems.filter(i => i.position !== 'bottom');
  const bottomItems = menuItems.filter(i => i.position === 'bottom');

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className={`inline-flex items-center gap-2 px-2 py-0.5 text-sm transition-all duration-150 ${className}`}
        style={{
          ...chipBaseStyle,
          height: 'var(--kl-chip-height)',
          color: 'var(--kl-text)',
        }}
        aria-expanded={menuOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 28,
            height: 28,
            background: avatarGradient,
          }}
        >
          <span className="text-white text-xs font-bold uppercase select-none" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
            {initials}
          </span>
        </div>

        {/* Name */}
        <span className="max-w-[150px] truncate">{displayName}</span>

        {/* Chevron */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <div
          className="absolute right-0 mt-1 min-w-[180px] py-1 rounded-md z-50"
          style={{
            background: 'var(--kl-menu-bg)',
            backdropFilter: 'var(--kl-glass-blur)',
            WebkitBackdropFilter: 'var(--kl-glass-blur)',
            border: '1px solid var(--kl-border)',
            boxShadow: 'var(--kl-menu-shadow)',
            borderRadius: 'var(--kl-radius)',
          }}
        >
          {topItems.map((item, i) => (
            <React.Fragment key={`top-${i}`}>
              <button
                onClick={() => { setMenuOpen(false); item.onClick(); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ color: 'var(--kl-text)' }}
              >
                <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>
                {item.label}
              </button>
              {item.dividerAfter && <hr className="my-1 border-t" style={{ borderColor: 'var(--kl-border)' }} />}
            </React.Fragment>
          ))}

          {bottomItems.map((item, i) => (
            <React.Fragment key={`bottom-${i}`}>
              <button
                onClick={() => { setMenuOpen(false); item.onClick(); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{ color: 'var(--kl-text)' }}
              >
                <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>
                {item.label}
              </button>
              {item.dividerAfter && <hr className="my-1 border-t" style={{ borderColor: 'var(--kl-border)' }} />}
            </React.Fragment>
          ))}

          {(topItems.length > 0 || bottomItems.length > 0) && (
            <hr className="my-1 border-t" style={{ borderColor: 'var(--kl-border)' }} />
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: 'var(--kl-error)' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};
