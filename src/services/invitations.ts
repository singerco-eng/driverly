import { supabase } from '@/integrations/supabase/client';
import { getCompanyScope } from '@/services/authScope';
import type {
  Invitation,
  InvitationValidation,
  InvitationWithCompany,
  InviteAdminFormData,
} from '@/types/invitation';

const INVITATION_WITH_COMPANY_SELECT = `
  *,
  company:companies(id, name, logo_url, primary_color)
`;

const INVITATION_VALIDATION_SELECT = `
  id,
  email,
  full_name,
  status,
  expires_at,
  company:companies(id, name, logo_url, primary_color)
`;

type RawInvitationRecord = Omit<Invitation, 'resent_count'> & {
  resend_count?: number | null;
};

type RawInvitationWithCompanyRecord = RawInvitationRecord & {
  company: InvitationWithCompany['company'];
};

type FunctionErrorResponse = {
  error?: string;
};

export type SendInvitationResult = InvitationWithCompany & {
  isResend: boolean;
};

function normalizeInvitation(record: RawInvitationRecord): Invitation {
  return {
    ...record,
    resent_count: record.resend_count ?? 0,
  } as Invitation;
}

function normalizeInvitationWithCompany(
  record: RawInvitationWithCompanyRecord
): InvitationWithCompany {
  return {
    ...normalizeInvitation(record),
    company: record.company ?? null,
  };
}

async function hashInvitationToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error('Not authenticated');

  return user.id;
}

async function requireCompanyId(companyId?: string): Promise<string> {
  if (companyId) return companyId;

  const { companyId: scopedCompanyId } = await getCompanyScope();
  if (!scopedCompanyId) {
    throw new Error('Company scope is required');
  }

  return scopedCompanyId;
}

function assertFunctionSuccess(
  response: { error: Error | null; data: FunctionErrorResponse | null | undefined }
): void {
  if (response.error) {
    throw response.error;
  }

  if (response.data?.error) {
    throw new Error(response.data.error);
  }
}

async function findPendingInvitation(
  companyId: string,
  email: string
): Promise<InvitationWithCompany | null> {
  const { data, error } = await supabase
    .from('invitations')
    .select(INVITATION_WITH_COMPANY_SELECT)
    .eq('company_id', companyId)
    .ilike('email', email)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  const invitation = data?.[0] as RawInvitationWithCompanyRecord | undefined;
  return invitation ? normalizeInvitationWithCompany(invitation) : null;
}

export async function getCompanyInvitations(companyId?: string): Promise<InvitationWithCompany[]> {
  const { companyId: scopedCompanyId, isSuperAdmin } = await getCompanyScope();
  const resolvedCompanyId = companyId ?? (isSuperAdmin ? null : scopedCompanyId);

  let query = supabase
    .from('invitations')
    .select(INVITATION_WITH_COMPANY_SELECT)
    .order('created_at', { ascending: false });

  if (resolvedCompanyId) {
    query = query.eq('company_id', resolvedCompanyId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as RawInvitationWithCompanyRecord[] | null)?.map(normalizeInvitationWithCompany) ?? [];
}

export async function getInvitation(id: string): Promise<InvitationWithCompany> {
  const { data, error } = await supabase
    .from('invitations')
    .select(INVITATION_WITH_COMPANY_SELECT)
    .eq('id', id)
    .single();

  if (error) throw error;
  return normalizeInvitationWithCompany(data as RawInvitationWithCompanyRecord);
}

export async function sendInvitation(
  companyId: string,
  data: InviteAdminFormData
): Promise<SendInvitationResult> {
  const resolvedCompanyId = await requireCompanyId(companyId);
  const invitedBy = await requireUserId();
  const email = data.email.trim().toLowerCase();
  const fullName = data.full_name.trim();
  const phone = data.phone?.trim() || null;

  if (!email) throw new Error('Email is required');
  if (!fullName) throw new Error('Full name is required');

  const existingPendingInvitation = await findPendingInvitation(resolvedCompanyId, email);
  if (existingPendingInvitation) {
    const resentInvitation = await resendInvitation(existingPendingInvitation.id);
    return {
      ...resentInvitation,
      isResend: true,
    };
  }

  const token = crypto.randomUUID();
  const tokenHash = await hashInvitationToken(token);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      full_name: fullName,
      phone,
      email,
      role: 'admin',
      company_id: resolvedCompanyId,
      invited_by: invitedBy,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      token_hash: tokenHash,
    })
    .select(INVITATION_WITH_COMPANY_SELECT)
    .single();

  if (error) throw error;

  const response = await supabase.functions.invoke('send-invitation', {
    body: {
      invitationId: invitation.id,
      token,
    },
  });

  assertFunctionSuccess(response);

  return {
    ...normalizeInvitationWithCompany(invitation as RawInvitationWithCompanyRecord),
    isResend: false,
  };
}

export async function resendInvitation(invitationId: string): Promise<InvitationWithCompany> {
  const response = await supabase.functions.invoke('resend-invitation', {
    body: { invitationId },
  });

  assertFunctionSuccess(response);

  return getInvitation(invitationId);
}

export async function revokeInvitation(invitationId: string): Promise<InvitationWithCompany> {
  const revokedBy = await requireUserId();
  const { error } = await supabase
    .from('invitations')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
    })
    .eq('id', invitationId);

  if (error) throw error;

  return getInvitation(invitationId);
}

export async function validateInvitationToken(token: string): Promise<InvitationValidation> {
  const tokenHash = await hashInvitationToken(token);
  const { data, error } = await supabase
    .from('invitations')
    .select(INVITATION_VALIDATION_SELECT)
    .eq('token_hash', tokenHash)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Invalid invitation link');
    }

    throw error;
  }

  const invitation = data as InvitationValidation;

  if (invitation.status !== 'pending') {
    throw new Error('This invitation has already been used or expired');
  }

  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error('This invitation has expired');
  }

  return invitation;
}

export async function acceptInvitation(token: string, password: string, fullName: string): Promise<{ userId: string }> {
  const trimmedFullName = fullName.trim();
  if (!trimmedFullName) {
    throw new Error('Full name is required');
  }

  const { data, error } = await supabase.functions.invoke('accept-invitation', {
    body: { token, password, fullName: trimmedFullName },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  
  return { userId: data.userId };
}
