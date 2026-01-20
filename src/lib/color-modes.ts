/**
 * Color Mode System
 * 
 * Provides "Expressive" and "Neutral" color modes.
 * - Expressive: Vivid, saturated colors (default)
 * - Neutral: Desaturated, professional tones
 */

import type { ThemeTokens } from '@/types/theme';

export type ColorMode = 'expressive' | 'neutral';

export const COLOR_MODE_KEY = 'driverly-color-mode';

export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  expressive: 'Expressive',
  neutral: 'Neutral',
};

export const COLOR_MODE_DESCRIPTIONS: Record<ColorMode, string> = {
  expressive: 'Vibrant colors with bold accents',
  neutral: 'Muted, professional tones',
};

/**
 * Desaturate an HSL color string
 * e.g., "218 95% 58%" → "218 20% 55%"
 */
function desaturateHsl(hsl: string, saturationFactor: number = 0.2): string {
  const parts = hsl.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return hsl;

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = parseFloat(parts[2]);

  // Reduce saturation but keep some color hint
  const newSaturation = Math.round(s * saturationFactor);
  
  return `${h} ${newSaturation}% ${l}%`;
}

/**
 * Shift colors toward neutral gray while maintaining structure
 */
function neutralizeHsl(hsl: string): string {
  const parts = hsl.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return hsl;

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = parseFloat(parts[2]);

  // For very low saturation colors (already gray), keep them
  if (s < 10) return hsl;

  // Reduce saturation significantly, shift hue toward cool gray (220)
  const neutralHue = 220;
  const hueBlend = 0.7; // 70% toward neutral hue
  const newHue = Math.round(h + (neutralHue - h) * hueBlend);
  const newSaturation = Math.max(5, Math.round(s * 0.15));

  return `${newHue} ${newSaturation}% ${l}%`;
}

/**
 * Transform expressive tokens to neutral tokens
 */
export function createNeutralTokens(tokens: ThemeTokens): ThemeTokens {
  return {
    // Primary becomes a muted steel gray-blue
    primary: desaturateHsl(tokens.primary, 0.18),
    primary_foreground: tokens.primary_foreground,
    
    // Secondary stays mostly gray
    secondary: neutralizeHsl(tokens.secondary),
    secondary_foreground: tokens.secondary_foreground,
    
    // Accent becomes very subtle
    accent: desaturateHsl(tokens.accent, 0.12),
    accent_foreground: tokens.accent_foreground,
    
    // Backgrounds stay the same (already fairly neutral)
    background: tokens.background,
    foreground: tokens.foreground,
    card: tokens.card,
    card_foreground: tokens.card_foreground,
    
    // Muted colors neutralize
    muted: neutralizeHsl(tokens.muted),
    muted_foreground: tokens.muted_foreground,
    
    // Border stays neutral
    border: neutralizeHsl(tokens.border),
    ring: desaturateHsl(tokens.ring, 0.18),
    
    // Status colors stay expressive (important for UX clarity)
    success: tokens.success,
    success_foreground: tokens.success_foreground,
    warning: tokens.warning,
    warning_foreground: tokens.warning_foreground,
    destructive: tokens.destructive,
    destructive_foreground: tokens.destructive_foreground,
  };
}

/**
 * Preview colors for the theme selector UI
 */
export const COLOR_MODE_PREVIEW: Record<ColorMode, {
  primary: string;
  accent: string;
  background: string;
}> = {
  expressive: {
    primary: '#4a90d9',    // Vivid blue
    accent: '#8b5cf6',     // Purple
    background: '#0d1117', // Dark
  },
  neutral: {
    primary: '#6b7280',    // Gray-500
    accent: '#9ca3af',     // Gray-400
    background: '#0d1117', // Dark
  },
};
