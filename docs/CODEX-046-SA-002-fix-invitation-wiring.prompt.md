# CODEX-046: SA-002 Fix Invitation Flow Wiring

> **Bug-fix task:** The invitation system has never worked end-to-end. The hooks layer and
> the service layer were written with mismatched function names, parameter shapes, return
> types, and a missing type definition. Every invitation attempt fails silently at runtime.

---

## Prerequisites

Before starting:
1. Read every file listed in **Required Reading** below
2. Understand that the hooks (`useInvitations.ts`) are what UI components call, and the service (`invitations.ts`) is what actually talks to Supabase
3. The goal is to make these two layers agree — and to make the DB insert actually succeed

---

## Required Reading

```
src/hooks/useInvitations.ts                          # Hooks layer (what the UI calls)
src/services/invitations.ts                          # Service layer (what talks to Supabase)
src/types/invitation.ts                              # Type definitions
src/components/features/super-admin/InviteAdminModal.tsx   # Modal that sends invitations
src/components/features/super-admin/CompanyInvitationsTab.tsx  # Tab that lists invitations
src/components/features/super-admin/CompanyAdminsTab.tsx   # Also uses InviteAdminModal
src/pages/auth/AcceptInvitation.tsx                   # Public accept-invitation page
supabase/functions/send-invitation/index.ts          # Edge function: send email
supabase/functions/resend-invitation/index.ts        # Edge function: resend email
supabase/functions/accept-invitation/index.ts        # Edge function: accept + create user
supabase/migrations/001_core_tables.sql              # Original invitations table schema
supabase/migrations/005_update_invitations_for_sa002.sql  # Added token_hash, resend tracking
src/services/authScope.ts                            # getCompanyScope helper
```

---

## Bug Inventory

There are **6 distinct bugs** that must all be fixed together. They are all in the
hooks-to-service wiring — the UI components and edge functions are fine.

### Bug 1: Function name mismatches (hooks → service)

The hooks call functions that do not exist on the service module. At runtime these are
`undefined`, so calling them throws `"...is not a function"`.

| Hook calls                              | Service actually exports       |
|-----------------------------------------|--------------------------------|
| `invitationsService.getCompanyInvitations(companyId)` | `getInvitations(companyId?)` |
| `invitationsService.sendInvitation(companyId, data)`  | `createInvitation(data)`     |
| `invitationsService.validateInvitationToken(token)`   | *(does not exist)*           |

### Bug 2: Missing type `InvitationWithCompany`

`src/services/invitations.ts` line 3 imports `InvitationWithCompany` from `@/types/invitation`,
but that type is not defined anywhere. The types file defines `Invitation`, `InvitationWithInviter`,
`InviteAdminFormData`, and `InvitationValidation` — but not `InvitationWithCompany`.

### Bug 3: Parameter shape mismatch on create/send

The hook `useSendInvitation` passes `{ companyId: string, data: InviteAdminFormData }` where
`InviteAdminFormData` is `{ full_name, email, phone? }`.

The service's `createInvitation` expects `CreateInvitationData` which is `{ email, role, company_id }`.

Missing from the service insert:
- `full_name` — the DB column is `NOT NULL`, so the insert would fail even if the function name matched
- `phone` — nullable in DB, but never passed through
- `invited_by` — nullable, but should be set to the current user's ID
- `role` is hardcoded in `CreateInvitationData` but should default to `'admin'` when inviting from the super-admin or admin UI

### Bug 4: DB column `token` is `NOT NULL` but service doesn't insert it

The `invitations` table (001_core_tables.sql line 49) defines:
```sql
token VARCHAR(255) UNIQUE NOT NULL
```

But `createInvitation` generates a token client-side and only passes it to the edge function —
it never inserts it into the row. The insert will fail with a NOT NULL violation.

**Fix option A (recommended):** Make `token` nullable with a migration, since the system
actually uses `token_hash` (added in migration 005) for lookups. The plaintext token should
never be stored — only the hash.

**Fix option B:** Insert the token in the row. Less secure since it stores plaintext tokens.

### Bug 5: Return type mismatches on resend/revoke

Both `resendInvitation` and `revokeInvitation` in the service return `Promise<void>`, but
their `onSuccess` handlers in the hooks try to access `invitation.company_id` on the return
value to invalidate the right query cache.

The hooks need the `company_id` to know which query to invalidate. Options:
- Have the service return the updated invitation object
- Or pass `companyId` into the mutation and use it in `onSuccess` (same pattern as `useSendInvitation`)

### Bug 6: Missing parameters on revoke and accept

| Hook calls                                         | Service expects                                |
|----------------------------------------------------|------------------------------------------------|
| `revokeInvitation(invitationId)`                   | `revokeInvitation(invitationId, revokedBy)`    |
| `acceptInvitation({ token, password })`            | `acceptInvitation(token, password, fullName)`   |

The `revokedBy` user ID and the `fullName` for accept are not being passed through.

---

## Implementation Plan

### Step 1: Add missing type `InvitationWithCompany`

In `src/types/invitation.ts`, add:

```typescript
export interface InvitationWithCompany extends Invitation {
  company: {
    id: string;
    name: string;
    logo_url: string | null;
    primary_color: string;
  } | null;
}
```

### Step 2: Create migration to make `token` nullable

Create `supabase/migrations/036_fix_invitation_token_nullable.sql`:

```sql
-- The plaintext token should never be stored. Only token_hash is used for lookups.
-- Making token nullable so the insert can succeed without storing plaintext secrets.
ALTER TABLE invitations ALTER COLUMN token DROP NOT NULL;
ALTER TABLE invitations ALTER COLUMN token SET DEFAULT NULL;
```

### Step 3: Fix `src/services/invitations.ts`

Rename and fix the exported functions so the hooks can call them correctly:

1. **Rename** `getInvitations` → `getCompanyInvitations` (or add a named export alias)
2. **Replace** `createInvitation` with `sendInvitation(companyId, data)` that:
   - Accepts `InviteAdminFormData` (full_name, email, phone)
   - Gets the current user ID via `supabase.auth.getUser()` for `invited_by`
   - Defaults `role` to `'admin'`
   - Inserts `full_name`, `phone`, `email`, `role`, `company_id`, `invited_by`, `status`, `expires_at`
   - Does NOT insert `token` (it stays null; only `token_hash` is set by the edge function)
   - Returns the created invitation (with company join) so the caller has `company_id`
   - Detects duplicate email+company_id with status='pending' and handles re-send gracefully
3. **Fix** `resendInvitation` to return the invitation object (or at minimum `{ company_id }`)
4. **Fix** `revokeInvitation` to:
   - Get the current user ID internally (don't require it as a parameter)
   - Return the invitation object (or at minimum `{ company_id }`)
5. **Add** `validateInvitationToken(token: string)` that hashes the token and looks up
   the invitation by `token_hash`, returning an `InvitationValidation` object
6. **Fix** `acceptInvitation` — the `AcceptInvitation.tsx` page already collects `fullName`
   in its own form and calls the edge function directly, so the hook version just needs to
   pass all three params through. Check `AcceptInvitation.tsx` to see if it uses the hook
   or direct calls — if direct calls, the hook fix is still needed for consistency.

### Step 4: Fix `src/hooks/useInvitations.ts`

After the service is fixed, the hooks should mostly work. But verify:

1. `useResendInvitation` — update `onSuccess` to handle the new return shape
2. `useRevokeInvitation` — update `onSuccess` to handle the new return shape (no longer needs `revokedBy` param)
3. `useAcceptInvitation` — pass `fullName` through: `{ token, password, fullName }`

### Step 5: Verify `InviteAdminModal.tsx`

The modal's `onSubmit` does:
```typescript
const result = await sendInvitation.mutateAsync({ companyId, data });
```

It checks `result.isResend` to show "Invitation resent" vs "Invitation sent". Make sure the
service returns an object with `isResend: boolean` when it detects a duplicate pending invitation
for the same email+company and resends instead of creating a new one.

---

## Existing Patterns to Follow

Look at how other services in the codebase are structured for reference:

```
src/services/drivers.ts      # CRUD pattern with getCompanyScope
src/services/vehicles.ts     # Similar pattern
src/services/brokers.ts      # Similar pattern
src/hooks/useDrivers.ts      # Hook-to-service wiring pattern
```

These all follow the pattern of:
- Service gets `companyId` from `getCompanyScope()` when not provided
- Hooks pass `companyId` explicitly for super-admin context
- Mutations invalidate queries using the `companyId` from the result

---

## Testing Checklist

After implementing, verify manually:

1. **Send invitation:** Open super-admin → Companies → Acme → Invitations tab → Invite Admin → fill in name/email → Send. Verify:
   - No console errors
   - Success toast appears
   - Invitation appears in the table immediately
   - Row exists in `invitations` table in Supabase with correct `full_name`, `email`, `company_id`, `invited_by`, `status='pending'`
   - `token` column is null, `token_hash` column is populated (set by edge function)

2. **List invitations:** The invitations tab loads and shows all invitations for the company

3. **Resend invitation:** Click the dropdown on a pending invitation → Resend → verify toast and that `resend_count` increments

4. **Revoke invitation:** Click the dropdown on a pending invitation → Revoke → verify status changes to 'revoked'

5. **Duplicate handling:** Try inviting the same email again for the same company → should resend rather than create a duplicate

---

## Files You Will Modify

```
src/services/invitations.ts          # Major: rename functions, fix params, fix returns
src/hooks/useInvitations.ts          # Moderate: fix onSuccess handlers, fix param shapes
src/types/invitation.ts              # Minor: add InvitationWithCompany type
supabase/migrations/                 # New: 036_fix_invitation_token_nullable.sql
```

## Files You Must NOT Modify

```
src/components/features/super-admin/InviteAdminModal.tsx      # Already correct
src/components/features/super-admin/CompanyInvitationsTab.tsx  # Already correct
supabase/functions/send-invitation/index.ts                    # Already correct
supabase/functions/resend-invitation/index.ts                  # Already correct
supabase/functions/accept-invitation/index.ts                  # Already correct
```

---

## Constraints

- Do NOT change the database schema beyond making `token` nullable
- Do NOT change the edge functions
- Do NOT change the UI components unless absolutely necessary (they are already correct)
- DO follow the existing service patterns (see `src/services/drivers.ts` for reference)
- DO use `getCompanyScope()` for auth context where needed
- DO use `supabase.auth.getUser()` to get the current user's ID for `invited_by` and `revoked_by`
