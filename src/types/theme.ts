export type ThemeTokens = {
  primary: string;
  primary_foreground: string;
  secondary: string;
  secondary_foreground: string;
  accent: string;
  accent_foreground: string;
  background: string;
  foreground: string;
  card: string;
  card_foreground: string;
  muted: string;
  muted_foreground: string;
  border: string;
  ring: string;
  success: string;
  success_foreground: string;
  warning: string;
  warning_foreground: string;
  destructive: string;
  destructive_foreground: string;
};

export type ThemeTokenKey = keyof ThemeTokens;

export type ThemeOverrides = Partial<ThemeTokens>;

export type ThemeSource = 'platform' | 'company';
