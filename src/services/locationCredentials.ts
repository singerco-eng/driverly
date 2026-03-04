import { supabase } from '@/integrations/supabase/client';
import type { LocationCredential } from '@/types/location';

const locationCredentialSelect = `
  id,
  location_id,
  credential_type_id,
  company_id,
  status,
  document_url,
  document_urls,
  form_data,
  entered_date,
  driver_expiration_date,
  notes,
  expires_at,
  reviewed_at,
  reviewed_by,
  review_notes,
  grace_period_ends,
  submission_version,
  submitted_at,
  created_at,
  updated_at,
  credential_type:credential_types(
    id,
    company_id,
    name,
    description,
    instruction_config,
    category,
    scope,
    broker_id,
    requires_driver_action,
    employment_type,
    requirement,
    vehicle_types,
    status,
    effective_date,
    published_at,
    published_by,
    submission_type,
    form_schema,
    signature_document_url,
    expiration_type,
    expiration_interval_days,
    expiration_warning_days,
    grace_period_days,
    display_order,
    is_active,
    is_seeded,
    created_at,
    updated_at,
    created_by,
    broker:brokers(id, name)
  ),
  location:company_locations(
    id,
    company_id,
    name,
    code,
    address_line1,
    address_line2,
    city,
    state,
    zip,
    phone,
    email,
    status,
    created_at,
    updated_at
  )
`;

export async function getLocationCredentials(
  locationId: string,
): Promise<LocationCredential[]> {
  const { data, error } = await supabase
    .from('location_credentials')
    .select(locationCredentialSelect)
    .eq('location_id', locationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as LocationCredential[];
}

export async function getLocationCredential(id: string): Promise<LocationCredential | null> {
  const { data, error } = await supabase
    .from('location_credentials')
    .select(locationCredentialSelect)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data || null) as LocationCredential | null;
}

export async function submitLocationCredential(
  locationId: string,
  credentialTypeId: string,
  companyId: string,
  data: {
    document_url?: string;
    document_urls?: string[];
    form_data?: Record<string, unknown>;
    entered_date?: string;
    driver_expiration_date?: string;
    notes?: string;
  },
): Promise<LocationCredential> {
  const { data: userData } = await supabase.auth.getUser();
  const reviewerId = userData?.user?.id;
  if (!reviewerId) throw new Error('Not authenticated');

  const { data: credential, error } = await supabase
    .from('location_credentials')
    .upsert(
      {
        location_id: locationId,
        credential_type_id: credentialTypeId,
        company_id: companyId,
        status: 'approved',
        submitted_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        document_url: data.document_url ?? null,
        document_urls: data.document_urls ?? null,
        form_data: data.form_data ?? null,
        entered_date: data.entered_date ?? null,
        driver_expiration_date: data.driver_expiration_date ?? null,
        notes: data.notes ?? null,
      },
      { onConflict: 'location_id,credential_type_id' },
    )
    .select(locationCredentialSelect)
    .single();

  if (error) throw error;
  return credential as LocationCredential;
}

export async function getLocationCredentialsPendingReview(
  companyId: string,
): Promise<LocationCredential[]> {
  const { data, error } = await supabase
    .from('location_credentials')
    .select(locationCredentialSelect)
    .eq('company_id', companyId)
    .eq('status', 'pending_review')
    .order('submitted_at', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data || []) as LocationCredential[];
}
