export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invitation {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'admin' | 'coordinator';
  company_id: string;
  status: InvitationStatus;
  expires_at: string;
  resent_count: number;
  last_resent_at: string | null;
  accepted_at: string | null;
  accepted_user_id: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  invited_by: string;
  created_at: string;
  updated_at: string;
}

export interface InvitationWithInviter extends Invitation {
  invited_by_user: {
    full_name: string;
  } | null;
}

export interface InviteAdminFormData {
  full_name: string;
  email: string;
  phone?: string;
}

export interface InvitationValidation {
  id: string;
  email: string;
  full_name: string;
  status: InvitationStatus;
  expires_at: string;
  company: {
    id: string;
    name: string;
    logo_url: string | null;
    primary_color: string;
  };
}
