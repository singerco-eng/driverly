import { supabase } from '@/integrations/supabase/client';

type CompanyScope = {
  companyId: string | null;
  isSuperAdmin: boolean;
};

export async function getCompanyScope(): Promise<CompanyScope> {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  const appMetadata = (user?.app_metadata ?? {}) as Record<string, unknown>;
  const role = appMetadata.role as string | undefined;

  return {
    companyId: (appMetadata.company_id as string | undefined) ?? null,
    isSuperAdmin: role === 'super_admin',
  };
}
