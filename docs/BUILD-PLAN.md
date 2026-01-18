# Driverly Build Plan

> **Created:** 2026-01-16  
> **Status:** Ready to Execute

---

## Phase 0: Project Setup

### 0.1 Supabase Project

**Required:**
1. Create Supabase project at [supabase.com](https://supabase.com)
2. Note down:
   - Project URL: `https://[project-ref].supabase.co`
   - Anon Key: `eyJ...`
   - Service Role Key: `eyJ...` (for migrations/admin)

### 0.2 Environment Variables

Create `.env.local` in project root:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# For server-side/migrations (don't expose to client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
VITE_APP_URL=http://localhost:5173
```

### 0.3 Project Scaffolding

**Option A: Clone Design System (Recommended)**
```bash
# Copy design system as base
cp -r ../dispatch-design-system/* .
# Remove design system specific files
rm -rf src/components/design-systems src/assets/*.jpg src/assets/*.png
# Keep: src/components/ui, src/lib, src/hooks, src/integrations
```

**Option B: Fresh Vite + Copy Components**
```bash
npm create vite@latest . -- --template react-ts
# Then copy components from design system
```

### 0.4 Project Structure

```
driverly/
├── docs/                    # ✅ Already done - specs
├── public/
├── src/
│   ├── components/
│   │   ├── ui/              # Design system components
│   │   ├── features/        # Feature-specific components
│   │   │   ├── super-admin/
│   │   │   ├── admin/
│   │   │   └── driver/
│   │   └── layouts/         # Page layouts
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilities, design tokens
│   ├── pages/               # Route pages
│   │   ├── super-admin/
│   │   ├── admin/
│   │   └── driver/
│   ├── services/            # API/Supabase services
│   ├── stores/              # Global state (if needed)
│   ├── types/               # TypeScript types
│   └── integrations/
│       └── supabase/
│           ├── client.ts
│           └── types.ts     # Generated from Supabase
├── supabase/
│   ├── migrations/          # SQL migrations
│   ├── functions/           # Edge functions
│   └── seed.sql             # Seed data
├── tests/
│   ├── e2e/                 # Playwright E2E
│   └── integration/         # Vitest integration
├── .env.local               # Local env (gitignored)
├── .env.example             # Template for env vars
└── package.json
```

### 0.5 Dependencies to Add

```bash
# Core (most already in design system)
npm install @supabase/supabase-js @tanstack/react-query react-router-dom

# Forms
npm install react-hook-form @hookform/resolvers zod

# If not from design system base
npm install @radix-ui/react-* class-variance-authority clsx tailwind-merge
npm install framer-motion lucide-react date-fns sonner
```

---

## Phase 1: Database Foundation

### 1.1 Core Tables Migration

**File:** `supabase/migrations/001_core_tables.sql`

Creates:
- `companies` (tenants)
- `users` (with RLS)
- `invitations`

### 1.2 Driver/Vehicle Tables

**File:** `supabase/migrations/002_driver_vehicle.sql`

Creates:
- `drivers`
- `vehicles`
- `driver_vehicle_assignments`

### 1.3 Credential Tables

**File:** `supabase/migrations/003_credentials.sql`

Creates:
- `credential_types`
- `credential_type_templates`
- `driver_credentials`
- `vehicle_credentials`

### 1.4 Broker Tables

**File:** `supabase/migrations/004_brokers.sql`

Creates:
- `brokers`
- `driver_broker_assignments`
- `broker_rates`

### 1.5 RLS Policies

**File:** `supabase/migrations/005_rls_policies.sql`

All RLS policies from `02-DATABASE-SCHEMA.md`

### 1.6 Auth Configuration

**In Supabase Dashboard:**
- Enable Email auth
- Configure JWT claims hook (for custom claims)
- Set up email templates

---

## Phase 2: Authentication Layer

### 2.1 Auth Context & Hooks

- `useAuth()` - Current user, role, company
- `useRequireAuth()` - Route protection
- Auth context provider

### 2.2 Auth Pages

- `/login` - Email/password login
- `/accept-invite/[token]` - Accept invitation
- `/forgot-password`
- `/reset-password`

### 2.3 Role-Based Routing

- Route guards based on role
- Redirect logic

---

## Phase 3: Super Admin MVP

### 3.1 SA Layout

- Super Admin navigation
- Dashboard shell

### 3.2 SA-001: Company Management

- Company list (EnhancedDataView)
- Create company modal
- Edit company modal
- Company detail with tabs
- Deactivate/reactivate

### 3.3 SA-002: Admin Invitations

- Invitations tab on company detail
- Invite admin modal
- Resend/revoke actions
- Accept invitation page

---

## Phase 4: Admin Core

### 4.1 Admin Layout

- Admin navigation
- Dashboard shell
- Company context

### 4.2 AD-001: Driver Applications

- Public application form
- Application list for admin
- Review/approve/reject

### 4.3 AD-002: Driver Management

- Driver list (EnhancedDataView)
- Driver detail with tabs
- Status management

### 4.4 AD-003: Vehicle Management

- Vehicle list
- Add/edit vehicle
- Vehicle detail

### 4.5 AD-005: Credential Types

- Credential type list
- Create/edit credential type
- Submission type configuration

### 4.6 AD-007: Broker Management

- Broker list
- Create/edit broker
- Driver assignment
- Rate management

---

## Phase 5: Driver Portal

### 5.1 Driver Layout

- Driver navigation
- Dashboard with onboarding

### 5.2 DR-001: Onboarding

- Welcome modal
- Getting started checklist
- Progress tracking

### 5.3 DR-002: Profile Management

- Profile view/edit
- Account settings

### 5.4 DR-003: Vehicle Management

- My vehicles list
- Add/edit vehicle (1099)
- View assigned vehicles (W2)

### 5.5 DR-004: Credential Submission

- Credential list
- Submission flows (upload, photo, signature, form)
- History view

---

## Phase 6: Admin Operational

### 6.1 AD-004: Vehicle Assignment

- Assign from driver/vehicle
- Transfer flow
- History

### 6.2 AD-006: Credential Review

- Review queue
- Approve/reject flows
- Admin-verified marking

---

## Build Order Priority

```
1. Project Setup (0.x)           ← START HERE
2. Database Migrations (1.x)
3. Auth Layer (2.x)
4. Super Admin MVP (3.x)         ← First testable milestone
5. Admin Core (4.1-4.3)          ← Driver/Vehicle entities
6. Driver Portal Basic (5.1-5.2) ← Can test full flow
7. Credentials (4.5, 5.5, 6.2)   ← Core platform feature
8. Brokers (4.6)
9. Vehicle Assignment (6.1)
```

---

## Agent Chaining Strategy

See `AGENT-WORKFLOW.md` for detailed agent collaboration plan.
