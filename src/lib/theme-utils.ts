import type { ThemeOverrides, ThemeTokens } from '@/types/theme';
import type { ThemePreset } from '@/lib/theme-presets';

/**
 * Convert hex color to HSL string (e.g., "#4a90d9" → "218 95% 58%")
 */
export function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex values
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Convert HSL string to hex (e.g., "218 95% 58%" → "#4a90d9")
 */
export function hslToHex(hsl: string): string {
  const parts = hsl.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return '#000000';

  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Invert the lightness of a hex color for light/dark mode switching
 * Returns a neutral grey for light mode (no color tint)
 */
function invertBackgroundLightness(hexColor: string): string {
  const hsl = hexToHsl(hexColor);
  const parts = hsl.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return hexColor;
  
  const l = parseFloat(parts[2]);
  
  // For light mode: return neutral grey (no hue, no saturation)
  // The grey level is based on the original darkness - darker themes get slightly darker grey
  const greyLevel = l < 50 ? 94 - (l * 0.2) : 100 - l;
  
  return hslToHex(`0 0% ${greyLevel}%`);
}

/**
 * Derive theme tokens for a specific color mode (light or dark)
 * For dark mode, returns the preset's original tokens
 * For light mode, derives new tokens with inverted background
 */
export function deriveTokensForMode(
  preset: ThemePreset | { colors: { primary: string; accent: string; background: string; destructive: string } },
  mode: 'light' | 'dark'
): ThemeTokens {
  // For dark mode with a full preset, use the preset's pre-computed tokens
  if (mode === 'dark' && 'tokens' in preset) {
    return preset.tokens;
  }
  
  // For light mode or partial preset, derive tokens from colors
  const colors = preset.colors;
  const adjustedColors = mode === 'light' 
    ? {
        ...colors,
        background: invertBackgroundLightness(colors.background),
      }
    : colors;
  
  return deriveTokensFromColors(adjustedColors);
}

/**
 * Derive full theme tokens from 4 major colors (hex)
 * Auto-generates foreground colors and derived tokens
 */
export function deriveTokensFromColors(colors: {
  primary: string;
  accent: string;
  background: string;
  destructive: string;
}): ThemeTokens {
  const primary = hexToHsl(colors.primary);
  const accent = hexToHsl(colors.accent);
  const background = hexToHsl(colors.background);
  const destructive = hexToHsl(colors.destructive);

  // Parse background lightness to determine if dark theme
  const bgParts = background.match(/[\d.]+/g);
  const bgLightness = bgParts ? parseFloat(bgParts[2]) : 10;
  const isDark = bgLightness < 50;

  // For light mode, use neutral colors (no hue tint) for surfaces
  // For dark mode, use the theme's hue for warmth
  const bgHue = bgParts ? parseFloat(bgParts[0]) : 0;
  const bgSat = bgParts ? parseFloat(bgParts[1]) : 0;
  
  // In light mode: neutral grey surfaces; in dark mode: themed surfaces
  const surfaceHue = isDark ? bgHue : 0;
  const surfaceSat = isDark ? bgSat : 0;

  // Generate complementary colors
  const foreground = isDark ? '0 0% 95%' : '0 0% 10%'; // Darker text in light mode
  const cardLightness = isDark ? bgLightness + 4 : 100; // Pure white cards in light mode
  const mutedLightness = isDark ? bgLightness + 10 : 97; // Very light grey for headers in light mode
  const borderLightness = isDark ? bgLightness + 12 : 85; // Visible border in light mode

  // Parse primary color for deriving success/warning
  const primaryParts = primary.match(/[\d.]+/g);
  const primaryHue = primaryParts ? parseFloat(primaryParts[0]) : 0;
  const primarySat = primaryParts ? parseFloat(primaryParts[1]) : 70;
  const primaryLightness = primaryParts ? parseFloat(primaryParts[2]) : 50;

  // Derive success color that harmonizes with the theme
  // For warm themes (hue 20-60), use the primary/accent color
  // For other themes, use a complementary green that matches the saturation
  const isWarmTheme = primaryHue >= 20 && primaryHue <= 60;
  const success = isWarmTheme
    ? `${primaryHue} ${Math.min(80, primarySat)}% ${Math.min(55, primaryLightness + 5)}%`
    : `142 ${Math.min(80, primarySat)}% ${Math.min(52, primaryLightness)}%`;
  const successForeground = isDark ? '0 0% 100%' : '0 0% 8%';

  // Derive warning color that harmonizes with the theme
  // For warm themes, use a slightly shifted hue; for others, use standard amber
  const warning = isWarmTheme
    ? `${primaryHue} ${Math.min(85, primarySat)}% ${Math.min(55, primaryLightness + 5)}%`
    : `38 ${Math.min(92, primarySat + 10)}% 55%`;
  const warningForeground = '0 0% 8%';

  // Derive warning-muted - adjust based on light/dark mode
  const warningParts = warning.match(/[\d.]+/g);
  const warningHue = warningParts ? parseFloat(warningParts[0]) : 38;
  const warningSat = warningParts ? parseFloat(warningParts[1]) : 92;
  const warningLightness = warningParts ? parseFloat(warningParts[2]) : 55;
  const warningMutedSat = isDark 
    ? Math.round(warningSat * 0.6)
    : Math.round(warningSat * 0.95); // Keep nearly full saturation in light mode
  const warningMutedLightness = isDark 
    ? Math.max(40, warningLightness - 5)
    : Math.max(40, Math.min(55, warningLightness)); // Keep vibrant in light mode
  const warningMuted = `${warningHue} ${warningMutedSat}% ${warningMutedLightness}%`;

  // Derive primary-muted - adjust based on light/dark mode
  // In dark mode: reduce saturation for softer appearance
  // In light mode: keep full saturation, use primary directly for vibrant badges
  const primaryMutedSat = isDark 
    ? Math.round(primarySat * 0.6)
    : Math.round(primarySat * 0.95); // Keep nearly full saturation in light mode
  const primaryMutedLightness = isDark 
    ? Math.max(35, primaryLightness - 5)
    : Math.max(35, Math.min(50, primaryLightness)); // Keep similar lightness in light mode
  const primaryMuted = `${primaryHue} ${primaryMutedSat}% ${primaryMutedLightness}%`;

  // Derive destructive-muted - adjust based on light/dark mode
  const destructiveParts = destructive.match(/[\d.]+/g);
  const destructiveHue = destructiveParts ? parseFloat(destructiveParts[0]) : 0;
  const destructiveSat = destructiveParts ? parseFloat(destructiveParts[1]) : 84;
  const destructiveLightness = destructiveParts ? parseFloat(destructiveParts[2]) : 60;
  const destructiveMutedSat = isDark 
    ? Math.round(destructiveSat * 0.65)
    : Math.round(destructiveSat * 0.9); // Keep high saturation in light mode
  const destructiveMutedLightness = isDark 
    ? Math.max(40, destructiveLightness - 10)
    : Math.max(40, Math.min(55, destructiveLightness - 5)); // Keep vibrant in light mode
  const destructiveMuted = `${destructiveHue} ${destructiveMutedSat}% ${destructiveMutedLightness}%`;

  return {
    primary,
    primary_foreground: isDark ? `${bgHue} 25% 6%` : '0 0% 100%',
    primary_muted: primaryMuted,
    primary_muted_foreground: isDark ? '0 0% 100%' : '0 0% 100%',
    secondary: `${surfaceHue} ${surfaceSat}% ${mutedLightness}%`,
    secondary_foreground: foreground,
    accent,
    accent_foreground: isDark ? `${bgHue} 25% 6%` : '0 0% 100%',
    background,
    foreground,
    card: isDark ? `${bgHue} ${Math.max(15, bgSat - 3)}% ${cardLightness}%` : '0 0% 100%',
    card_foreground: isDark ? foreground : '0 0% 10%',
    muted: isDark ? `${surfaceHue} ${surfaceSat}% ${mutedLightness}%` : '0 0% 97%',
    muted_foreground: isDark ? `${bgHue} 12% 68%` : '0 0% 40%',
    border: isDark ? `${bgHue} ${Math.max(10, bgSat - 5)}% ${borderLightness}%` : '0 0% 85%',
    ring: primary,
    success,
    success_foreground: successForeground,
    warning,
    warning_foreground: warningForeground,
    warning_muted: warningMuted,
    warning_muted_foreground: isDark ? '0 0% 100%' : '0 0% 8%',
    destructive,
    destructive_foreground: '0 0% 98%',
    destructive_muted: destructiveMuted,
    destructive_muted_foreground: isDark ? '0 0% 100%' : '0 0% 8%',
  };
}

export function mergeThemeTokens(base: ThemeTokens, overrides?: ThemeOverrides): ThemeTokens {
  return {
    ...base,
    ...(overrides ?? {}),
  };
}

export function applyThemeTokens(tokens: ThemeTokens) {
  const root = document.documentElement;

  // Detect if this is a light or dark theme based on background lightness
  const bgParts = tokens.background.match(/[\d.]+/g);
  const bgLightness = bgParts ? parseFloat(bgParts[2]) : 10;
  const isDark = bgLightness < 50;
  const bgHue = bgParts ? parseFloat(bgParts[0]) : 0;
  const bgSat = bgParts ? parseFloat(bgParts[1]) : 0;

  // Core color tokens
  root.style.setProperty('--primary', tokens.primary);
  root.style.setProperty('--primary-foreground', tokens.primary_foreground);
  root.style.setProperty('--primary-hover', adjustLightness(tokens.primary, isDark ? 5 : -5));
  // In light mode, use full primary for buttons/badges; in dark mode use muted
  root.style.setProperty('--primary-muted', isDark ? tokens.primary_muted : tokens.primary);
  root.style.setProperty('--primary-muted-foreground', isDark ? tokens.primary_muted_foreground : tokens.primary_foreground);
  root.style.setProperty('--secondary', tokens.secondary);
  root.style.setProperty('--secondary-foreground', tokens.secondary_foreground);
  root.style.setProperty('--accent', tokens.accent);
  root.style.setProperty('--accent-foreground', tokens.accent_foreground);
  root.style.setProperty('--background', tokens.background);
  root.style.setProperty('--foreground', tokens.foreground);
  root.style.setProperty('--card', tokens.card);
  root.style.setProperty('--card-foreground', tokens.card_foreground);
  root.style.setProperty('--muted', tokens.muted);
  root.style.setProperty('--muted-foreground', tokens.muted_foreground);
  root.style.setProperty('--border', isDark ? tokens.border : '0 0% 78%');
  root.style.setProperty('--input', isDark ? tokens.border : '0 0% 78%');
  root.style.setProperty('--ring', tokens.ring);
  
  // Popover - white background with dark text in light mode
  root.style.setProperty('--popover', isDark ? tokens.card : '0 0% 100%');
  root.style.setProperty('--popover-foreground', isDark ? tokens.card_foreground : '0 0% 10%');

  // Status colors
  root.style.setProperty('--success', tokens.success);
  root.style.setProperty('--success-foreground', tokens.success_foreground);
  root.style.setProperty('--warning', tokens.warning);
  root.style.setProperty('--warning-foreground', tokens.warning_foreground);
  // In light mode, use full warning for badges; in dark mode use muted
  root.style.setProperty('--warning-muted', isDark ? tokens.warning_muted : tokens.warning);
  root.style.setProperty('--warning-muted-foreground', isDark ? tokens.warning_muted_foreground : tokens.warning_foreground);
  root.style.setProperty('--destructive', tokens.destructive);
  root.style.setProperty('--destructive-foreground', tokens.destructive_foreground);
  // In light mode, use full destructive for suspended badges; in dark mode use muted
  root.style.setProperty('--destructive-muted', isDark ? tokens.destructive_muted : tokens.destructive);
  root.style.setProperty('--destructive-muted-foreground', isDark ? tokens.destructive_muted_foreground : tokens.destructive_foreground);

  // Gradients
  root.style.setProperty(
    '--gradient-primary',
    `linear-gradient(135deg, hsl(${tokens.primary}), hsl(${tokens.accent}))`
  );
  root.style.setProperty(
    '--gradient-hero',
    `linear-gradient(135deg, hsl(${tokens.primary} / 0.08), hsl(${tokens.accent} / 0.08))`
  );
  // In light mode, no gradient on cards - just solid colors
  root.style.setProperty(
    '--gradient-card',
    isDark 
      ? `linear-gradient(135deg, hsl(${tokens.card}), hsl(${tokens.background}))`
      : `hsl(${tokens.card})`
  );
  root.style.setProperty(
    '--gradient-card-subtle',
    isDark
      ? `linear-gradient(135deg, hsl(${tokens.background}), hsl(${tokens.card}))`
      : `hsl(${tokens.background})`
  );
  root.style.setProperty(
    '--gradient-destructive',
    `linear-gradient(135deg, hsl(${tokens.destructive}), hsl(${tokens.destructive}))`
  );

  // Glass effects - more subtle in light mode
  root.style.setProperty('--glass-subtle', isDark ? `hsl(${tokens.card} / 0.8)` : `hsl(0 0% 100% / 0.9)`);
  root.style.setProperty('--glass-intense', isDark ? `hsl(${tokens.muted} / 0.9)` : `hsl(0 0% 100% / 0.95)`);
  root.style.setProperty('--glass-dark', isDark ? `hsl(${tokens.background} / 0.95)` : `hsl(0 0% 98%)`);

  // Shadows - very subtle in light mode
  root.style.setProperty('--shadow-glow-subtle', isDark 
    ? `0 0 6px hsl(${tokens.primary} / 0.03)`
    : `0 1px 2px hsl(0 0% 0% / 0.04)`);
  root.style.setProperty('--shadow-glow', isDark 
    ? `0 0 10px hsl(${tokens.primary} / 0.05)`
    : `0 1px 3px hsl(0 0% 0% / 0.05)`);
  root.style.setProperty('--shadow-glow-intense', isDark 
    ? `0 0 15px hsl(${tokens.primary} / 0.08)`
    : `0 2px 6px hsl(0 0% 0% / 0.06)`);

  // Sidebar colors - neutral grey in light mode, themed in dark mode
  const sidebarBg = isDark 
    ? `${bgHue} ${Math.max(5, bgSat)}% ${Math.max(4, bgLightness - 4)}%`
    : '0 0% 98%'; // Neutral light grey
  const sidebarFg = isDark ? '0 0% 92%' : '0 0% 20%';
  const sidebarBorder = isDark 
    ? `${bgHue} ${Math.max(5, bgSat)}% 20%`
    : '0 0% 90%'; // Neutral border
  
  root.style.setProperty('--sidebar', sidebarBg);
  root.style.setProperty('--sidebar-foreground', sidebarFg);
  root.style.setProperty('--sidebar-border', sidebarBorder);
  // In light mode, use full primary for vibrant sidebar accent; in dark mode use muted
  root.style.setProperty('--sidebar-accent', isDark ? tokens.primary_muted : tokens.primary);
  root.style.setProperty('--sidebar-accent-foreground', isDark ? tokens.primary_muted_foreground : tokens.primary_foreground);
  root.style.setProperty('--sidebar-ring', tokens.ring);

  // Segmented control variables - inverted pattern for light mode
  // Light mode: darker grey track (since it's on a surface), white active pill
  // Dark mode: dark glass track, colored active state
  root.style.setProperty('--segmented-track', isDark ? `hsl(${tokens.muted})` : 'hsl(0 0% 88%)');
  root.style.setProperty('--segmented-active', isDark ? `hsl(${tokens.primary_muted})` : 'hsl(0 0% 100%)');
  root.style.setProperty('--segmented-active-foreground', isDark ? `hsl(${tokens.primary_muted_foreground})` : 'hsl(0 0% 15%)');
  root.style.setProperty('--segmented-inactive-foreground', isDark ? `hsl(${tokens.muted_foreground})` : 'hsl(0 0% 45%)');
  root.style.setProperty('--segmented-active-shadow', isDark 
    ? `0 0 8px hsl(${tokens.primary} / 0.15)`
    : '0 1px 2px hsl(0 0% 0% / 0.06)');

  // Popover/dropdown - no shadow at all in light mode
  root.style.setProperty('--shadow-popover', isDark 
    ? `0 4px 12px hsl(0 0% 0% / 0.4), 0 0 0 1px hsl(${tokens.border})`
    : 'none');

  // Card shadow - very subtle in light mode
  root.style.setProperty('--shadow-soft', isDark
    ? `0 4px 6px -1px hsl(0 0% 5% / 0.3)`
    : '0 1px 3px hsl(0 0% 0% / 0.04), 0 1px 2px hsl(0 0% 0% / 0.03)');
  root.style.setProperty('--shadow-medium', isDark
    ? `0 10px 25px -3px hsl(0 0% 5% / 0.4)`
    : '0 2px 6px hsl(0 0% 0% / 0.05), 0 1px 3px hsl(0 0% 0% / 0.03)');

  // Icon color for cards - darker in light mode for visibility
  root.style.setProperty('--icon-muted', isDark ? `hsl(${tokens.muted_foreground})` : 'hsl(0 0% 50%)');
}

function adjustLightness(hsl: string, amount: number): string {
  const parts = hsl.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return hsl;

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = Math.min(100, Math.max(0, parseFloat(parts[2]) + amount));

  return `${h} ${s}% ${l}%`;
}
