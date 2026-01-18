# Getting Started: Driverly Development

Quick setup guide to start building.

---

## Step 1: Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for project to provision (~2 minutes)
3. Go to **Settings → API** and note:
   - Project URL: `https://[ref].supabase.co`
   - `anon` public key
   - `service_role` key (keep secret!)

---

## Step 2: Environment Setup

Create `.env.local` in project root:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# App
VITE_APP_URL=http://localhost:5173
```

---

## Step 3: Project Initialization

### Option A: Copy from Design System (Recommended)

```powershell
# From driverly folder
Copy-Item -Recurse ..\dispatch-design-system\* . -Exclude node_modules,.git
Remove-Item -Recurse src\components\design-systems -ErrorAction SilentlyContinue
Remove-Item -Recurse src\assets\*.jpg,src\assets\*.png -ErrorAction SilentlyContinue

# Install dependencies
npm install
```

### Option B: Fresh Setup

```powershell
npm create vite@latest . -- --template react-ts
npm install

# Core dependencies
npm install @supabase/supabase-js @tanstack/react-query react-router-dom
npm install react-hook-form @hookform/resolvers zod
npm install class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-select
npm install framer-motion lucide-react date-fns sonner
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```

---

## Step 4: Supabase CLI Setup

```powershell
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (run from driverly folder)
supabase link --project-ref your-project-ref

# Create migrations folder
mkdir -p supabase/migrations
```

---

## Step 5: First Migration

Create `supabase/migrations/001_core_tables.sql`:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies (tenants)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  ein VARCHAR(20),
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  deactivation_reason TEXT,
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (all user types)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'coordinator', 'driver')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'coordinator', 'driver')),
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Companies
CREATE POLICY "Super admins can do everything on companies"
  ON companies FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'super_admin');

CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  TO authenticated
  USING (id = (auth.jwt() ->> 'company_id')::uuid);

-- RLS Policies: Users
CREATE POLICY "Super admins can do everything on users"
  ON users FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'super_admin');

CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  TO authenticated
  USING (company_id = (auth.jwt() ->> 'company_id')::uuid);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- RLS Policies: Invitations
CREATE POLICY "Super admins can manage all invitations"
  ON invitations FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'super_admin');

CREATE POLICY "Admins can manage invitations for their company"
  ON invitations FOR ALL
  TO authenticated
  USING (
    company_id = (auth.jwt() ->> 'company_id')::uuid
    AND (auth.jwt() ->> 'role') = 'admin'
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_invitations_company_id ON invitations(company_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);
```

Apply:

```powershell
supabase db push
```

---

## Step 6: Generate Types

```powershell
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

---

## Step 7: Run Development

```powershell
npm run dev
```

---

## Step 8: Create Super Admin

In Supabase Dashboard → SQL Editor:

```sql
-- First, create the user in Auth (or use signup endpoint)
-- Then link to users table:

INSERT INTO users (id, email, full_name, role)
VALUES (
  'your-auth-user-uuid',  -- From auth.users
  'superadmin@driverly.com',
  'Super Admin',
  'super_admin'
);
```

---

## Verification Checklist

- [ ] Supabase project created
- [ ] `.env.local` configured
- [ ] Project dependencies installed
- [ ] First migration applied
- [ ] Types generated
- [ ] Dev server running
- [ ] Super admin user created

---

## Next: First Feature

Once setup is complete, start with SA-001 Company Management:

1. Give Codex the task to create company list page
2. Reference: `docs/features/super-admin/SA-001-company-management.md`
3. Audit with Opus
4. Iterate until complete
