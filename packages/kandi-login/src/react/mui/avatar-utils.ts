/**
 * Avatar utility functions — initials extraction and color generation
 */

/** Extract initials from a name or email */
export function getInitials(name: string | undefined | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Generate a CSS linear-gradient based on a seed string (typically email) */
export function generateAvatarColor(seed: string | undefined | null): string {
  if (!seed) return DEFAULT_AVATAR_GRADIENT;

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  const hue2 = (hue + 30) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 70%, 50%) 0%, hsl(${hue2}, 70%, 50%) 100%)`;
}

/** Generate a solid HSL color from a seed string */
export function generateAvatarColorSolid(seed: string | undefined | null): string {
  if (!seed) return 'hsl(250, 70%, 50%)';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 50%)`;
}

export const DEFAULT_AVATAR_GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
export const LOADING_AVATAR_GRADIENT = 'linear-gradient(135deg, #999 0%, #666 100%)';
