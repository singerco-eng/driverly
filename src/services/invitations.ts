import { supabase } from '@/integrations/supabase/client';
import { getCompanyScope } from '@/services/authScope';
import type { Invitation, InvitationWithCompany } from '@/types/invitation';

export interface CreateInvitationData {
  email: string;
  role: 'admin' | 'driver';
  company_id: string;
}

export async function getInvitations(companyId?: string): Promise<InvitationWithCompany[]> {
  const { companyId: scopedCompanyId, isSuperAdmin } = await getCompanyScope();
  const resolvedCompanyId = companyId ?? (isSuperAdmin ? null : scopedCompanyId);

  let query = supabase
    .from('invitations')
    .select(`
      *,
      company:companies(id, name, logo_url, primary_color)
    `)
    .order('created_at', { ascending: false });

  if (resolvedCompanyId) {
    query = query.eq('company_id', resolvedCompanyId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as InvitationWithCompany[];
}

export async function getInvitation(id: string): Promise<InvitationWithCompany> {
  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      company:companies(id, name, logo_url, primary_color)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as InvitationWithCompany;
}

export async function createInvitation(data: CreateInvitationData): Promise<Invitation> {
  // Generate a token
  const token = crypto.randomUUID();
  
  // Calculate expiration (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Create invitation record
  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      email: data.email,
      role: data.role,
      company_id: data.company_id,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Call edge function to send email and store token hash
  await supabase.functions.invoke('send-invitation', {
    body: {
      invitationId: invitation.id,
      token,
    },
  });

  return invitation as Invitation;
}

export async function resendInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('resend-invitation', {
    body: { invitationId },
  });

  if (error) throw error;
}

export async function revokeInvitation(invitationId: string, revokedBy: string): Promise<void> {
  const { error } = await supabase
    .from('invitations')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
    })
    .eq('id', invitationId);

  if (error) throw error;
}

export async function acceptInvitation(token: string, password: string, fullName: string): Promise<{ userId: string }> {
  const { data, error } = await supabase.functions.invoke('accept-invitation', {
    body: { token, password, fullName },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  
  return { userId: data.userId };
}
