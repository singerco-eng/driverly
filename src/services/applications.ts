import { supabase } from '@/integrations/supabase/client';
import { getCompanyScope } from '@/services/authScope';
import type { ApplicationStatus, DriverWithDetails, DriverWithUser, EmploymentType } from '@/types/driver';
import type { ApplicationFormData, ApplicationSubmission } from '@/types/application';

export interface ApplicationFilters {
  status?: ApplicationStatus | 'all';
  employmentType?: EmploymentType | 'all';
  search?: string;
}

export async function getApplications(filters?: ApplicationFilters): Promise<DriverWithUser[]> {
  const { companyId, isSuperAdmin } = await getCompanyScope();

  let query = supabase
    .from('drivers')
    .select(
      `
      *,
      user:users!user_id(id, email, full_name, phone, avatar_url)
    `
    )
    .not('application_status', 'is', null)
    .neq('application_status', 'draft')
    .order('application_submitted_at', { ascending: false });

  if (companyId && !isSuperAdmin) {
    query = query.eq('company_id', companyId);
  }

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('application_status', filters.status);
  }

  if (filters?.employmentType && filters.employmentType !== 'all') {
    query = query.eq('employment_type', filters.employmentType);
  }

  if (filters?.search) {
    query = query.or(
      `user.full_name.ilike.%${filters.search}%,user.email.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as DriverWithUser[];
}

export async function getApplication(id: string): Promise<DriverWithDetails> {
  const { data, error } = await supabase
    .from('drivers')
    .select(
      `
      *,
      user:users!user_id(*),
      vehicles:driver_vehicle_assignments(
        *,
        vehicle:vehicles(*)
      )
    `
    )
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as DriverWithDetails;
}

export async function getApplicationDraft(companyId: string, userId: string) {
  const { data, error } = await supabase
    .from('application_drafts')
    .select('*')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertApplicationDraft({
  companyId,
  userId,
  formData,
  currentStep,
}: {
  companyId: string;
  userId: string;
  formData: ApplicationFormData;
  currentStep: number;
}) {
  const { error } = await supabase.from('application_drafts').upsert(
    {
      user_id: userId,
      company_id: companyId,
      form_data: formData,
      current_step: currentStep,
    },
    {
      onConflict: 'user_id,company_id',
    }
  );

  if (error) throw error;
}

export async function deleteApplicationDraft(companyId: string, userId: string) {
  const { error } = await supabase
    .from('application_drafts')
    .delete()
    .eq('user_id', userId)
    .eq('company_id', companyId);

  if (error) throw error;
}

export async function submitApplication(payload: ApplicationSubmission) {
  // Get the current session for auth header
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  // Use raw fetch for better error handling
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/submit-application`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    // Extract the error message from the response body
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export async function updateApplicationNotes(driverId: string, notes: string) {
  const { data, error } = await supabase
    .from('drivers')
    .update({ admin_notes: notes })
    .eq('id', driverId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function approveApplication(driverId: string, approverId: string) {
  const { data, error } = await supabase
    .from('drivers')
    .update({
      application_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approverId,
      status: 'inactive',
    })
    .eq('id', driverId)
    .select()
    .single();

  if (error) throw error;

  await supabase.functions.invoke('application-status-email', {
    body: { driverId, status: 'approved' },
  });

  return data;
}

export async function rejectApplication({
  driverId,
  reason,
  details,
}: {
  driverId: string;
  reason: string;
  details?: string;
}) {
  const canReapplyAt = new Date();
  canReapplyAt.setDate(canReapplyAt.getDate() + 14);

  const rejectionReason = details ? `${reason}: ${details}` : reason;

  const { data, error } = await supabase
    .from('drivers')
    .update({
      application_status: 'rejected',
      rejection_reason: rejectionReason,
      rejected_at: new Date().toISOString(),
      can_reapply_at: canReapplyAt.toISOString(),
    })
    .eq('id', driverId)
    .select()
    .single();

  if (error) throw error;

  await supabase.functions.invoke('application-status-email', {
    body: { driverId, status: 'rejected', reason: rejectionReason },
  });

  return data;
}

export async function withdrawApplication(driverId: string) {
  const { data, error } = await supabase
    .from('drivers')
    .update({
      application_status: 'withdrawn',
    })
    .eq('id', driverId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
