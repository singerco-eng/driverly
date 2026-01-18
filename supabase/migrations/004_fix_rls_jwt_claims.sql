-- Fix RLS policies to use correct JWT claims path
-- The original policies used (auth.jwt() ->> 'role') but Supabase stores
-- custom claims in app_metadata, accessed via (auth.jwt() -> 'app_metadata' ->> 'role')
-- See: ADR-003, 03-AUTHENTICATION.md

-- ============================================================================
-- DROP existing incorrect policies
-- ============================================================================

-- Companies
DROP POLICY IF EXISTS "Super admins can do everything on companies" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;

-- Users
DROP POLICY IF EXISTS "Super admins can do everything on users" ON users;
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can read their own profile" ON users;

-- Invitations
DROP POLICY IF EXISTS "Super admins can manage all invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can manage invitations for their company" ON invitations;

-- ============================================================================
-- RECREATE policies with correct app_metadata path
-- ============================================================================

-- Companies: Super admins can manage all companies
CREATE POLICY "Super admins can manage all companies"
  ON companies FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Companies: Users can view their own company
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  TO authenticated
  USING (id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

-- Users: Super admins can manage all users
CREATE POLICY "Super admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Users: Admins can manage users in their company
CREATE POLICY "Admins can manage company users"
  ON users FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Users: Coordinators can view company users
CREATE POLICY "Coordinators can view company users"
  ON users FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'coordinator'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Users: Everyone can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users: Everyone can update their own profile (limited fields via app logic)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Invitations: Super admins can manage all invitations
CREATE POLICY "Super admins can manage all invitations"
  ON invitations FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Invitations: Admins can manage invitations for their company
CREATE POLICY "Admins can manage company invitations"
  ON invitations FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- ============================================================================
-- Add trigger to sync JWT claims when users table changes
-- ============================================================================

-- Function to update auth.users app_metadata when users table changes
CREATE OR REPLACE FUNCTION sync_user_claims()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'role', NEW.role,
    'company_id', NEW.company_id
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_user_created ON users;
DROP TRIGGER IF EXISTS on_user_updated ON users;

-- Trigger on INSERT
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_claims();

-- Trigger on UPDATE (when role or company_id changes)
CREATE TRIGGER on_user_updated
  AFTER UPDATE OF role, company_id ON users
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role OR OLD.company_id IS DISTINCT FROM NEW.company_id)
  EXECUTE FUNCTION sync_user_claims();
