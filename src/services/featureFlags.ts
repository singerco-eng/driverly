import { supabase } from '@/integrations/supabase/client';
import type {
  FeatureFlag,
  FeatureFlagWithOverride,
  FeatureFlagWithStats,
  CompanyFeatureOverride,
} from '@/types/featureFlags';

// ============ CACHE ============

let flagCache: Map<string, boolean> = new Map();
let cacheCompanyId: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isCacheValid(companyId: string): boolean {
  return (
    cacheCompanyId === companyId &&
    Date.now() - cacheTimestamp < CACHE_TTL
  );
}

export function clearFlagCache(): void {
  flagCache.clear();
  cacheCompanyId = null;
  cacheTimestamp = 0;
}

// ============ FETCH FLAGS ============

export async function getAllFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getAllFlagsWithStats(): Promise<FeatureFlagWithStats[]> {
  const { data: flags, error: flagsError } = await supabase
    .from('feature_flags')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (flagsError) throw flagsError;

  const { data: overrides, error: overridesError } = await supabase
    .from('company_feature_overrides')
    .select('flag_id');

  if (overridesError) throw overridesError;

  const overrideCounts = new Map<string, number>();
  for (const override of overrides ?? []) {
    const count = overrideCounts.get(override.flag_id) ?? 0;
    overrideCounts.set(override.flag_id, count + 1);
  }

  return (flags ?? []).map((flag) => ({
    ...flag,
    override_count: overrideCounts.get(flag.id) ?? 0,
  }));
}

export async function getFlagsForCompany(
  companyId: string
): Promise<FeatureFlagWithOverride[]> {
  const { data: flags, error: flagsError } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('is_internal', false)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (flagsError) throw flagsError;

  const { data: overrides, error: overridesError } = await supabase
    .from('company_feature_overrides')
    .select('*')
    .eq('company_id', companyId);

  if (overridesError) throw overridesError;

  const overrideMap = new Map(
    (overrides ?? []).map((override) => [override.flag_id, override])
  );

  return (flags ?? []).map((flag) => {
    const override = overrideMap.get(flag.id);
    return {
      ...flag,
      override,
      effective_value: override?.enabled ?? flag.default_enabled,
    };
  });
}

export async function getCompanyOverrides(
  companyId: string
): Promise<CompanyFeatureOverride[]> {
  const { data, error } = await supabase
    .from('company_feature_overrides')
    .select('*')
    .eq('company_id', companyId);

  if (error) throw error;
  return data ?? [];
}

export async function getOverridesForFlag(
  flagId: string
): Promise<(CompanyFeatureOverride & { company: { name: string } })[]> {
  const { data, error } = await supabase
    .from('company_feature_overrides')
    .select('*, company:companies(name)')
    .eq('flag_id', flagId);

  if (error) throw error;
  return data ?? [];
}

// ============ CHECK FLAGS ============

export async function isFeatureEnabled(
  companyId: string,
  flagKey: string
): Promise<boolean> {
  const cacheKey = `${companyId}:${flagKey}`;
  if (isCacheValid(companyId) && flagCache.has(cacheKey)) {
    return flagCache.get(cacheKey)!;
  }

  const { data: flag, error: flagError } = await supabase
    .from('feature_flags')
    .select('id, default_enabled')
    .eq('key', flagKey)
    .single();

  if (flagError || !flag) return false;

  const { data: override } = await supabase
    .from('company_feature_overrides')
    .select('enabled')
    .eq('company_id', companyId)
    .eq('flag_id', flag.id)
    .maybeSingle();

  const result = override?.enabled ?? flag.default_enabled;

  if (cacheCompanyId !== companyId) {
    flagCache.clear();
    cacheCompanyId = companyId;
  }
  cacheTimestamp = Date.now();
  flagCache.set(cacheKey, result);

  return result;
}

export async function getEnabledFlags(
  companyId: string,
  flagKeys: string[]
): Promise<Record<string, boolean>> {
  const flags = await getFlagsForCompany(companyId);
  const result: Record<string, boolean> = {};

  for (const key of flagKeys) {
    const flag = flags.find((item) => item.key === key);
    result[key] = flag?.effective_value ?? false;
  }

  return result;
}

// ============ MUTATIONS ============

export async function setGlobalDefault(
  flagId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('feature_flags')
    .update({ default_enabled: enabled })
    .eq('id', flagId);

  if (error) throw error;
  clearFlagCache();
}

export async function setCompanyOverride(
  companyId: string,
  flagId: string,
  enabled: boolean,
  reason?: string
): Promise<void> {
  const { error } = await supabase
    .from('company_feature_overrides')
    .upsert(
      {
        company_id: companyId,
        flag_id: flagId,
        enabled,
        reason: reason ?? null,
      },
      { onConflict: 'company_id,flag_id' }
    );

  if (error) throw error;
  clearFlagCache();
}

export async function removeCompanyOverride(
  companyId: string,
  flagId: string
): Promise<void> {
  const { error } = await supabase
    .from('company_feature_overrides')
    .delete()
    .eq('company_id', companyId)
    .eq('flag_id', flagId);

  if (error) throw error;
  clearFlagCache();
}
