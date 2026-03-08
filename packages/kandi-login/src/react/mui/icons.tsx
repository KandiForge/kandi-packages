/**
 * SVG icons for kandi-login components
 * All icons are pure SVG — no external assets needed.
 */

import React from 'react';
import { SvgIcon, type SvgIconProps } from '@mui/material';

/** Login icon — arrow entering door */
export const LoginIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

/** Logout icon — door with arrow exiting */
export const LogoutIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

/** Chevron down icon */
export const ChevronDownIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      d="M6 9l6 6 6-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

/** Apple logo */
export const AppleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="currentColor">
    <path d="M14.94 13.067c-.326.753-.482 1.09-.901 1.753-.585.924-1.41 2.076-2.432 2.087-1.022.012-1.284-.665-2.669-.656-1.385.008-1.673.67-2.695.658-1.022-.012-1.802-1.044-2.387-1.968C2.24 12.5 2.078 9.913 3.004 8.54c.66-0.98 1.707-1.555 2.688-1.555.999 0 1.627.668 2.453.668.801 0 1.29-.67 2.446-.67.875 0 1.8.476 2.458 1.299-2.16 1.184-1.81 4.27.391 5.286zM10.77 5.225c.462-.594.813-1.432.685-2.285-.753.05-1.634.532-2.148 1.157-.467.567-.85 1.416-.7 2.24.82.027 1.668-.464 2.163-1.112z" />
  </svg>
);

/** Google logo (colored) */
export const GoogleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" />
  </svg>
);

/** Facebook logo */
export const FacebookIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="#1877F2">
    <path d="M18 9a9 9 0 1 0-10.406 8.89v-6.29H5.309V9h2.285V7.017c0-2.255 1.343-3.501 3.4-3.501.984 0 2.014.176 2.014.176v2.215h-1.134c-1.118 0-1.467.694-1.467 1.406V9h2.496l-.399 2.6h-2.097v6.29A9.002 9.002 0 0 0 18 9z" />
  </svg>
);

/** Hello.coop logo (wave hand) */
export const HelloCoopIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.5 12.5c0-2.5-2-4.5-4.5-4.5S9.5 10 9.5 12.5" />
    <path d="M7 3.34V5a3 3 0 0 0 3 3" />
    <path d="M14 5a3 3 0 0 0 3-3" />
    <path d="M4.26 15.5A9 9 0 1 0 12 3a9 9 0 0 0-7.74 12.5" />
    <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
  </svg>
);
