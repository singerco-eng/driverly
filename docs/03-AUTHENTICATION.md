# Driverly Platform - Authentication

> **Last Updated:** 2026-01-16  
> **Status:** Draft - Pending Review

---

## Overview

Driverly uses **Supabase Auth** for all authentication. This document defines auth flows, JWT claims structure, role-based permissions, and implementation patterns.

### Key Principles

1. **Single auth system** - All roles use the same Supabase Auth instance
2. **JWT claims for authorization** - Role and tenant info embedded in tokens
3. **RLS as enforcement** - Frontend is UX only; RLS is the security boundary
4. **Invitation-based onboarding** - Admins and coordinators are invited, drivers apply

---

## Roles & Permissions Overview

| Role | Scope | Created By | Auth Flow |
|------|-------|------------|-----------|
| `super_admin` | Platform-wide | Manual/seed | Direct login |
| `admin` | Single tenant | Super Admin | Invitation |
| `coordinator` | Single tenant | Admin | Invitation |
| `driver` | Single tenant | Self (apply) | Application → Approval |

---

## JWT Claims Structure

### Custom Claims Location

Supabase stores custom claims in `auth.users.raw_app_meta_data`. These are automatically included in the JWT.

```json
{
  "aud": "authenticated",
  "exp": 1705420800,
  "sub": "user-uuid-here",
  "email": "user@example.com",
  "app_metadata": {
    "role": "admin",
    "company_id": "company-uuid-here",
    "driver_id": null
  },
  "user_metadata": {
    "full_name": "John Smith"
  }
}
```

### Claims by Role

| Role | `role` | `company_id` | `driver_id` |
|------|--------|--------------|-------------|
| Super Admin | `super_admin` | `null` | `null` |
| Admin | `admin` | `<uuid>` | `null` |
| Coordinator | `coordinator` | `<uuid>` | `null` |
| Driver | `driver` | `<uuid>` | `<uuid>` |

### Accessing Claims in Code

**Frontend (TypeScript):**
```typescript
import { supabase } from '@/lib/supabase';

async function getUserClaims() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return null;
  
  const claims = session.user.app_metadata;
  return {
    role: claims.role as 'super_admin' | 'admin' | 'coordinator' | 'driver',
    companyId: claims.company_id as string | null,
    driverId: claims.driver_id as string | null,
  };
}
```

**RLS Policies (SQL):**
```sql
-- Get role
(auth.jwt() -> 'app_metadata' ->> 'role')

-- Get company_id
(auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid

-- Get driver_id
(auth.jwt() -> 'app_metadata' ->> 'driver_id')::uuid
```

**Edge Functions (Deno):**
```typescript
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  const companyId = user?.app_metadata?.company_id;
  
  // ... use claims
});
```

---

## Auth Flows

### Flow 1: Super Admin Login

Super admins are created manually or via seed script. They log in directly.

```
┌─────────────────────────────────────────────────────────────┐
│  1. Super Admin navigates to /login                         │
│  2. Enters email + password                                 │
│  3. Supabase Auth validates credentials                     │
│  4. JWT returned with role: 'super_admin'                   │
│  5. Frontend routes to /super-admin/dashboard               │
└─────────────────────────────────────────────────────────────┘
```

**No special flow** - standard email/password login.

---

### Flow 2: Admin Invitation

Admins are invited by Super Admin when creating a company.

```
┌─────────────────────────────────────────────────────────────┐
│  SUPER ADMIN SIDE                                           │
├─────────────────────────────────────────────────────────────┤
│  1. Super Admin creates company                             │
│  2. Super Admin enters admin email                          │
│  3. System creates invitation record                        │
│  4. System sends invitation email with magic link           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  INVITED ADMIN SIDE                                         │
├─────────────────────────────────────────────────────────────┤
│  5. Admin clicks magic link in email                        │
│  6. Lands on /accept-invitation?token=xxx                   │
│  7. Sets password, completes profile                        │
│  8. System creates user with role='admin', company_id set   │
│  9. Redirected to /admin/dashboard                          │
└─────────────────────────────────────────────────────────────┘
```

**Database: `invitations` table**

```sql
CREATE TABLE invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invitation details
  email           text NOT NULL,
  role            text NOT NULL CHECK (role IN ('admin', 'coordinator')),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Token (hashed)
  token_hash      text NOT NULL,
  
  -- Status
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  
  -- Expiration
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  
  -- Tracking
  invited_by      uuid NOT NULL REFERENCES users(id),
  accepted_at     timestamptz,
  accepted_user_id uuid REFERENCES users(id),
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitations_token_hash ON invitations(token_hash);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_company_id ON invitations(company_id);
```

**Invitation Flow Implementation:**

```typescript
// 1. Create invitation (Super Admin / Admin)
async function createInvitation(email: string, role: 'admin' | 'coordinator', companyId: string) {
  // Generate secure token
  const token = crypto.randomUUID();
  const tokenHash = await hashToken(token);
  
  // Store invitation
  const { data: invitation } = await supabase
    .from('invitations')
    .insert({
      email,
      role,
      company_id: companyId,
      token_hash: tokenHash,
      invited_by: currentUser.id,
    })
    .select()
    .single();
  
  // Send email with magic link
  await sendInvitationEmail(email, {
    invitationUrl: `${APP_URL}/accept-invitation?token=${token}`,
    companyName: company.name,
    role,
  });
  
  return invitation;
}

// 2. Accept invitation
async function acceptInvitation(token: string, password: string, profile: UserProfile) {
  const tokenHash = await hashToken(token);
  
  // Verify invitation
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (!invitation) throw new Error('Invalid or expired invitation');
  
  // Create auth user with Supabase Admin API
  const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    app_metadata: {
      role: invitation.role,
      company_id: invitation.company_id,
    },
    user_metadata: {
      full_name: profile.fullName,
    },
  });
  
  // Create user record
  await supabase.from('users').insert({
    id: authUser.user.id,
    email: invitation.email,
    role: invitation.role,
    company_id: invitation.company_id,
    full_name: profile.fullName,
    invited_by: invitation.invited_by,
  });
  
  // Mark invitation accepted
  await supabase
    .from('invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_user_id: authUser.user.id,
    })
    .eq('id', invitation.id);
  
  // Sign in the user
  await supabase.auth.signInWithPassword({
    email: invitation.email,
    password,
  });
}
```

---

### Flow 3: Coordinator Invitation

Same as Admin invitation, but initiated by Admin instead of Super Admin.

```
Admin creates invitation → Coordinator receives email → Accepts → role='coordinator'
```

**Permission:** Only `admin` role can invite coordinators (not coordinators themselves).

---

### Flow 4: Driver Application & Onboarding

Drivers are NOT invited. They apply, and admins approve them.

```
┌─────────────────────────────────────────────────────────────┐
│  DRIVER APPLICATION                                         │
├─────────────────────────────────────────────────────────────┤
│  1. Driver navigates to company application page            │
│     e.g., /apply/acme-transport                             │
│  2. Enters email, creates password                          │
│  3. Supabase Auth creates user (role='driver', status='pending') │
│  4. Driver completes application form                       │
│     - Personal info                                         │
│     - Employment type (W2/1099)                             │
│     - Vehicle info (if 1099)                                │
│     - Initial credentials                                   │
│  5. Application submitted for review                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  ADMIN REVIEW                                               │
├─────────────────────────────────────────────────────────────┤
│  6. Admin sees application in queue                         │
│  7. Reviews submitted info and credentials                  │
│  8. Approves or rejects application                         │
│     - Approve: driver.application_status = 'approved'       │
│     - Reject: driver.application_status = 'rejected'        │
│  9. Driver notified of decision                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  DRIVER ACTIVATION (if approved)                            │
├─────────────────────────────────────────────────────────────┤
│  10. Driver can now access full portal                      │
│  11. May need to complete additional credentials            │
│  12. Once all required credentials approved:                │
│      driver.status = 'active'                               │
└─────────────────────────────────────────────────────────────┘
```

**Application Page Routing:**

Each company has a public application page at `/apply/[company-slug]`.

```typescript
// pages/apply/[slug].tsx
export default function DriverApplicationPage({ params }: { params: { slug: string } }) {
  // Fetch company by slug (public endpoint)
  const { data: company } = useQuery({
    queryKey: ['company', params.slug],
    queryFn: () => getCompanyBySlug(params.slug),
  });
  
  if (!company || company.status !== 'active') {
    return <NotFound />;
  }
  
  return <DriverApplicationForm company={company} />;
}
```

**Driver Sign-Up Implementation:**

```typescript
async function submitDriverApplication(
  companyId: string,
  email: string,
  password: string,
  applicationData: DriverApplicationData
) {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: applicationData.fullName,
      },
    },
  });
  
  if (authError) throw authError;
  
  // 2. Set app_metadata via Edge Function (requires service role)
  // Called automatically via database trigger or edge function
  // Sets: role='driver', company_id, driver_id
  
  // 3. Create user record
  const { data: user } = await supabase.from('users').insert({
    id: authData.user.id,
    email,
    role: 'driver',
    company_id: companyId,
    full_name: applicationData.fullName,
    phone: applicationData.phone,
    status: 'pending',
  }).select().single();
  
  // 4. Create driver record
  const { data: driver } = await supabase.from('drivers').insert({
    user_id: authData.user.id,
    company_id: companyId,
    employment_type: applicationData.employmentType,
    date_of_birth: applicationData.dateOfBirth,
    license_number: applicationData.licenseNumber,
    license_state: applicationData.licenseState,
    license_expiration: applicationData.licenseExpiration,
    emergency_contact_name: applicationData.emergencyContact.name,
    emergency_contact_phone: applicationData.emergencyContact.phone,
    emergency_contact_relation: applicationData.emergencyContact.relation,
    application_status: 'pending',
    application_date: new Date().toISOString(),
  }).select().single();
  
  // 5. Update auth user with driver_id
  // Done via trigger (see below)
  
  // 6. Create initial vehicle if 1099 and provided
  if (applicationData.employmentType === '1099' && applicationData.vehicle) {
    await createDriverVehicle(driver.id, companyId, applicationData.vehicle);
  }
  
  return { user, driver };
}
```

---

## Database Triggers for JWT Claims

### Trigger: Set Claims on User Creation

```sql
-- Function to set app_metadata
CREATE OR REPLACE FUNCTION set_user_claims()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users app_metadata based on users table
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_build_object(
    'role', NEW.role,
    'company_id', NEW.company_id,
    'driver_id', (
      SELECT id FROM drivers WHERE user_id = NEW.id
    )
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on users table
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_user_claims();

-- Trigger on users update (role change)
CREATE TRIGGER on_user_updated
  AFTER UPDATE OF role, company_id ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_user_claims();
```

### Trigger: Set driver_id When Driver Created

```sql
CREATE OR REPLACE FUNCTION set_driver_claim()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users app_metadata with driver_id
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('driver_id', NEW.id)
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_driver_created
  AFTER INSERT ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION set_driver_claim();
```

---

## Permission Matrix

### Super Admin Permissions

| Resource | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| Companies | ✅ | ✅ All | ✅ | ✅ |
| Company Admins | ✅ Invite | ✅ All | ✅ | ✅ |
| Billing | ✅ | ✅ | ✅ | ✅ |
| Platform Settings | ✅ | ✅ | ✅ | - |
| All tenant data | - | ✅ Read-only | - | - |

### Admin Permissions

| Resource | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| Own Company | - | ✅ | ✅ Profile | - |
| Coordinators | ✅ Invite | ✅ Company | ✅ | ✅ |
| Drivers | - | ✅ Company | ✅ | ✅ Deactivate |
| Driver Applications | - | ✅ | ✅ Approve/Reject | - |
| Vehicles | ✅ | ✅ Company | ✅ | ✅ |
| Vehicle Assignments | ✅ | ✅ Company | ✅ | ✅ |
| Brokers | ✅ | ✅ Company | ✅ | ✅ |
| Credential Types | ✅ | ✅ Company | ✅ | ✅ |
| Driver Credentials | - | ✅ Company | ✅ Review | - |
| Vehicle Credentials | - | ✅ Company | ✅ Review | - |
| Rates | ✅ | ✅ Company | ✅ | ✅ |
| Trip Manifests | ✅ Upload | ✅ Company | ✅ | ✅ |
| Messages | ✅ | ✅ Company | - | - |
| Company Settings | - | ✅ | ✅ | - |

### Coordinator Permissions

| Resource | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| Own Profile | - | ✅ | ✅ Limited | - |
| Drivers | - | ✅ Company | ✅ Limited | - |
| Driver Applications | - | ✅ | ❌ | - |
| Vehicles | - | ✅ Company | - | - |
| Brokers | - | ✅ Company | - | - |
| Credentials | - | ✅ Company | ⚠️ TBD | - |
| Messages | ✅ | ✅ Company | - | - |
| Rates | - | ❌ | - | - |
| Team/Invitations | - | - | - | - |

### Driver Permissions

| Resource | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| Own Profile | - | ✅ | ✅ | - |
| Own Vehicles | ✅ | ✅ | ✅ | ✅ |
| Assigned Vehicles | - | ✅ | - | - |
| Own Driver Credentials | ✅ Submit | ✅ | ✅ Pending | - |
| Own Vehicle Credentials | ✅ Submit | ✅ | ✅ Pending | - |
| Own Availability | ✅ | ✅ | ✅ | ✅ |
| Own Trips | - | ✅ | ✅ Accept/Reject | - |
| Own Payments | - | ✅ | - | - |
| Messages (own threads) | ✅ Reply | ✅ | - | - |
| Brokers | - | ✅ Active only | - | - |

---

## Session Management

### Session Duration

```typescript
// Supabase client configuration
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

**Default Supabase settings:**
- Access token: 1 hour
- Refresh token: 1 week (configurable in Supabase dashboard)

### Session Refresh

React Query handles session refresh automatically:

```typescript
// hooks/useAuth.ts
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  return {
    session,
    user: session?.user ?? null,
    loading,
    role: session?.user?.app_metadata?.role ?? null,
    companyId: session?.user?.app_metadata?.company_id ?? null,
    driverId: session?.user?.app_metadata?.driver_id ?? null,
  };
}
```

### Logout

```typescript
async function logout() {
  await supabase.auth.signOut();
  // Router will redirect to /login via auth state change
}
```

---

## Password Management

### Password Requirements

```typescript
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false, // Optional
};

// Zod schema
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');
```

### Password Reset Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. User clicks "Forgot Password" on login page             │
│  2. Enters email address                                    │
│  3. System sends password reset email                       │
│  4. User clicks link in email                               │
│  5. Lands on /reset-password?token=xxx                      │
│  6. Enters new password (validated against requirements)    │
│  7. Password updated, redirected to login                   │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// Request reset
async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP_URL}/reset-password`,
  });
  
  if (error) throw error;
}

// Complete reset (on /reset-password page)
async function completePasswordReset(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  
  if (error) throw error;
}
```

### Admin Password Reset (Super Admin)

Super Admins can trigger password reset for any user:

```typescript
// Edge function: admin-reset-password
async function adminResetPassword(userId: string) {
  // Verify caller is super_admin
  const { data: { user: caller } } = await supabase.auth.getUser();
  if (caller?.app_metadata?.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }
  
  // Get user email
  const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId);
  
  // Send reset email
  await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: targetUser.user.email,
  });
}
```

---

## Route Protection

### Auth Guard Component

```typescript
// components/AuthGuard.tsx
interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles: ('super_admin' | 'admin' | 'coordinator' | 'driver')[];
  requireApprovedDriver?: boolean;
}

export function AuthGuard({ 
  children, 
  allowedRoles,
  requireApprovedDriver = false 
}: AuthGuardProps) {
  const { session, loading, role } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (loading) return;
    
    if (!session) {
      router.replace('/login');
      return;
    }
    
    if (!allowedRoles.includes(role)) {
      router.replace('/unauthorized');
      return;
    }
    
    // Additional check for drivers
    if (role === 'driver' && requireApprovedDriver) {
      // Check driver application status
      // Redirect to onboarding if not approved
    }
  }, [session, loading, role, router, allowedRoles, requireApprovedDriver]);
  
  if (loading) return <LoadingSpinner />;
  if (!session || !allowedRoles.includes(role)) return null;
  
  return <>{children}</>;
}
```

### Route Configuration

```typescript
// App.tsx or routes configuration
<Routes>
  {/* Public */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/apply/:slug" element={<DriverApplicationPage />} />
  <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
  <Route path="/reset-password" element={<ResetPasswordPage />} />
  
  {/* Super Admin */}
  <Route path="/super-admin/*" element={
    <AuthGuard allowedRoles={['super_admin']}>
      <SuperAdminLayout />
    </AuthGuard>
  }>
    <Route index element={<SuperAdminDashboard />} />
    <Route path="companies/*" element={<CompaniesRoutes />} />
    <Route path="settings" element={<PlatformSettings />} />
  </Route>
  
  {/* Admin */}
  <Route path="/admin/*" element={
    <AuthGuard allowedRoles={['admin', 'coordinator']}>
      <AdminLayout />
    </AuthGuard>
  }>
    <Route index element={<AdminDashboard />} />
    <Route path="drivers/*" element={<DriversRoutes />} />
    <Route path="vehicles/*" element={<VehiclesRoutes />} />
    {/* ... */}
  </Route>
  
  {/* Driver */}
  <Route path="/driver/*" element={
    <AuthGuard allowedRoles={['driver']} requireApprovedDriver>
      <DriverLayout />
    </AuthGuard>
  }>
    <Route index element={<DriverDashboard />} />
    <Route path="profile" element={<DriverProfile />} />
    {/* ... */}
  </Route>
  
  {/* Driver Onboarding (pending drivers) */}
  <Route path="/driver/onboarding/*" element={
    <AuthGuard allowedRoles={['driver']}>
      <DriverOnboardingLayout />
    </AuthGuard>
  }>
    <Route index element={<OnboardingStatus />} />
    <Route path="credentials" element={<SubmitCredentials />} />
  </Route>
</Routes>
```

### Role-Based Redirect After Login

```typescript
// hooks/useAuthRedirect.ts
export function useAuthRedirect() {
  const { session, role } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!session) return;
    
    const redirectMap: Record<string, string> = {
      super_admin: '/super-admin',
      admin: '/admin',
      coordinator: '/admin',
      driver: '/driver',
    };
    
    const destination = redirectMap[role] || '/login';
    router.replace(destination);
  }, [session, role, router]);
}

// Usage in LoginPage
function LoginPage() {
  useAuthRedirect(); // Redirects if already logged in
  // ... login form
}
```

---

## Email Templates

Supabase Auth email templates should be customized in the Supabase dashboard.

### Required Templates

| Template | Purpose | Variables |
|----------|---------|-----------|
| Confirm signup | Email verification (if enabled) | `{{ .ConfirmationURL }}` |
| Invite user | Admin/Coordinator invitation | `{{ .ConfirmationURL }}` |
| Reset password | Password recovery | `{{ .ConfirmationURL }}` |
| Magic link | Passwordless login (if used) | `{{ .ConfirmationURL }}` |

### Custom Email Sending (Alternative)

For more control, use Edge Functions with a transactional email service:

```typescript
// Edge function: send-invitation-email
import { Resend } from 'resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  const { email, invitationUrl, companyName, role } = await req.json();
  
  await resend.emails.send({
    from: 'Driverly <noreply@driverly.com>',
    to: email,
    subject: `You've been invited to join ${companyName}`,
    html: `
      <h1>Welcome to ${companyName}</h1>
      <p>You've been invited to join as a ${role}.</p>
      <a href="${invitationUrl}">Accept Invitation</a>
    `,
  });
  
  return new Response(JSON.stringify({ success: true }));
});
```

---

## Security Considerations

### Never Trust the Frontend

```typescript
// ❌ BAD: Frontend sets role
await supabase.from('users').insert({
  role: 'admin', // User could manipulate this!
});

// ✅ GOOD: Role set server-side via Edge Function or trigger
// Frontend only sends allowed data, role determined by context
```

### RLS is the Security Boundary

Even if frontend checks are bypassed, RLS prevents unauthorized access:

```sql
-- User cannot elevate their own role
CREATE POLICY "Users cannot change own role"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    role = (SELECT role FROM users WHERE id = auth.uid())
  );
```

### Validate Invitation Tokens Server-Side

```typescript
// Always verify invitation on the server
// Never trust token validation only on frontend
```

### Audit Sensitive Actions

```typescript
// Log authentication events
// ⚠️ TBD: Implement audit_logs table and triggers
```

---

## Testing Authentication

### Test Users (Development)

Create test users for each role via seed script:

```sql
-- seed.sql (run with service role)
-- Super Admin
INSERT INTO auth.users (id, email, encrypted_password, raw_app_meta_data)
VALUES (
  'sa-test-uuid',
  'superadmin@test.com',
  crypt('Test123!', gen_salt('bf')),
  '{"role": "super_admin"}'::jsonb
);

-- Admin (with company)
-- ... etc
```

### E2E Auth Tests

```typescript
// tests/auth.spec.ts
import { test, expect } from '@playwright/test';

test('admin can login and sees admin dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@test.com');
  await page.fill('[name="password"]', 'Test123!');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/admin');
  await expect(page.locator('h1')).toContainText('Dashboard');
});

test('driver cannot access admin routes', async ({ page }) => {
  // Login as driver
  await loginAsDriver(page);
  
  // Try to access admin route
  await page.goto('/admin');
  
  // Should be redirected
  await expect(page).toHaveURL('/unauthorized');
});
```

---

## Checklist for Implementation

### Phase 0 (Foundation)

- [ ] Configure Supabase Auth settings
- [ ] Create `invitations` table
- [ ] Create JWT claims triggers
- [ ] Set up email templates
- [ ] Implement `useAuth` hook

### Phase 1 (Super Admin)

- [ ] Super Admin login flow
- [ ] Admin invitation flow
- [ ] Password reset flow

### Phase 2 (Admin)

- [ ] Admin login (post-invitation)
- [ ] Coordinator invitation flow
- [ ] Admin route protection

### Phase 3 (Driver)

- [ ] Driver application/signup flow
- [ ] Driver onboarding routing
- [ ] Driver route protection

---

## Change Log

| Date | Change | Spec Reference |
|------|--------|----------------|
| 2026-01-16 | Initial authentication spec | - |
