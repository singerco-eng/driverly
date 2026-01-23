# TASK: Initialize Driverly Project + First Migration

## Context
You are setting up a new multi-tenant SaaS platform called "Driverly" for managing NEMT (Non-Emergency Medical Transportation) companies. We have an existing design system to copy from and need to create the database foundation.

## Your Tasks

### Task 1: Initialize Project from Design System

Copy the project structure from `C:\Users\singe\dispatch-design-system` to `C:\Users\singe\driverly`.

**Keep these folders/files:**
- `src/components/ui/` (all UI components)
- `src/lib/` (utilities, design tokens)
- `src/hooks/` (custom hooks)
- `src/integrations/supabase/` (Supabase client)
- `src/index.css` and `src/styles/`
- `tailwind.config.ts`
- `postcss.config.js`
- `tsconfig.json`, `tsconfig.node.json`
- `vite.config.ts`
- `index.html`

**Delete/don't copy:**
- `src/components/design-systems/` (demo showcase, not needed)
- `src/assets/*.jpg`, `src/assets/*.png` (demo images)
- `src/App.tsx`, `src/App.css` (we'll create new ones)
- `node_modules/` (will reinstall)

**Create this new folder structure:**
```
src/
├── components/
│   ├── ui/              ← (copied from design system)
│   ├── features/
│   │   ├── super-admin/
│   │   ├── admin/
│   │   └── driver/
│   └── layouts/
├── pages/
│   ├── super-admin/
│   ├── admin/
│   ├── driver/
│   └── auth/
├── services/
├── types/
└── contexts/
```

### Task 2: Create Supabase Migration

Create file: `supabase/migrations/001_core_tables.sql`

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
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_status ON companies(status);
```

### Task 3: Create Basic App Shell

Create `src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Placeholder pages - we'll build these out
const SuperAdminDashboard = () => <div className="p-8"><h1 className="text-2xl font-bold">Super Admin Dashboard</h1><p className="text-muted-foreground">Coming soon...</p></div>;
const AdminDashboard = () => <div className="p-8"><h1 className="text-2xl font-bold">Admin Dashboard</h1><p className="text-muted-foreground">Coming soon...</p></div>;
const DriverDashboard = () => <div className="p-8"><h1 className="text-2xl font-bold">Driver Dashboard</h1><p className="text-muted-foreground">Coming soon...</p></div>;
const Login = () => <div className="p-8"><h1 className="text-2xl font-bold">Login</h1><p className="text-muted-foreground">Coming soon...</p></div>;

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<Login />} />
          
          {/* Super Admin */}
          <Route path="/super-admin/*" element={<SuperAdminDashboard />} />
          
          {/* Admin */}
          <Route path="/admin/*" element={<AdminDashboard />} />
          
          {/* Driver */}
          <Route path="/driver/*" element={<DriverDashboard />} />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

### Task 4: Update package.json

Merge these into the existing package.json (keep existing deps, add missing):
```json
{
  "name": "driverly",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "db:migrate": "supabase db push",
    "db:types": "supabase gen types typescript --local > src/integrations/supabase/types.ts"
  }
}
```

## Output Summary

When complete, confirm you have created:
1. ✅ Copied UI components from design system
2. ✅ Created folder structure (features, pages, services, etc.)
3. ✅ `supabase/migrations/001_core_tables.sql`
4. ✅ `src/App.tsx` with routing shell
5. ✅ Updated `package.json`

## DO NOT
- Modify the UI components in `src/components/ui/`
- Create authentication logic yet (next task)
- Add any features beyond the shell structure
