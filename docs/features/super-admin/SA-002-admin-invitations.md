# SA-002: Admin Invitations

> **Last Updated:** 2026-01-16  
> **Status:** Draft  
> **Phase:** 1 - Super Admin MVP

---

## Overview

Admin Invitations allows Super Admins to invite company administrators to the platform. This feature handles the invitation lifecycle from sending through acceptance, including resending and revoking invitations.

**Note:** Super Admins can only invite Admins. Coordinators are invited by company Admins (see AD-010).

---

## User Stories

### Primary Stories

1. **As a Super Admin**, I want to invite an admin to a company so that they can manage the company's operations.

2. **As a Super Admin**, I want to view pending invitations for a company so that I can track who hasn't accepted yet.

3. **As a Super Admin**, I want to resend an invitation so that the invitee gets a fresh email with an extended expiration.

4. **As a Super Admin**, I want to revoke an invitation so that the invitee can no longer use the link.

5. **As an Invited Admin**, I want to accept my invitation by creating a password so that I can access my company's dashboard.

---

## Data Model

### Invitations Table

References `03-AUTHENTICATION.md` with refinements:

```sql
CREATE TABLE invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invitation details
  email           text NOT NULL,
  full_name       text NOT NULL,
  phone           text,
  role            text NOT NULL DEFAULT 'admin'
                  CHECK (role IN ('admin', 'coordinator')),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Token (hashed for security)
  token_hash      text NOT NULL,
  
  -- Status
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  
  -- Expiration (7 days from created/resent)
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  
  -- Tracking
  invited_by      uuid NOT NULL REFERENCES users(id),
  resent_count    integer NOT NULL DEFAULT 0,
  last_resent_at  timestamptz,
  
  -- Acceptance
  accepted_at     timestamptz,
  accepted_user_id uuid REFERENCES users(id),
  
  -- Revocation
  revoked_at      timestamptz,
  revoked_by      uuid REFERENCES users(id),
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_company_id ON invitations(company_id);
CREATE INDEX idx_invitations_status ON invitations(company_id, status);
CREATE INDEX idx_invitations_token_hash ON invitations(token_hash);
CREATE UNIQUE INDEX idx_invitations_pending_email_company 
  ON invitations(email, company_id) 
  WHERE status = 'pending';

-- RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all invitations"
  ON invitations FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Admins can view own company invitations"
  ON invitations FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );
```

### Invitation States

| State | Description | Transitions To |
|-------|-------------|----------------|
| `pending` | Sent, awaiting acceptance | `accepted`, `expired`, `revoked` |
| `accepted` | User created account | (terminal) |
| `expired` | Past 7-day expiration | Can create new invitation |
| `revoked` | Cancelled by Super Admin | (terminal) |

### State Diagram

```
                    ┌──────────┐
     create         │ pending  │
    ─────────────►  └────┬─────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐    ┌──────────┐    ┌─────────┐
    │ accepted│    │ expired  │    │ revoked │
    └─────────┘    └──────────┘    └─────────┘
```

---

## UI Specifications

### 1. Invitations Tab (Company Detail)

**Route:** `/super-admin/companies/[id]` → Invitations tab

**Component:** `EnhancedDataView` (table view default)

**Location:** New tab in company detail view (alongside Overview, Company Info, Admins)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Companies                                            │
│                                                                 │
│  [Logo] Acme Transport                          [Edit] [•••]    │
│         ● Active                                                │
│                                                                 │
│  [Overview]  [Company Info]  [Admins]  [Invitations]  [Billing] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Invitations                                     [+ Invite]     │
├─────────────────────────────────────────────────────────────────┤
│  [Search...]  [Status ▼: All]                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Name       │ Email           │ Status   │ Sent    │ Actions│ │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ John Smith │ john@test.com   │ ● Pending│ Jan 15  │ [•••]  │ │
│  │ Jane Doe   │ jane@test.com   │ ✓ Accepted│ Jan 10 │ —      │ │
│  │ Bob Wilson │ bob@test.com    │ ○ Expired│ Jan 1   │ [•••]  │ │
│  │ Amy Chen   │ amy@test.com    │ ✕ Revoked│ Dec 20  │ —      │ │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Showing 4 invitations                                          │
└─────────────────────────────────────────────────────────────────┘
```

**Table Columns:**
| Column | Description |
|--------|-------------|
| Name | Invitee's full name |
| Email | Invitee's email |
| Status | Badge: Pending (yellow), Accepted (green), Expired (gray), Revoked (red) |
| Sent | Date invitation was sent |
| Expires | Expiration date (for pending only) |
| Actions | Context menu |

**Filters:**
- Search: by name or email
- Status: All | Pending | Accepted | Expired | Revoked

**Row Actions (•••):**

| Status | Actions |
|--------|---------|
| Pending | Resend, Revoke |
| Expired | Resend (creates fresh invitation) |
| Accepted | (no actions) |
| Revoked | (no actions) |

---

### 2. Invite Admin Modal

**Trigger:** Click "+ Invite" button

**Component:** `Modal` (size: md)

```
┌─────────────────────────────────────────────────────────────────┐
│  Invite Admin                                              [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Invite a new administrator to Acme Transport.                  │
│  They will receive an email with instructions to create         │
│  their account.                                                 │
│                                                                 │
│  Full Name *                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Email *                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Phone                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  The invitation will expire in 7 days.                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Send Invitation]        │
└─────────────────────────────────────────────────────────────────┘
```

**Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Full Name | text | Yes | Min 2 characters |
| Email | email | Yes | Valid email format |
| Phone | tel | No | Valid phone format |

**Validation Rules:**
- Email must not already have pending invitation for this company
- Email must not already be an admin of this company
- Email CAN exist in another company (multi-company admin allowed)

**On Submit:**
1. If pending invitation exists for email+company → Resend existing (extend expiration)
2. Otherwise → Create new invitation
3. Send invitation email
4. Show success toast
5. Close modal
6. Refresh invitations list

---

### 3. Resend Confirmation

**Trigger:** Row action → Resend

**Component:** `Modal` (size: sm)

```
┌─────────────────────────────────────────────────────────────────┐
│  Resend Invitation                                         [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Resend the invitation to john@test.com?                        │
│                                                                 │
│  This will send a new email and extend the expiration           │
│  to 7 days from now.                                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Resend]                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4. Revoke Confirmation

**Trigger:** Row action → Revoke

**Component:** `Modal` (size: sm)

```
┌─────────────────────────────────────────────────────────────────┐
│  Revoke Invitation                                         [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Revoke the invitation for john@test.com?                       │
│                                                                 │
│  They will no longer be able to use the invitation link.        │
│  You can send a new invitation later if needed.                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Revoke]                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. Accept Invitation Page

**Route:** `/accept-invitation?token=xxx`

**Public page** (no auth required)

**Component:** Centered card layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        [Driverly Logo]                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │        Welcome to Acme Transport                          │ │
│  │                                                           │ │
│  │   You've been invited to join as an Administrator.        │ │
│  │                                                           │ │
│  │   Email                                                   │ │
│  │   ┌─────────────────────────────────────────────────┐    │ │
│  │   │ john@test.com                           (locked) │    │ │
│  │   └─────────────────────────────────────────────────┘    │ │
│  │                                                           │ │
│  │   Create Password *                                       │ │
│  │   ┌─────────────────────────────────────────────────┐    │ │
│  │   │ ••••••••••••                                    │    │ │
│  │   └─────────────────────────────────────────────────┘    │ │
│  │   Min 8 chars, uppercase, lowercase, number              │ │
│  │                                                           │ │
│  │   Confirm Password *                                      │ │
│  │   ┌─────────────────────────────────────────────────┐    │ │
│  │   │ ••••••••••••                                    │    │ │
│  │   └─────────────────────────────────────────────────┘    │ │
│  │                                                           │ │
│  │   ┌─────────────────────────────────────────────────┐    │ │
│  │   │            Create Account                        │    │ │
│  │   └─────────────────────────────────────────────────┘    │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**States:**

| State | Display |
|-------|---------|
| Valid token | Form shown above |
| Invalid token | "Invalid invitation link" message |
| Expired token | "This invitation has expired" message + contact admin |
| Revoked token | "This invitation is no longer valid" message |
| Already accepted | "This invitation has already been used" + login link |

**On Submit:**
1. Validate password meets requirements
2. Create auth user via Supabase Admin API
3. Set `app_metadata`: `{ role: 'admin', company_id: xxx }`
4. Create user record in `users` table
5. Mark invitation as `accepted`
6. Auto-sign in the user
7. Redirect to `/admin` dashboard
8. Show first-time wizard (defined in separate feature spec)

---

## Invitation Email

### Email Content

**From:** `noreply@driverly.com`

**Subject:** `You've been invited to join [Company Name]`

**Body:**
```
You've been invited to join [Company Name] as an Administrator.

Click the button below to create your account:

[Create Account]

This invitation will expire on [Expiration Date].

If you didn't expect this invitation, you can safely ignore this email.
```

**Design Notes:**
- Minimal branding (Driverly name subject to change)
- Single CTA button
- No company logo in email (keep simple for MVP)
- Plain text fallback

---

## Acceptance Criteria

### AC-1: Send Invitation

- [ ] Super Admin can invite admin from company's Invitations tab
- [ ] Form requires full name and email
- [ ] Phone is optional
- [ ] Email validation (valid format)
- [ ] Cannot invite email already admin in this company (error shown)
- [ ] CAN invite email that exists in different company
- [ ] On submit, invitation record created with `pending` status
- [ ] Token generated securely, hash stored in database
- [ ] Expiration set to 7 days from now
- [ ] Invitation email sent to invitee
- [ ] Success toast: "Invitation sent"
- [ ] Invitations list refreshes

### AC-2: Resend Invitation

- [ ] Can resend pending invitation from row actions
- [ ] Can resend expired invitation from row actions
- [ ] Confirmation modal shown before resending
- [ ] On confirm:
  - [ ] New token generated
  - [ ] Expiration extended to 7 days from now
  - [ ] `resent_count` incremented
  - [ ] `last_resent_at` updated
  - [ ] New email sent
- [ ] Success toast: "Invitation resent"

### AC-3: Revoke Invitation

- [ ] Can revoke pending invitation from row actions
- [ ] Cannot revoke accepted/expired/revoked invitations
- [ ] Confirmation modal shown
- [ ] On confirm:
  - [ ] Status changed to `revoked`
  - [ ] `revoked_at` and `revoked_by` set
- [ ] Success toast: "Invitation revoked"
- [ ] Invitee cannot use the link after revocation

### AC-4: Invitations List

- [ ] Shows all invitations for company (all statuses)
- [ ] Can search by name or email
- [ ] Can filter by status
- [ ] Status badges color-coded:
  - Pending: yellow/warning
  - Accepted: green/success
  - Expired: gray/muted
  - Revoked: red/destructive
- [ ] Shows sent date
- [ ] Shows expiration date for pending
- [ ] Actions available based on status

### AC-5: Accept Invitation

- [ ] Public page at `/accept-invitation?token=xxx`
- [ ] Invalid token shows error message
- [ ] Expired token shows expiration message
- [ ] Revoked token shows invalid message
- [ ] Valid token shows password form
- [ ] Email pre-filled and locked
- [ ] Password requirements enforced (8+ chars, upper, lower, number)
- [ ] Confirm password must match
- [ ] On submit:
  - [ ] Auth user created
  - [ ] User record created
  - [ ] Invitation marked accepted
  - [ ] User auto-signed in
  - [ ] Redirected to `/admin`

### AC-6: Duplicate Invitation Handling

- [ ] Inviting same email to same company when pending → Auto-resend
- [ ] Success toast: "Invitation resent" (not "sent")

### AC-7: Auto-Expiration

- [ ] Expired invitations show as "Expired" status
- [ ] Expiration check on page load (accept page)
- [ ] Scheduled job or trigger to update status (optional enhancement)

---

## API/Edge Functions

### Edge Function: Send Invitation

```typescript
// supabase/functions/send-invitation/index.ts
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

interface InvitationRequest {
  email: string;
  fullName: string;
  phone?: string;
  companyId: string;
}

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { email, fullName, phone, companyId } = await req.json() as InvitationRequest;
  
  // Get caller info
  const authHeader = req.headers.get('Authorization')!;
  const { data: { user: caller } } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  
  // Verify caller is super_admin
  if (caller?.app_metadata?.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }
  
  // Check if email already admin in this company
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('company_id', companyId)
    .single();
  
  if (existingUser) {
    return new Response(
      JSON.stringify({ error: 'User already exists in this company' }), 
      { status: 400 }
    );
  }
  
  // Check for pending invitation
  const { data: existingInvitation } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('email', email)
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .single();
  
  let invitation;
  let isResend = false;
  
  if (existingInvitation) {
    // Resend existing invitation
    isResend = true;
    const token = crypto.randomUUID();
    const tokenHash = await hashToken(token);
    
    const { data } = await supabaseAdmin
      .from('invitations')
      .update({
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        resent_count: existingInvitation.resent_count + 1,
        last_resent_at: new Date().toISOString(),
      })
      .eq('id', existingInvitation.id)
      .select()
      .single();
    
    invitation = { ...data, token };
  } else {
    // Create new invitation
    const token = crypto.randomUUID();
    const tokenHash = await hashToken(token);
    
    const { data } = await supabaseAdmin
      .from('invitations')
      .insert({
        email,
        full_name: fullName,
        phone,
        role: 'admin',
        company_id: companyId,
        token_hash: tokenHash,
        invited_by: caller.id,
      })
      .select()
      .single();
    
    invitation = { ...data, token };
  }
  
  // Get company name for email
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single();
  
  // Send email
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  await resend.emails.send({
    from: 'Driverly <noreply@driverly.com>',
    to: email,
    subject: `You've been invited to join ${company.name}`,
    html: `
      <p>You've been invited to join <strong>${company.name}</strong> as an Administrator.</p>
      <p>Click the button below to create your account:</p>
      <p>
        <a href="${Deno.env.get('APP_URL')}/accept-invitation?token=${invitation.token}" 
           style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Create Account
        </a>
      </p>
      <p>This invitation will expire on ${new Date(invitation.expires_at).toLocaleDateString()}.</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    `,
  });
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      isResend,
      invitation: { id: invitation.id, email: invitation.email } 
    }),
    { status: 200 }
  );
});

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}
```

### Edge Function: Accept Invitation

```typescript
// supabase/functions/accept-invitation/index.ts

interface AcceptRequest {
  token: string;
  password: string;
}

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { token, password } = await req.json() as AcceptRequest;
  
  // Hash token to find invitation
  const tokenHash = await hashToken(token);
  
  // Find invitation
  const { data: invitation, error } = await supabaseAdmin
    .from('invitations')
    .select('*, company:companies(name)')
    .eq('token_hash', tokenHash)
    .single();
  
  if (!invitation) {
    return new Response(
      JSON.stringify({ error: 'Invalid invitation' }), 
      { status: 400 }
    );
  }
  
  // Check status
  if (invitation.status === 'accepted') {
    return new Response(
      JSON.stringify({ error: 'Invitation already used', code: 'ALREADY_ACCEPTED' }), 
      { status: 400 }
    );
  }
  
  if (invitation.status === 'revoked') {
    return new Response(
      JSON.stringify({ error: 'Invitation has been revoked', code: 'REVOKED' }), 
      { status: 400 }
    );
  }
  
  // Check expiration
  if (new Date(invitation.expires_at) < new Date()) {
    // Update status to expired
    await supabaseAdmin
      .from('invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id);
    
    return new Response(
      JSON.stringify({ error: 'Invitation has expired', code: 'EXPIRED' }), 
      { status: 400 }
    );
  }
  
  // Create auth user
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    app_metadata: {
      role: invitation.role,
      company_id: invitation.company_id,
    },
    user_metadata: {
      full_name: invitation.full_name,
    },
  });
  
  if (authError) {
    return new Response(
      JSON.stringify({ error: authError.message }), 
      { status: 400 }
    );
  }
  
  // Create user record
  await supabaseAdmin.from('users').insert({
    id: authUser.user.id,
    email: invitation.email,
    full_name: invitation.full_name,
    phone: invitation.phone,
    role: invitation.role,
    company_id: invitation.company_id,
    status: 'active',
    invited_by: invitation.invited_by,
  });
  
  // Mark invitation as accepted
  await supabaseAdmin
    .from('invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_user_id: authUser.user.id,
    })
    .eq('id', invitation.id);
  
  // Sign in the user and return session
  const { data: session } = await supabaseAdmin.auth.signInWithPassword({
    email: invitation.email,
    password,
  });
  
  return new Response(
    JSON.stringify({ 
      success: true,
      session: session.session,
      user: authUser.user,
    }),
    { status: 200 }
  );
});
```

### Edge Function: Revoke Invitation

```typescript
// supabase/functions/revoke-invitation/index.ts

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { invitationId } = await req.json();
  
  // Get caller
  const authHeader = req.headers.get('Authorization')!;
  const { data: { user: caller } } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  
  if (caller?.app_metadata?.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }
  
  // Update invitation
  const { data, error } = await supabaseAdmin
    .from('invitations')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: caller.id,
    })
    .eq('id', invitationId)
    .eq('status', 'pending')
    .select()
    .single();
  
  if (error || !data) {
    return new Response(
      JSON.stringify({ error: 'Cannot revoke this invitation' }), 
      { status: 400 }
    );
  }
  
  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
```

### Queries

```typescript
// Get invitations for company
const { data: invitations } = await supabase
  .from('invitations')
  .select(`
    *,
    invited_by_user:users!invited_by(full_name)
  `)
  .eq('company_id', companyId)
  .order('created_at', { ascending: false });

// Validate token (for accept page)
const { data: invitation } = await supabase
  .from('invitations')
  .select(`
    id,
    email,
    full_name,
    status,
    expires_at,
    company:companies(name, logo_url)
  `)
  .eq('token_hash', hashedToken)
  .single();
```

---

## Business Rules

1. **Expiration:** Invitations expire 7 days after creation/resend (hardcoded)
2. **Resend extends:** Resending generates new token and resets 7-day timer
3. **One pending per email+company:** Cannot have multiple pending invitations for same email to same company
4. **Multi-company allowed:** Same email can be admin of multiple companies
5. **Super Admin only:** Only super_admin role can send admin invitations
6. **Token security:** Tokens are hashed before storage; raw token only in email link

---

## Dependencies

- SA-001: Company Management (company must exist)
- `03-AUTHENTICATION.md` - JWT claims setup
- Resend (or similar) for transactional email
- Supabase Edge Functions

---

## Out of Scope

- Coordinator invitations (see AD-010)
- Bulk invitations
- Custom email templates per company
- Invitation link preview (social meta tags)
- Notification to Super Admin when invitation accepted

---

## Testing Requirements

### Integration Tests

```typescript
// tests/integration/super-admin/admin-invitations.test.ts

describe('SA-002: Admin Invitations', () => {
  describe('AC-1: Send Invitation', () => {
    it('creates invitation with pending status');
    it('sends email to invitee');
    it('rejects if email already admin in company');
    it('allows if email exists in different company');
  });
  
  describe('AC-2: Resend Invitation', () => {
    it('updates token and expiration');
    it('increments resent_count');
    it('sends new email');
  });
  
  describe('AC-3: Revoke Invitation', () => {
    it('updates status to revoked');
    it('prevents revoked token from being used');
  });
  
  describe('AC-5: Accept Invitation', () => {
    it('creates auth user with correct claims');
    it('creates user record');
    it('marks invitation as accepted');
    it('rejects expired token');
    it('rejects revoked token');
    it('rejects already-used token');
  });
  
  describe('AC-6: Duplicate Handling', () => {
    it('auto-resends when inviting existing pending email');
  });
});
```

### E2E Tests

```typescript
// tests/e2e/super-admin/admin-invitations.spec.ts

test('super admin can invite admin to company', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/companies/test-company');
  await page.click('[data-tab="invitations"]');
  await page.click('[data-testid="invite-button"]');
  await page.fill('[name="fullName"]', 'Test Admin');
  await page.fill('[name="email"]', 'testadmin@test.com');
  await page.click('[data-testid="send-invitation"]');
  await expect(page.locator('[data-testid="toast"]')).toContainText('Invitation sent');
});

test('invited admin can accept invitation', async ({ page }) => {
  const token = await createTestInvitation();
  await page.goto(`/accept-invitation?token=${token}`);
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.fill('[name="confirmPassword"]', 'SecurePass123!');
  await page.click('[data-testid="create-account"]');
  await expect(page).toHaveURL('/admin');
});
```

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-16 | Initial spec | - |
