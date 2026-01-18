-- ============================================
-- FIX THEME TABLES - Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check if platform_theme table exists and has data
SELECT * FROM platform_theme;

-- Step 2: Drop existing RLS policies (they reference JWT claims that don't exist)
DROP POLICY IF EXISTS "All authenticated can view platform theme" ON platform_theme;
DROP POLICY IF EXISTS "Super admins can manage platform theme" ON platform_theme;
DROP POLICY IF EXISTS "Company members can view company theme" ON company_theme;
DROP POLICY IF EXISTS "Admins can manage company theme" ON company_theme;
DROP POLICY IF EXISTS "Super admins can manage company theme" ON company_theme;

-- Step 3: Create new RLS policies that check the users table instead of JWT claims

-- Platform theme: Anyone authenticated can read
CREATE POLICY "Authenticated users can view platform theme"
  ON platform_theme FOR SELECT
  TO authenticated
  USING (true);

-- Platform theme: Super admins can manage (check users table)
CREATE POLICY "Super admins can manage platform theme"
  ON platform_theme FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Company theme: Company members can view their company's theme
CREATE POLICY "Company members can view company theme"
  ON company_theme FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Company theme: Admins can manage their company's theme
CREATE POLICY "Admins can manage company theme"
  ON company_theme FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.company_id = company_theme.company_id
    )
  );

-- Company theme: Super admins can manage any company theme
CREATE POLICY "Super admins can manage any company theme"
  ON company_theme FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Step 4: Insert or update the default theme seed data
INSERT INTO platform_theme (
  name,
  "primary",
  primary_foreground,
  secondary,
  secondary_foreground,
  accent,
  accent_foreground,
  background,
  foreground,
  card,
  card_foreground,
  muted,
  muted_foreground,
  border,
  ring,
  success,
  success_foreground,
  warning,
  warning_foreground,
  destructive,
  destructive_foreground
)
VALUES (
  'default',
  '218 95% 58%',
  '215 28% 6%',
  '215 25% 16%',
  '210 20% 98%',
  '259 94% 56%',
  '210 20% 98%',
  '215 28% 6%',
  '210 20% 98%',
  '215 25% 10%',
  '210 20% 98%',
  '215 25% 16%',
  '215 15% 72%',
  '215 25% 18%',
  '218 95% 58%',
  '142 76% 42%',
  '0 0% 100%',
  '38 92% 55%',
  '0 0% 8%',
  '0 84% 65%',
  '0 0% 92%'
)
ON CONFLICT (name) DO UPDATE SET
  "primary" = EXCLUDED."primary",
  primary_foreground = EXCLUDED.primary_foreground,
  secondary = EXCLUDED.secondary,
  secondary_foreground = EXCLUDED.secondary_foreground,
  accent = EXCLUDED.accent,
  accent_foreground = EXCLUDED.accent_foreground,
  background = EXCLUDED.background,
  foreground = EXCLUDED.foreground,
  card = EXCLUDED.card,
  card_foreground = EXCLUDED.card_foreground,
  muted = EXCLUDED.muted,
  muted_foreground = EXCLUDED.muted_foreground,
  border = EXCLUDED.border,
  ring = EXCLUDED.ring,
  success = EXCLUDED.success,
  success_foreground = EXCLUDED.success_foreground,
  warning = EXCLUDED.warning,
  warning_foreground = EXCLUDED.warning_foreground,
  destructive = EXCLUDED.destructive,
  destructive_foreground = EXCLUDED.destructive_foreground;

-- Step 5: Verify the data was inserted
SELECT id, name, "primary", accent, background FROM platform_theme WHERE name = 'default';

-- Step 6: Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('platform_theme', 'company_theme');
