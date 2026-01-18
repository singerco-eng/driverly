import { supabase } from '@/integrations/supabase/client';
import type {
  Company,
  CompanyAdmin,
  CompanyDetail,
  CompanyFormData,
  CompanyWithStats,
} from '@/types/company';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function getCompanies(): Promise<CompanyWithStats[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CompanyWithStats[];
}

export async function getCompany(id: string): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Company;
}

export async function getCompanyBySlug(slug: string): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as Company;
}

export async function getCompanyDetail(id: string): Promise<CompanyDetail> {
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (companyError) throw companyError;

  const { count: adminCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', id)
    .in('role', ['admin', 'coordinator']);

  const { count: driverCount } = await supabase
    .from('drivers')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', id);

  const { count: vehicleCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', id)
    .eq('status', 'active');

  return {
    ...company,
    admin_count: adminCount ?? 0,
    driver_count: driverCount ?? 0,
    vehicle_count: vehicleCount ?? 0,
  } as CompanyDetail;
}

export async function getCompanyAdmins(companyId: string): Promise<CompanyAdmin[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, phone, role, avatar_url, created_at')
    .eq('company_id', companyId)
    .in('role', ['admin', 'coordinator'])
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((user) => ({
    ...user,
    status: 'active' as const,
    invited_at: null,
  }));
}

export async function createCompany(formData: CompanyFormData): Promise<Company> {
  const slug = formData.slug || generateSlug(formData.name);

  const { data, error } = await supabase
    .from('companies')
    .insert({
      name: formData.name,
      slug,
      email: formData.email || null,
      phone: formData.phone || null,
      address_line1: formData.address_line1 || null,
      address_line2: formData.address_line2 || null,
      city: formData.city || null,
      state: formData.state || null,
      zip: formData.zip || null,
      primary_color: formData.primary_color || '#3B82F6',
      ein: formData.ein || null,
      timezone: formData.timezone || 'America/New_York',
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Company;
}

export async function updateCompany(
  id: string,
  formData: Partial<CompanyFormData>
): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update({
      ...formData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Company;
}

export async function deactivateCompany(id: string, reason: string): Promise<Company> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('companies')
    .update({
      status: 'inactive',
      deactivation_reason: reason,
      deactivated_at: new Date().toISOString(),
      deactivated_by: user?.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Company;
}

export async function suspendCompany(id: string, reason: string): Promise<Company> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('companies')
    .update({
      status: 'suspended',
      deactivation_reason: reason,
      deactivated_at: new Date().toISOString(),
      deactivated_by: user?.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Company;
}

export async function reactivateCompany(id: string): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update({
      status: 'active',
      deactivation_reason: null,
      deactivated_at: null,
      deactivated_by: null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Company;
}
