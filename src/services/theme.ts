import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_THEME_TOKENS, THEME_TOKEN_KEYS } from '@/lib/theme-tokens';
import type { ThemeOverrides, ThemeTokenKey, ThemeTokens } from '@/types/theme';

type PlatformThemeRow = ThemeTokens & {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type CompanyThemeRow = ThemeOverrides & {
  id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
};

function pickThemeTokens(row: Record<string, unknown> | null): ThemeTokens {
  const tokens = { ...DEFAULT_THEME_TOKENS };
  if (!row) return tokens;

  THEME_TOKEN_KEYS.forEach((key) => {
    const value = row[key] as string | null | undefined;
    if (value) {
      tokens[key] = value;
    }
  });

  return tokens;
}

function pickThemeOverrides(row: Record<string, unknown> | null): ThemeOverrides {
  if (!row) return {};

  const overrides: ThemeOverrides = {};
  THEME_TOKEN_KEYS.forEach((key) => {
    const value = row[key] as string | null | undefined;
    if (value) {
      overrides[key] = value;
    }
  });

  return overrides;
}

export async function getPlatformTheme(): Promise<ThemeTokens> {
  const { data, error } = await supabase
    .from('platform_theme')
    .select('*')
    .eq('name', 'default')
    .single();

  if (error) {
    return DEFAULT_THEME_TOKENS;
  }

  return pickThemeTokens(data as PlatformThemeRow);
}

export async function getCompanyTheme(companyId: string): Promise<ThemeOverrides> {
  const { data, error } = await supabase
    .from('company_theme')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (error) {
    return {};
  }

  return pickThemeOverrides(data as CompanyThemeRow);
}

export async function upsertPlatformTheme(
  updates: Partial<ThemeTokens>
): Promise<ThemeTokens> {
  const payload = {
    name: 'default',
    ...updates,
  };

  const { data, error } = await supabase
    .from('platform_theme')
    .upsert(payload, { onConflict: 'name' })
    .select('*')
    .single();

  if (error) throw error;

  return pickThemeTokens(data as PlatformThemeRow);
}

export async function upsertCompanyTheme(
  companyId: string,
  updates: Partial<ThemeTokens>
): Promise<ThemeOverrides> {
  const payload: Record<string, unknown> = {
    company_id: companyId,
    ...updates,
  };

  const { data, error } = await supabase
    .from('company_theme')
    .upsert(payload, { onConflict: 'company_id' })
    .select('*')
    .single();

  if (error) throw error;

  return pickThemeOverrides(data as CompanyThemeRow);
}

export function buildThemePayload(
  key: ThemeTokenKey,
  value: string
): Partial<ThemeTokens> {
  return {
    [key]: value,
  };
}
