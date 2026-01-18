-- Platform theme defaults
CREATE TABLE IF NOT EXISTS platform_theme (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE DEFAULT 'default',
  "primary" TEXT NOT NULL,
  primary_foreground TEXT NOT NULL,
  secondary TEXT NOT NULL,
  secondary_foreground TEXT NOT NULL,
  accent TEXT NOT NULL,
  accent_foreground TEXT NOT NULL,
  background TEXT NOT NULL,
  foreground TEXT NOT NULL,
  card TEXT NOT NULL,
  card_foreground TEXT NOT NULL,
  muted TEXT NOT NULL,
  muted_foreground TEXT NOT NULL,
  border TEXT NOT NULL,
  ring TEXT NOT NULL,
  success TEXT NOT NULL,
  success_foreground TEXT NOT NULL,
  warning TEXT NOT NULL,
  warning_foreground TEXT NOT NULL,
  destructive TEXT NOT NULL,
  destructive_foreground TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company-level theme overrides
CREATE TABLE IF NOT EXISTS company_theme (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  "primary" TEXT,
  primary_foreground TEXT,
  secondary TEXT,
  secondary_foreground TEXT,
  accent TEXT,
  accent_foreground TEXT,
  background TEXT,
  foreground TEXT,
  card TEXT,
  card_foreground TEXT,
  muted TEXT,
  muted_foreground TEXT,
  border TEXT,
  ring TEXT,
  success TEXT,
  success_foreground TEXT,
  warning TEXT,
  warning_foreground TEXT,
  destructive TEXT,
  destructive_foreground TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id)
);

-- Enable RLS
ALTER TABLE platform_theme ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_theme ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (for idempotency)
DROP POLICY IF EXISTS "All authenticated can view platform theme" ON platform_theme;
DROP POLICY IF EXISTS "Super admins can manage platform theme" ON platform_theme;
DROP POLICY IF EXISTS "Company members can view company theme" ON company_theme;
DROP POLICY IF EXISTS "Admins can manage company theme" ON company_theme;
DROP POLICY IF EXISTS "Super admins can manage company theme" ON company_theme;
DROP POLICY IF EXISTS "Authenticated users can view platform theme" ON platform_theme;
DROP POLICY IF EXISTS "Super admins can manage any company theme" ON company_theme;

-- RLS Policies: platform theme
-- All authenticated users can view the platform theme
CREATE POLICY "Authenticated users can view platform theme"
  ON platform_theme FOR SELECT
  TO authenticated
  USING (true);

-- Super admins can manage platform theme (check users table, not JWT)
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

-- RLS Policies: company theme
-- Company members can view their company's theme
CREATE POLICY "Company members can view company theme"
  ON company_theme FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Admins can manage their company's theme
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

-- Super admins can manage any company theme
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

-- Updated at triggers
DROP TRIGGER IF EXISTS platform_theme_updated_at ON platform_theme;
CREATE TRIGGER platform_theme_updated_at
  BEFORE UPDATE ON platform_theme
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS company_theme_updated_at ON company_theme;
CREATE TRIGGER company_theme_updated_at
  BEFORE UPDATE ON company_theme
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed platform defaults
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
