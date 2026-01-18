import type { ThemeTokenKey, ThemeTokens } from '@/types/theme';

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
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
};

export const THEME_TOKEN_KEYS: ThemeTokenKey[] = [
  'primary',
  'primary_foreground',
  'secondary',
  'secondary_foreground',
  'accent',
  'accent_foreground',
  'background',
  'foreground',
  'card',
  'card_foreground',
  'muted',
  'muted_foreground',
  'border',
  'ring',
  'success',
  'success_foreground',
  'warning',
  'warning_foreground',
  'destructive',
  'destructive_foreground',
];

export const THEME_TOKEN_CONFIG: Array<{
  key: ThemeTokenKey;
  label: string;
  description: string;
}> = [
  { key: 'primary', label: 'Primary', description: 'Primary brand color' },
  { key: 'primary_foreground', label: 'Primary Foreground', description: 'Text on primary backgrounds' },
  { key: 'secondary', label: 'Secondary', description: 'Secondary surfaces and buttons' },
  { key: 'secondary_foreground', label: 'Secondary Foreground', description: 'Text on secondary surfaces' },
  { key: 'accent', label: 'Accent', description: 'Accent highlights and emphasis' },
  { key: 'accent_foreground', label: 'Accent Foreground', description: 'Text on accent surfaces' },
  { key: 'background', label: 'Background', description: 'App background' },
  { key: 'foreground', label: 'Foreground', description: 'Primary text color' },
  { key: 'card', label: 'Card', description: 'Card backgrounds' },
  { key: 'card_foreground', label: 'Card Foreground', description: 'Text on cards' },
  { key: 'muted', label: 'Muted', description: 'Subtle surfaces and dividers' },
  { key: 'muted_foreground', label: 'Muted Foreground', description: 'Secondary text' },
  { key: 'border', label: 'Border', description: 'Borders and outlines' },
  { key: 'ring', label: 'Ring', description: 'Focus ring color' },
  { key: 'success', label: 'Success', description: 'Success states' },
  { key: 'success_foreground', label: 'Success Foreground', description: 'Text on success' },
  { key: 'warning', label: 'Warning', description: 'Warning states' },
  { key: 'warning_foreground', label: 'Warning Foreground', description: 'Text on warnings' },
  { key: 'destructive', label: 'Destructive', description: 'Errors and destructive actions' },
  { key: 'destructive_foreground', label: 'Destructive Foreground', description: 'Text on destructive' },
];
