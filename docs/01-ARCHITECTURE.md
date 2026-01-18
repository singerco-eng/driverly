# Driverly Platform - Architecture

> **Last Updated:** 2026-01-16  
> **Status:** Draft - Pending Review

---

## Overview

Driverly is a multi-tenant SaaS platform built with a modern React frontend and Supabase backend. This document defines the technical architecture, patterns, and decisions that guide all development.

---

## Tech Stack

### Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI framework | 18.x |
| **TypeScript** | Type safety | 5.x |
| **Vite** | Build tool | 5.x |
| **React Router** | Client-side routing | 6.x |
| **Tailwind CSS** | Utility-first styling | 3.x |
| **CVA** | Component variants | 0.7.x |
| **React Query** | Server state management | 5.x |
| **React Hook Form** | Form handling | 7.x |
| **Zod** | Schema validation | 3.x |
| **Framer Motion** | Animations | 12.x |
| **Lucide React** | Icons | Latest |

### Backend (Supabase)

| Service | Purpose |
|---------|---------|
| **PostgreSQL** | Primary database |
| **Supabase Auth** | Authentication, JWT tokens |
| **Row-Level Security** | Multi-tenant data isolation |
| **Supabase Storage** | File uploads (credentials, documents) |
| **Edge Functions** | Server-side logic (Deno) |
| **Realtime** | Live updates (messaging, notifications) |

### Design System

The platform uses a white-label design system located at:
```
C:\Users\singe\dispatch-design-system
```

**Key characteristics:**
- CSS custom properties (HSL-based) for theming
- CVA (class-variance-authority) for component variants
- Radix UI primitives for accessibility
- 80+ pre-built components
- Tailwind integration via `@singerco-eng/design-system`

See `04-FRONTEND-GUIDELINES.md` for detailed usage.

---

## Multi-Tenancy Architecture

### Approach: Shared Database with Row-Level Security

All tenant data lives in a single PostgreSQL database. Tenant isolation is enforced through:

1. **`company_id` foreign key** on all tenant-scoped tables
2. **RLS policies** that filter data based on JWT claims
3. **JWT custom claims** containing user's `role` and `company_id`

```
┌─────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database                      │
├─────────────────────────────────────────────────────────────┤
│  companies        │ id, name, status, settings...           │
│  ─────────────────┼───────────────────────────────────────  │
│  users            │ id, company_id, role, profile...        │
│  drivers          │ id, company_id, user_id, details...     │
│  vehicles         │ id, company_id, owner_type...           │
│  credentials      │ id, company_id, driver_id/vehicle_id... │
│  brokers          │ id, company_id, name, requirements...   │
│  trips            │ id, company_id, driver_id, details...   │
│  ...              │ All tables include company_id           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ RLS Policies
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Policy: "Users can only see their company's data"          │
│  USING (company_id = auth.jwt() -> 'company_id')            │
└─────────────────────────────────────────────────────────────┘
```

### Why This Approach

| Benefit | Description |
|---------|-------------|
| **Simplicity** | Single schema, easier migrations |
| **Cost effective** | One database instance |
| **Supabase native** | RLS is first-class in Supabase |
| **Scalable** | Postgres handles millions of rows |
| **Cross-tenant queries** | Super Admin can aggregate data |

### RLS Policy Patterns

**Standard tenant isolation:**
```sql
CREATE POLICY "Tenant isolation" ON drivers
  FOR ALL
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);
```

**Super Admin bypass:**
```sql
CREATE POLICY "Super admin access" ON drivers
  FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );
```

**Role-based within tenant:**
```sql
CREATE POLICY "Drivers see own data" ON driver_credentials
  FOR SELECT
  USING (
    -- Admins/Coordinators see all in company
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  ) OR (
    -- Drivers see only their own
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'driver'
    AND driver_id = (auth.jwt() -> 'app_metadata' ->> 'driver_id')::uuid
  );
```

---

## Authentication Architecture

### JWT Claims Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "app_metadata": {
    "role": "admin",
    "company_id": "company-uuid",
    "driver_id": null
  },
  "user_metadata": {
    "full_name": "John Doe"
  }
}
```

| Claim | Description |
|-------|-------------|
| `role` | `super_admin`, `admin`, `coordinator`, `driver` |
| `company_id` | Tenant UUID (null for super_admin) |
| `driver_id` | Driver UUID (only for driver role) |

### Auth Flow

```
1. User signs up/logs in via Supabase Auth
2. Database trigger populates app_metadata with role/company_id
3. JWT includes claims on every request
4. RLS policies read claims to filter data
5. Frontend reads claims for UI routing/permissions
```

See `03-AUTHENTICATION.md` for complete flows.

---

## Application Structure

### Route Architecture

Single codebase with role-based routing:

```
/                           → Landing/login redirect
/login                      → Unified login (routes by role after auth)
/super-admin/*              → Super Admin dashboard
/admin/*                    → Admin dashboard  
/driver/*                   → Driver portal
```

### Directory Structure

```
src/
├── components/
│   ├── ui/                 # Design system components (from dispatch-design-system)
│   ├── shared/             # Shared across all roles
│   ├── super-admin/        # Super Admin specific
│   ├── admin/              # Admin specific
│   └── driver/             # Driver specific
│
├── pages/
│   ├── super-admin/        # Super Admin routes
│   │   ├── index.tsx       # Dashboard
│   │   ├── companies/      # Company management
│   │   └── settings/       # Platform settings
│   │
│   ├── admin/              # Admin routes
│   │   ├── index.tsx       # Dashboard
│   │   ├── drivers/        # Driver management
│   │   ├── vehicles/       # Vehicle management
│   │   ├── credentials/    # Credential management
│   │   ├── brokers/        # Broker management
│   │   ├── trips/          # Trip manifests
│   │   └── settings/       # Company settings
│   │
│   └── driver/             # Driver routes
│       ├── index.tsx       # Dashboard
│       ├── profile/        # Profile management
│       ├── vehicles/       # My vehicles
│       ├── credentials/    # My credentials
│       ├── availability/   # Availability calendar
│       ├── trips/          # Trip dashboard
│       └── payments/       # Payment history
│
├── hooks/
│   ├── useAuth.ts          # Auth state and helpers
│   ├── useCompany.ts       # Current company context
│   ├── usePermissions.ts   # Role-based permissions
│   └── queries/            # React Query hooks by domain
│       ├── useDrivers.ts
│       ├── useVehicles.ts
│       └── ...
│
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── api.ts              # API helpers
│   └── utils.ts            # General utilities
│
├── types/
│   ├── database.ts         # Generated from Supabase
│   ├── api.ts              # API request/response types
│   └── domain.ts           # Business domain types
│
└── styles/
    └── globals.css         # Global styles, CSS variables
```

### Code Sharing Strategy

| Code Type | Location | Used By |
|-----------|----------|---------|
| UI components | `components/ui/` | All roles |
| Design tokens | `lib/design-tokens.ts` | All roles |
| Auth hooks | `hooks/useAuth.ts` | All roles |
| Supabase client | `lib/supabase.ts` | All roles |
| Role-specific components | `components/{role}/` | Single role |
| Role-specific pages | `pages/{role}/` | Single role |

---

## Supabase Configuration

### Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `credential-documents` | Driver/vehicle credential uploads | RLS: owner + admin |
| `company-assets` | Company logos, branding | RLS: company members |
| `trip-manifests` | Uploaded CSV manifests | RLS: admin only |
| `profile-photos` | User profile images | RLS: owner + viewers |

### Storage RLS Example

```sql
-- credential-documents bucket policy
CREATE POLICY "Users can upload own credentials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'credential-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view company credentials"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'credential-documents'
  AND (
    -- Owner can view
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Admin can view company's files
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'coordinator')
      AND u.company_id = (
        SELECT company_id FROM users WHERE id = (storage.foldername(name))[1]::uuid
      )
    )
  )
);
```

### Edge Functions

Use Edge Functions for:
- Complex business logic (credential eligibility calculation)
- Multi-table transactions
- External API integrations
- CSV processing (trip manifests)
- Scheduled jobs (credential expiration checks)

**Naming convention:** `{domain}-{action}`
```
functions/
├── credentials-check-eligibility/
├── trips-process-manifest/
├── drivers-calculate-pay/
└── notifications-send/
```

---

## Data Fetching Patterns

### React Query Configuration

```typescript
// lib/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes
      gcTime: 1000 * 60 * 30,         // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Query Key Convention

```typescript
// Hierarchical keys for cache invalidation
const queryKeys = {
  drivers: {
    all: ['drivers'] as const,
    list: (filters: DriverFilters) => ['drivers', 'list', filters] as const,
    detail: (id: string) => ['drivers', 'detail', id] as const,
    credentials: (id: string) => ['drivers', id, 'credentials'] as const,
  },
  vehicles: {
    all: ['vehicles'] as const,
    list: (filters: VehicleFilters) => ['vehicles', 'list', filters] as const,
    detail: (id: string) => ['vehicles', 'detail', id] as const,
  },
  // ... etc
};
```

### Query Hook Pattern

```typescript
// hooks/queries/useDrivers.ts
export function useDrivers(filters?: DriverFilters) {
  return useQuery({
    queryKey: queryKeys.drivers.list(filters ?? {}),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*, user:users(*)')
        .match(filters ?? {});
      
      if (error) throw error;
      return data;
    },
  });
}

export function useDriver(id: string) {
  return useQuery({
    queryKey: queryKeys.drivers.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*, user:users(*), vehicles:driver_vehicle_assignments(*, vehicle:vehicles(*))')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
```

### Mutation Pattern

```typescript
export function useUpdateDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DriverUpdate }) => {
      const { data: result, error } = await supabase
        .from('drivers')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(queryKeys.drivers.detail(data.id), data);
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
    },
  });
}
```

---

## Error Handling

### Error Boundary Strategy

```typescript
// Wrap each route section
<ErrorBoundary fallback={<ErrorFallback />}>
  <AdminRoutes />
</ErrorBoundary>
```

### API Error Handling

```typescript
// lib/api.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
  }
}

export function handleSupabaseError(error: PostgrestError): never {
  // Map Supabase errors to user-friendly messages
  const errorMap: Record<string, string> = {
    '23505': 'This record already exists',
    '23503': 'Referenced record not found',
    '42501': 'You do not have permission to perform this action',
  };
  
  throw new ApiError(
    errorMap[error.code] || error.message,
    error.code,
    400
  );
}
```

### Toast Notifications

```typescript
// Use sonner for toast notifications
import { toast } from 'sonner';

// Success
toast.success('Driver created successfully');

// Error
toast.error('Failed to create driver', {
  description: error.message,
});

// Loading state
toast.promise(createDriver(data), {
  loading: 'Creating driver...',
  success: 'Driver created!',
  error: 'Failed to create driver',
});
```

---

## Security Considerations

### Defense in Depth

```
Layer 1: Frontend (UX only - never trust)
    ↓
Layer 2: Supabase RLS (primary enforcement)
    ↓
Layer 3: Edge Functions (business logic validation)
    ↓
Layer 4: Database constraints (ultimate safety net)
```

### Security Rules

1. **RLS is the source of truth** - Frontend can be bypassed; RLS cannot
2. **Never trust frontend data** - Always validate in RLS/Edge Functions
3. **Principle of least privilege** - Users get minimum required access
4. **Audit sensitive actions** - Log credential approvals, status changes

### File Upload Security

```typescript
// Validate file types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function validateFile(file: File): boolean {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('File too large');
  }
  return true;
}
```

### Sensitive Data Handling

| Data Type | Handling |
|-----------|----------|
| SSN/Tax ID | Never store full; last 4 only if needed |
| Bank accounts | Use payment processor (Stripe) |
| Passwords | Supabase Auth handles (never custom) |
| Documents | Encrypted at rest (Supabase default) |

---

## Performance Considerations

### Database Indexes

```sql
-- Essential indexes for common queries
CREATE INDEX idx_drivers_company_id ON drivers(company_id);
CREATE INDEX idx_drivers_status ON drivers(company_id, status);
CREATE INDEX idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX idx_credentials_driver_id ON driver_credentials(driver_id);
CREATE INDEX idx_credentials_status ON driver_credentials(status, expiration_date);
CREATE INDEX idx_trips_driver_date ON trips(driver_id, trip_date);
```

### Query Optimization

- Use `select()` to limit returned columns
- Paginate large lists (default: 25 items)
- Use database views for complex joins
- Cache eligibility calculations

### Frontend Performance

- Lazy load route components
- Virtualize long lists
- Debounce search inputs
- Skeleton loading states

---

## Environment Configuration

### Environment Variables

```bash
# .env.local
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Server-side only (Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Environment-Specific Config

```typescript
// lib/config.ts
export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  app: {
    name: 'Driverly',
    environment: import.meta.env.MODE,
  },
};
```

---

## Deployment Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel/       │     │    Supabase     │     │   Supabase      │
│   Netlify       │────▶│    Database     │◀────│   Edge          │
│   (Frontend)    │     │    + Auth       │     │   Functions     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Supabase      │
                        │   Storage       │
                        └─────────────────┘
```

### CI/CD Pipeline

```yaml
# GitHub Actions workflow
on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    steps:
      - Checkout
      - Install dependencies
      - Run type check
      - Run linter
      - Run tests
      - Build
      - Deploy to Vercel (main) / Preview (develop)
      
  database:
    steps:
      - Run Supabase migrations (if changed)
```

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multi-tenancy | Shared DB + RLS | Simpler, cost-effective, Supabase-native |
| Auth | Supabase Auth + JWT claims | Integrated, handles complexity |
| State management | React Query | Server state focus, caching built-in |
| Styling | Tailwind + CVA | Matches design system |
| Routing | React Router | Standard, works with Vite |
| Forms | RHF + Zod | Type-safe validation |

---

## References

- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [CVA Documentation](https://cva.style/docs)
- Design System: `C:\Users\singe\dispatch-design-system`
