/**
 * Platform detection for Tauri, Electron, and Web environments
 */

import type { Platform } from './types.js';

/** Check if running inside a Tauri desktop app */
export function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    '__TAURI__' in window &&
    !!(window as Record<string, unknown>).__TAURI__;
}

/** Check if running inside an Electron app */
export function isElectron(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('electron');
}

/** Check if running in a standard web browser */
export function isWeb(): boolean {
  return typeof window !== 'undefined' && !isTauri() && !isElectron();
}

/** Detect the current platform */
export function detectPlatform(): Platform {
  if (isTauri()) return 'tauri';
  if (isElectron()) return 'electron';
  return 'web';
}
