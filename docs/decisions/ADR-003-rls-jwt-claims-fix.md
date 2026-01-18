# ADR-003: RLS JWT Claims Path Fix

## Status
Accepted

## Context

The initial database migration (`001_core_tables.sql`) implemented RLS policies that checked user roles using an incorrect JWT path:

```sql
-- Incorrect (original)
USING ((auth.jwt() ->> 'role') = 'super_admin')
```

This caused all INSERT, UPDATE, and DELETE operations to fail for authenticated users because:

1. Supabase stores custom claims in `app_metadata`, not at the JWT root
2. The correct path is `auth.jwt() -> 'app_metadata' ->> 'role'`
3. Without the correct path, RLS policies evaluated to `false`, blocking all mutations

**Impact:**
- Super admins could not create companies
- No users could perform write operations on protected tables
- Only SELECT operations worked (for users' own profiles via `auth.uid()`)

## Decision

We created migration `004_fix_rls_jwt_claims.sql` that:

1. **Drops all incorrect RLS policies** on `companies`, `users`, and `invitations` tables

2. **Recreates policies with correct `app_metadata` path:**
   ```sql
   -- Correct path
   USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
   USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid)
   ```

3. **Adds database triggers** to automatically sync JWT claims when `users` table changes:
   - `on_user_created`: Sets `app_metadata` when user is inserted
   - `on_user_updated`: Updates `app_metadata` when role or company changes

4. **Provides a super admin setup script** (`scripts/create-super-admin.mjs`) that:
   - Uses Supabase Admin API to create users with proper `app_metadata`
   - Creates matching record in `users` table
   - Can update existing users to super admin role

## Consequences

### Positive
- RLS policies now correctly evaluate role-based access
- Super admins can create, update, and delete companies
- Company-scoped users can access their tenant data
- JWT claims automatically sync when user records change
- Easy super admin setup via provided script

### Negative
- Requires running migration `004` to fix existing deployments
- Super admin must be created via script (not regular signup)
- If migration fails mid-way, manual cleanup may be needed

### Migration Path for Existing Deployments

1. Apply migration:
   ```bash
   node scripts/apply-migration.mjs supabase/migrations/004_fix_rls_jwt_claims.sql
   ```

2. Create/update super admin:
   ```bash
   node scripts/create-super-admin.mjs admin@example.com SecurePass123! "Admin Name"
   ```

3. Verify by logging in and creating a company

## References
- [Supabase JWT Claims](https://supabase.com/docs/guides/auth/jwts) - Correct `app_metadata` structure
- `03-AUTHENTICATION.md` - JWT claims structure documentation
- ADR-002: Authentication Strategy - Original decision to use JWT claims
- `supabase/migrations/004_fix_rls_jwt_claims.sql` - The fix migration
