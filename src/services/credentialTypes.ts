import { supabase } from '@/integrations/supabase/client';
import type {
  CredentialType,
  CredentialTypeFormData,
  CredentialTypeWithStats,
  Broker,
} from '@/types/credential';

export async function getCredentialTypes(companyId: string): Promise<CredentialType[]> {
  const { data, error } = await supabase
    .from('credential_types')
    .select(
      `
      *,
      broker:brokers(id, name)
    `,
    )
    .eq('company_id', companyId)
    .order('scope')
    .order('category')
    .order('display_order');

  if (error) throw error;
  return data as CredentialType[];
}

export async function getCredentialType(id: string): Promise<CredentialType> {
  const { data, error } = await supabase
    .from('credential_types')
    .select(
      `
      *,
      broker:brokers(id, name)
    `,
    )
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CredentialType;
}

export async function getCredentialTypeWithStats(
  id: string,
): Promise<CredentialTypeWithStats> {
  const credType = await getCredentialType(id);

  // Get counts based on category
  const table = credType.category === 'driver' ? 'driver_credentials' : 'vehicle_credentials';

  const { data: stats, error: statsError } = await supabase
    .from(table)
    .select('status')
    .eq('credential_type_id', id);

  if (statsError) throw statsError;

  const counts = {
    total_count: stats?.length ?? 0,
    approved_count: stats?.filter((s) => s.status === 'approved').length ?? 0,
    pending_count: stats?.filter((s) => s.status === 'pending_review').length ?? 0,
    rejected_count: stats?.filter((s) => s.status === 'rejected').length ?? 0,
    expired_count: stats?.filter((s) => s.status === 'expired').length ?? 0,
  };

  return { ...credType, ...counts };
}

export async function createCredentialType(
  companyId: string,
  formData: CredentialTypeFormData,
  userId: string,
): Promise<CredentialType> {
  const { data, error } = await supabase
    .from('credential_types')
    .insert({
      company_id: companyId,
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      scope: formData.scope,
      broker_id: formData.scope === 'broker' ? formData.broker_id : null,
      employment_type: formData.employment_type,
      requirement: formData.requirement,
      vehicle_types: formData.category === 'vehicle' ? formData.vehicle_types : null,
      submission_type: formData.submission_type,
      form_schema: formData.form_schema,
      signature_document_url: formData.signature_document_url,
      expiration_type: formData.expiration_type,
      expiration_interval_days:
        formData.expiration_type === 'fixed_interval'
          ? formData.expiration_interval_days
          : null,
      expiration_warning_days: formData.expiration_warning_days,
      grace_period_days: formData.grace_period_days,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CredentialType;
}

export async function updateCredentialType(
  id: string,
  formData: Partial<CredentialTypeFormData>,
): Promise<CredentialType> {
  const { data, error } = await supabase
    .from('credential_types')
    .update({
      ...formData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CredentialType;
}

export async function deactivateCredentialType(id: string): Promise<CredentialType> {
  const { data, error } = await supabase
    .from('credential_types')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CredentialType;
}

export async function reactivateCredentialType(id: string): Promise<CredentialType> {
  const { data, error } = await supabase
    .from('credential_types')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CredentialType;
}

export async function updateCredentialTypeOrder(
  companyId: string,
  orderedIds: string[],
): Promise<void> {
  // Update display_order for each credential type
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('credential_types')
      .update({ display_order: index })
      .eq('id', id)
      .eq('company_id', companyId),
  );

  await Promise.all(updates);
}

// Brokers (minimal for credential type form)
export async function getBrokers(companyId: string): Promise<Broker[]> {
  const { data, error } = await supabase
    .from('brokers')
    .select('id, company_id, name, code, is_active')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data as Broker[];
}
