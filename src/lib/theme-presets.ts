import type { ThemeTokens } from '@/types/theme';

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  tokens: ThemeTokens;
  /** Hex colors for visual preview and color picker */
  colors: {
    primary: string;
    accent: string;
    background: string;
    destructive: string;
  };
}

/**
 * 5 curated theme presets for platform theming
 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    description: 'Deep navy with electric blue accents',
    colors: {
      primary: '#4a90d9',
      accent: '#9b6dff',
      background: '#0d1117',
      destructive: '#ef4444',
    },
    tokens: {
      primary: '218 95% 58%',
      primary_foreground: '215 28% 6%',
      secondary: '215 25% 16%',
      secondary_foreground: '210 20% 98%',
      accent: '259 94% 56%',
      accent_foreground: '210 20% 98%',
      background: '215 28% 6%',
      foreground: '210 20% 98%',
      card: '215 25% 10%',
      card_foreground: '210 20% 98%',
      muted: '215 25% 16%',
      muted_foreground: '215 15% 72%',
      border: '215 25% 18%',
      ring: '218 95% 58%',
      success: '142 76% 42%',
      success_foreground: '0 0% 100%',
      warning: '38 92% 55%',
      warning_foreground: '0 0% 8%',
      destructive: '0 84% 65%',
      destructive_foreground: '0 0% 92%',
    },
  },
  {
    id: 'oceanic-teal',
    name: 'Oceanic Teal',
    description: 'Calm teal and cyan ocean tones',
    colors: {
      primary: '#14b8a6',
      accent: '#06b6d4',
      background: '#0a1015',
      destructive: '#f43f5e',
    },
    tokens: {
      primary: '173 80% 40%',
      primary_foreground: '180 20% 6%',
      secondary: '180 20% 14%',
      secondary_foreground: '180 15% 95%',
      accent: '188 94% 43%',
      accent_foreground: '180 20% 6%',
      background: '200 25% 5%',
      foreground: '180 15% 95%',
      card: '195 22% 9%',
      card_foreground: '180 15% 95%',
      muted: '195 20% 15%',
      muted_foreground: '180 12% 65%',
      border: '195 20% 18%',
      ring: '173 80% 40%',
      success: '158 64% 52%',
      success_foreground: '0 0% 100%',
      warning: '45 93% 47%',
      warning_foreground: '0 0% 8%',
      destructive: '350 89% 60%',
      destructive_foreground: '0 0% 98%',
    },
  },
  {
    id: 'lavender-bloom',
    name: 'Lavender Bloom',
    description: 'Soft purple with pink highlights',
    colors: {
      primary: '#a78bfa',
      accent: '#f472b6',
      background: '#0f0a15',
      destructive: '#fb7185',
    },
    tokens: {
      primary: '258 90% 76%',
      primary_foreground: '270 25% 8%',
      secondary: '270 20% 15%',
      secondary_foreground: '270 15% 95%',
      accent: '330 86% 70%',
      accent_foreground: '330 25% 8%',
      background: '270 30% 6%',
      foreground: '270 15% 95%',
      card: '268 22% 10%',
      card_foreground: '270 15% 95%',
      muted: '268 20% 16%',
      muted_foreground: '270 12% 68%',
      border: '268 20% 20%',
      ring: '258 90% 76%',
      success: '160 84% 39%',
      success_foreground: '0 0% 100%',
      warning: '43 96% 56%',
      warning_foreground: '0 0% 8%',
      destructive: '350 96% 74%',
      destructive_foreground: '0 0% 8%',
    },
  },
  {
    id: 'ember-glow',
    name: 'Ember Glow',
    description: 'Warm orange and amber fire tones',
    colors: {
      primary: '#f97316',
      accent: '#fbbf24',
      background: '#111010',
      destructive: '#dc2626',
    },
    tokens: {
      primary: '25 95% 53%',
      primary_foreground: '20 20% 6%',
      secondary: '20 15% 14%',
      secondary_foreground: '30 20% 95%',
      accent: '45 96% 56%',
      accent_foreground: '30 20% 8%',
      background: '0 5% 6%',
      foreground: '30 20% 95%',
      card: '10 10% 10%',
      card_foreground: '30 20% 95%',
      muted: '15 12% 16%',
      muted_foreground: '20 10% 65%',
      border: '15 12% 20%',
      ring: '25 95% 53%',
      success: '142 71% 45%',
      success_foreground: '0 0% 100%',
      warning: '48 96% 53%',
      warning_foreground: '0 0% 8%',
      destructive: '0 72% 51%',
      destructive_foreground: '0 0% 98%',
    },
  },
  {
    id: 'sage-forest',
    name: 'Sage Forest',
    description: 'Natural green and earth tones',
    colors: {
      primary: '#22c55e',
      accent: '#84cc16',
      background: '#0a0f0d',
      destructive: '#ef4444',
    },
    tokens: {
      primary: '142 71% 45%',
      primary_foreground: '140 25% 6%',
      secondary: '140 15% 14%',
      secondary_foreground: '140 15% 95%',
      accent: '84 81% 44%',
      accent_foreground: '90 25% 8%',
      background: '150 20% 5%',
      foreground: '140 15% 95%',
      card: '145 18% 9%',
      card_foreground: '140 15% 95%',
      muted: '145 15% 15%',
      muted_foreground: '140 10% 65%',
      border: '145 15% 18%',
      ring: '142 71% 45%',
      success: '158 64% 52%',
      success_foreground: '0 0% 100%',
      warning: '43 96% 56%',
      warning_foreground: '0 0% 8%',
      destructive: '0 84% 60%',
      destructive_foreground: '0 0% 98%',
    },
  },
];

/**
 * Find preset by ID
 */
export function getPresetById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}

/**
 * Check if tokens match a preset exactly
 */
export function findMatchingPreset(tokens: ThemeTokens): ThemePreset | null {
  return (
    THEME_PRESETS.find(
      (preset) =>
        preset.tokens.primary === tokens.primary &&
        preset.tokens.accent === tokens.accent &&
        preset.tokens.background === tokens.background
    ) ?? null
  );
}

/**
 * Default preset ID
 */
export const DEFAULT_PRESET_ID = 'midnight-blue';
