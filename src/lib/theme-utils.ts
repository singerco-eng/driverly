import type { ThemeOverrides, ThemeTokens } from '@/types/theme';

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

  // Generate complementary colors
  const foreground = isDark ? '0 0% 95%' : '0 0% 8%';
  const cardLightness = isDark ? bgLightness + 4 : bgLightness - 4;
  const mutedLightness = isDark ? bgLightness + 10 : bgLightness - 10;
  const borderLightness = isDark ? bgLightness + 12 : bgLightness - 12;

  const bgHue = bgParts ? parseFloat(bgParts[0]) : 0;
  const bgSat = bgParts ? parseFloat(bgParts[1]) : 0;

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

  return {
    primary,
    primary_foreground: isDark ? `${bgHue} 25% 6%` : '0 0% 100%',
    secondary: `${bgHue} ${Math.max(10, bgSat - 5)}% ${mutedLightness}%`,
    secondary_foreground: foreground,
    accent,
    accent_foreground: isDark ? `${bgHue} 25% 6%` : '0 0% 100%',
    background,
    foreground,
    card: `${bgHue} ${Math.max(15, bgSat - 3)}% ${cardLightness}%`,
    card_foreground: foreground,
    muted: `${bgHue} ${Math.max(10, bgSat - 5)}% ${mutedLightness}%`,
    muted_foreground: isDark ? `${bgHue} 12% 68%` : `${bgHue} 12% 40%`,
    border: `${bgHue} ${Math.max(10, bgSat - 5)}% ${borderLightness}%`,
    ring: primary,
    success,
    success_foreground: successForeground,
    warning,
    warning_foreground: warningForeground,
    destructive,
    destructive_foreground: '0 0% 98%',
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

  root.style.setProperty('--primary', tokens.primary);
  root.style.setProperty('--primary-foreground', tokens.primary_foreground);
  root.style.setProperty('--primary-hover', adjustLightness(tokens.primary, 5));
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
  root.style.setProperty('--border', tokens.border);
  root.style.setProperty('--input', tokens.border);
  root.style.setProperty('--ring', tokens.ring);
  root.style.setProperty('--success', tokens.success);
  root.style.setProperty('--success-foreground', tokens.success_foreground);
  root.style.setProperty('--warning', tokens.warning);
  root.style.setProperty('--warning-foreground', tokens.warning_foreground);
  root.style.setProperty('--destructive', tokens.destructive);
  root.style.setProperty('--destructive-foreground', tokens.destructive_foreground);

  root.style.setProperty(
    '--gradient-primary',
    `linear-gradient(135deg, hsl(${tokens.primary}), hsl(${tokens.accent}))`
  );
  root.style.setProperty(
    '--gradient-hero',
    `linear-gradient(135deg, hsl(${tokens.primary} / 0.08), hsl(${tokens.accent} / 0.08))`
  );
  root.style.setProperty(
    '--gradient-card',
    `linear-gradient(135deg, hsl(${tokens.card}), hsl(${tokens.background}))`
  );
  root.style.setProperty(
    '--gradient-card-subtle',
    `linear-gradient(135deg, hsl(${tokens.background}), hsl(${tokens.card}))`
  );
  root.style.setProperty(
    '--gradient-destructive',
    `linear-gradient(135deg, hsl(${tokens.destructive}), hsl(${tokens.destructive}))`
  );

  root.style.setProperty('--glass-subtle', `hsl(${tokens.card} / 0.8)`);
  root.style.setProperty('--glass-intense', `hsl(${tokens.muted} / 0.9)`);
  root.style.setProperty('--glass-dark', `hsl(${tokens.background} / 0.95)`);

  root.style.setProperty('--shadow-glow-subtle', `0 0 6px hsl(${tokens.primary} / 0.03)`);
  root.style.setProperty('--shadow-glow', `0 0 10px hsl(${tokens.primary} / 0.05)`);
  root.style.setProperty('--shadow-glow-intense', `0 0 15px hsl(${tokens.primary} / 0.08)`);

  // Sidebar colors - use primary for active state
  root.style.setProperty('--sidebar-accent', tokens.primary);
  root.style.setProperty('--sidebar-accent-foreground', tokens.primaryForeground);
}

function adjustLightness(hsl: string, amount: number): string {
  const parts = hsl.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return hsl;

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = Math.min(100, Math.max(0, parseFloat(parts[2]) + amount));

  return `${h} ${s}% ${l}%`;
}
