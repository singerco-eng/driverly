# Driverly Platform - Database Schema

> **Last Updated:** 2026-01-16  
> **Status:** Core Schema Defined | Evolving with Feature Specs

---

## Overview

This document defines the PostgreSQL database schema for Driverly. It serves as the canonical reference for all data structures.

### Schema Layers

| Layer | Status | Description |
|-------|--------|-------------|
| **Core** | ✅ Defined | Fundamental entities with full specifications |
| **Stub** | 🟡 Partial | Structure defined, details TBD per feature spec |
| **Placeholder** | 🔴 TBD | Listed only, defined when feature is specified |

### Conventions

- All tables use `uuid` primary keys (Supabase default)
- All tenant-scoped tables include `company_id` foreign key
- Timestamps: `created_at`, `updated_at` on all tables
- Soft deletes where appropriate: `deleted_at` timestamp
- Snake_case for all identifiers

---

## Entity Relationship Diagram

```
┌─────────────┐
│  companies  │ (tenants)
└──────┬──────┘
       │
       │ 1:many
       ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│    users    │──────│   drivers   │──────│  vehicles   │
└─────────────┘      └──────┬──────┘      └──────┬──────┘
                            │                     │
                            │    M:N via          │
                            │ assignments         │
                            ▼                     │
                     ┌──────────────────┐         │
                     │ driver_vehicle_  │◄────────┘
                     │   assignments    │
                     └──────────────────┘
                            
┌─────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   brokers   │◄────▶│ credential_types │◄────▶│ driver/vehicle   │
└─────────────┘      └──────────────────┘      │   credentials    │
                                               └──────────────────┘
```

---

## Core Schema (Layer 1)

### `companies`

Tenant companies on the platform.

```sql
CREATE TABLE companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,  -- URL-friendly identifier
  
  -- Contact
  email           text,
  phone           text,
  
  -- Address
  address_line1   text,
  address_line2   text,
  city            text,
  state           text,
  zip_code        text,
  
  -- Status
  status          text NOT NULL DEFAULT 'active' 
                  CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- Branding (for white-label)
  logo_url        text,
  primary_color   text,  -- Hex color for theming
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id)  -- Super Admin who created
);

-- Indexes
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_slug ON companies(slug);

-- RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all companies"
  ON companies FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Company members can view own company"
  ON companies FOR SELECT
  USING (id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);
```

**Notes:**
- `slug` used for subdomain or URL routing (e.g., `acme.driverly.com`)
- White-label theming via `logo_url` and `primary_color`

---

### `platform_theme`

Global theme defaults applied across the platform.

```sql
CREATE TABLE platform_theme (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL DEFAULT 'default',

  -- Theme tokens (HSL)
  primary text NOT NULL,
  primary_foreground text NOT NULL,
  secondary text NOT NULL,
  secondary_foreground text NOT NULL,
  accent text NOT NULL,
  accent_foreground text NOT NULL,
  background text NOT NULL,
  foreground text NOT NULL,
  card text NOT NULL,
  card_foreground text NOT NULL,
  muted text NOT NULL,
  muted_foreground text NOT NULL,
  border text NOT NULL,
  ring text NOT NULL,
  success text NOT NULL,
  success_foreground text NOT NULL,
  warning text NOT NULL,
  warning_foreground text NOT NULL,
  destructive text NOT NULL,
  destructive_foreground text NOT NULL,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Notes:**
- Single row (name = `default`)
- Updated only by Super Admins

---

### `company_theme`

Company-level overrides for theme tokens.

```sql
CREATE TABLE company_theme (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Overrides (nullable, HSL)
  primary text,
  primary_foreground text,
  secondary text,
  secondary_foreground text,
  accent text,
  accent_foreground text,
  background text,
  foreground text,
  card text,
  card_foreground text,
  muted text,
  muted_foreground text,
  border text,
  ring text,
  success text,
  success_foreground text,
  warning text,
  warning_foreground text,
  destructive text,
  destructive_foreground text,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Notes:**
- `company_id` is unique (one override row per company)
- Admins manage their own company’s overrides
- Super Admins can manage any company’s overrides

---

### `users`

All authenticated users across all roles.

```sql
CREATE TABLE users (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tenant (null for super_admin)
  company_id      uuid REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Role
  role            text NOT NULL 
                  CHECK (role IN ('super_admin', 'admin', 'coordinator', 'driver')),
  
  -- Profile
  email           text NOT NULL,
  full_name       text NOT NULL,
  phone           text,
  avatar_url      text,
  
  -- Status
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'pending')),
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  last_login_at   timestamptz,
  invited_by      uuid REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role ON users(company_id, role);
CREATE INDEX idx_users_email ON users(email);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all users"
  ON users FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Admins can manage company users"
  ON users FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Coordinators can view company users"
  ON users FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'coordinator'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Users can view and update own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM users WHERE id = auth.uid())  -- Can't change own role
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())  -- Can't change company
  );
```

**Notes:**
- References `auth.users` (Supabase Auth)
- `company_id` is null for super_admins
- `invited_by` tracks who invited the user

---

### `drivers`

Driver profiles (extends users with driver-specific data).

```sql
CREATE TABLE drivers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id          uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Employment
  employment_type     text NOT NULL 
                      CHECK (employment_type IN ('w2', '1099')),
  
  -- Personal Info
  date_of_birth       date,
  ssn_last_four       text,  -- Last 4 digits only, for verification display
  
  -- License
  license_number      text,
  license_state       text,
  license_expiration  date,
  
  -- Emergency Contact
  emergency_contact_name   text,
  emergency_contact_phone  text,
  emergency_contact_relation text,
  
  -- Application
  application_status  text NOT NULL DEFAULT 'pending'
                      CHECK (application_status IN (
                        'pending',      -- Initial submission
                        'under_review', -- Admin reviewing
                        'approved',     -- Accepted
                        'rejected',     -- Declined
                        'withdrawn'     -- Driver withdrew
                      )),
  application_date    timestamptz,
  approved_at         timestamptz,
  approved_by         uuid REFERENCES users(id),
  rejection_reason    text,
  
  -- Operational Status (post-approval)
  status              text NOT NULL DEFAULT 'inactive'
                      CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- Notes (admin only)
  admin_notes         text,
  
  -- Metadata
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_company_id ON drivers(company_id);
CREATE INDEX idx_drivers_application_status ON drivers(company_id, application_status);
CREATE INDEX idx_drivers_status ON drivers(company_id, status);
CREATE INDEX idx_drivers_employment_type ON drivers(company_id, employment_type);

-- RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/Coordinators can view company drivers"
  ON drivers FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Admins can manage company drivers"
  ON drivers FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Drivers can view own profile"
  ON drivers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Drivers can update own profile (limited)"
  ON drivers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- Cannot change: application_status, status, admin_notes, approved_by, etc.
    -- Enforced via trigger or check specific columns
  );

CREATE POLICY "Super admins can view all drivers"
  ON drivers FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');
```

**Notes:**
- One-to-one with `users` for driver role
- Separate `application_status` (hiring flow) from `status` (operational)
- `ssn_last_four` - never store full SSN

---

### `vehicles`

All vehicles (company-owned and driver-owned).

```sql
CREATE TABLE vehicles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Ownership
  owner_type      text NOT NULL 
                  CHECK (owner_type IN ('company', 'driver')),
  owner_driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  -- If owner_type = 'driver', owner_driver_id is required
  -- If owner_type = 'company', owner_driver_id is null
  
  -- Vehicle Type
  vehicle_type    text NOT NULL 
                  CHECK (vehicle_type IN (
                    'sedan',
                    'wheelchair_van',
                    'stretcher'
                  )),
  
  -- Vehicle Details
  make            text NOT NULL,
  model           text NOT NULL,
  year            integer NOT NULL,
  color           text,
  license_plate   text NOT NULL,
  vin             text,
  
  -- Capacity (for wheelchair/stretcher)
  passenger_capacity    integer DEFAULT 1,
  wheelchair_capacity   integer DEFAULT 0,
  stretcher_capacity    integer DEFAULT 0,
  
  -- Status
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'maintenance', 'inactive')),
  
  -- Photos
  photo_urls      text[],  -- Array of storage URLs
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE vehicles ADD CONSTRAINT vehicles_driver_owner_check
  CHECK (
    (owner_type = 'company' AND owner_driver_id IS NULL)
    OR (owner_type = 'driver' AND owner_driver_id IS NOT NULL)
  );

-- Indexes
CREATE INDEX idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX idx_vehicles_owner_driver_id ON vehicles(owner_driver_id);
CREATE INDEX idx_vehicles_type ON vehicles(company_id, vehicle_type);
CREATE INDEX idx_vehicles_status ON vehicles(company_id, status);

-- RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/Coordinators can view company vehicles"
  ON vehicles FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Admins can manage company vehicles"
  ON vehicles FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Drivers can view assigned and own vehicles"
  ON vehicles FOR SELECT
  USING (
    -- Own vehicle
    owner_driver_id = (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
    OR
    -- Assigned vehicle
    EXISTS (
      SELECT 1 FROM driver_vehicle_assignments dva
      JOIN drivers d ON d.id = dva.driver_id
      WHERE dva.vehicle_id = vehicles.id
      AND d.user_id = auth.uid()
      AND dva.end_date IS NULL
    )
  );

CREATE POLICY "Drivers can manage own vehicles"
  ON vehicles FOR ALL
  USING (
    owner_type = 'driver'
    AND owner_driver_id = (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );
```

**Notes:**
- `owner_type` distinguishes company vs driver ownership
- Constraint ensures `owner_driver_id` is set correctly based on `owner_type`
- Vehicle types are extensible (add to CHECK constraint)

---

### `driver_vehicle_assignments`

Links drivers to vehicles they can use.

```sql
CREATE TABLE driver_vehicle_assignments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  driver_id         uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id        uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  company_id        uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Assignment Type
  assignment_type   text NOT NULL 
                    CHECK (assignment_type IN ('owned', 'assigned', 'borrowed')),
  
  -- Primary vehicle flag (only one primary per driver)
  is_primary        boolean NOT NULL DEFAULT false,
  
  -- Duration
  start_date        date NOT NULL DEFAULT CURRENT_DATE,
  end_date          date,  -- NULL = currently active
  
  -- Scheduling (for shared vehicles)
  -- ⚠️ TBD: May need day-of-week or date-based scheduling
  -- For now, concurrent assignments allowed with admin management
  
  -- Tracking
  assigned_by       uuid NOT NULL REFERENCES users(id),
  notes             text,
  
  -- Metadata
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Constraints
-- Only one primary vehicle per driver at a time
CREATE UNIQUE INDEX idx_driver_primary_vehicle 
  ON driver_vehicle_assignments(driver_id) 
  WHERE is_primary = true AND end_date IS NULL;

-- Indexes
CREATE INDEX idx_dva_driver_id ON driver_vehicle_assignments(driver_id);
CREATE INDEX idx_dva_vehicle_id ON driver_vehicle_assignments(vehicle_id);
CREATE INDEX idx_dva_company_id ON driver_vehicle_assignments(company_id);
CREATE INDEX idx_dva_active ON driver_vehicle_assignments(driver_id) 
  WHERE end_date IS NULL;

-- RLS
ALTER TABLE driver_vehicle_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assignments"
  ON driver_vehicle_assignments FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Coordinators can view assignments"
  ON driver_vehicle_assignments FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'coordinator'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Drivers can view own assignments"
  ON driver_vehicle_assignments FOR SELECT
  USING (
    driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid())
  );
```

**Notes:**
- `assignment_type`: 
  - `owned` = driver's own vehicle (auto-created when driver adds vehicle)
  - `assigned` = company vehicle assigned to driver (typically W2)
  - `borrowed` = temporary use of another vehicle
- `is_primary` = the vehicle used by default
- Active assignments have `end_date IS NULL`

---

### `brokers`

External parties that contract trips to the company.

```sql
CREATE TABLE brokers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Basic Info
  name            text NOT NULL,
  code            text,  -- Short code for internal reference
  
  -- Contact
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  
  -- Address
  address_line1   text,
  address_line2   text,
  city            text,
  state           text,
  zip_code        text,
  
  -- Accepted Vehicle Types
  accepted_vehicle_types text[] NOT NULL DEFAULT '{"sedan", "wheelchair_van", "stretcher"}',
  
  -- Status
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive')),
  
  -- Notes
  notes           text,
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_brokers_company_id ON brokers(company_id);
CREATE INDEX idx_brokers_status ON brokers(company_id, status);
CREATE UNIQUE INDEX idx_brokers_company_code ON brokers(company_id, code) 
  WHERE code IS NOT NULL;

-- RLS
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage brokers"
  ON brokers FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Coordinators can view brokers"
  ON brokers FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'coordinator'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Drivers can view active brokers"
  ON brokers FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'driver'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND status = 'active'
  );
```

**Notes:**
- `accepted_vehicle_types` determines which vehicle types broker will accept
- `code` is optional short identifier for manifests

---

### `credential_types`

Defines what credentials are required (global or per-broker).

```sql
CREATE TABLE credential_types (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant
  company_id            uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Basic Info
  name                  text NOT NULL,
  description           text,
  
  -- Category
  category              text NOT NULL 
                        CHECK (category IN ('driver', 'vehicle')),
  
  -- Scope
  is_global             boolean NOT NULL DEFAULT true,
  broker_id             uuid REFERENCES brokers(id) ON DELETE CASCADE,
  -- If is_global = true, broker_id must be null
  -- If is_global = false, broker_id is required
  
  -- Requirements
  document_required     boolean NOT NULL DEFAULT true,
  expiration_required   boolean NOT NULL DEFAULT true,
  
  -- Display
  sort_order            integer DEFAULT 0,
  
  -- Status
  is_active             boolean NOT NULL DEFAULT true,
  
  -- Metadata
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE credential_types ADD CONSTRAINT credential_types_scope_check
  CHECK (
    (is_global = true AND broker_id IS NULL)
    OR (is_global = false AND broker_id IS NOT NULL)
  );

-- Indexes
CREATE INDEX idx_credential_types_company_id ON credential_types(company_id);
CREATE INDEX idx_credential_types_category ON credential_types(company_id, category);
CREATE INDEX idx_credential_types_broker_id ON credential_types(broker_id);
CREATE INDEX idx_credential_types_global ON credential_types(company_id, is_global) 
  WHERE is_global = true;

-- RLS
ALTER TABLE credential_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage credential types"
  ON credential_types FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Company members can view credential types"
  ON credential_types FOR SELECT
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );
```

**Notes:**
- `category`: `driver` credentials attach to the person, `vehicle` credentials attach to the vehicle
- `is_global`: true = required for all drivers/vehicles, false = required for specific broker
- Examples:
  - Global Driver: Background Check, Driver's License
  - Global Vehicle: Insurance, Registration
  - Broker Driver: Medicaid Certification
  - Broker Vehicle: Wheelchair Lift Inspection

---

### `driver_credentials`

Credentials submitted by drivers (personal credentials).

```sql
CREATE TABLE driver_credentials (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  driver_id         uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  credential_type_id uuid NOT NULL REFERENCES credential_types(id) ON DELETE CASCADE,
  company_id        uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Document
  document_url      text,  -- Storage bucket URL
  document_filename text,
  
  -- Dates
  issue_date        date,
  expiration_date   date,
  
  -- Review Status
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                      'pending',   -- Awaiting review
                      'approved',  -- Accepted
                      'rejected',  -- Declined
                      'expired'    -- Past expiration
                    )),
  
  -- Review Details
  reviewed_at       timestamptz,
  reviewed_by       uuid REFERENCES users(id),
  review_notes      text,
  rejection_reason  text,
  
  -- Submission tracking
  submitted_at      timestamptz NOT NULL DEFAULT now(),
  
  -- Metadata
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one credential per type per driver (latest wins)
-- Note: Could allow history by removing this and adding "is_current" flag
CREATE UNIQUE INDEX idx_driver_credentials_unique 
  ON driver_credentials(driver_id, credential_type_id);

-- Indexes
CREATE INDEX idx_driver_credentials_driver_id ON driver_credentials(driver_id);
CREATE INDEX idx_driver_credentials_company_id ON driver_credentials(company_id);
CREATE INDEX idx_driver_credentials_status ON driver_credentials(company_id, status);
CREATE INDEX idx_driver_credentials_expiration ON driver_credentials(expiration_date) 
  WHERE status = 'approved';

-- RLS
ALTER TABLE driver_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/Coordinators can view company credentials"
  ON driver_credentials FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Admins can manage company credentials"
  ON driver_credentials FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Drivers can view own credentials"
  ON driver_credentials FOR SELECT
  USING (
    driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "Drivers can submit credentials"
  ON driver_credentials FOR INSERT
  WITH CHECK (
    driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid())
    AND status = 'pending'  -- Can only create as pending
  );

CREATE POLICY "Drivers can update pending credentials"
  ON driver_credentials FOR UPDATE
  USING (
    driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid())
    AND status = 'pending'  -- Can only edit while pending
  );
```

**Notes:**
- Unique per driver+type (resubmission replaces previous)
- Drivers can only create `pending` credentials
- Only admins can change status to approved/rejected

---

### `vehicle_credentials`

Credentials for vehicles (insurance, registration, etc.).

```sql
CREATE TABLE vehicle_credentials (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  vehicle_id        uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  credential_type_id uuid NOT NULL REFERENCES credential_types(id) ON DELETE CASCADE,
  company_id        uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Document
  document_url      text,
  document_filename text,
  
  -- Dates
  issue_date        date,
  expiration_date   date,
  
  -- Review Status
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                      'pending',
                      'approved',
                      'rejected',
                      'expired'
                    )),
  
  -- Review Details
  reviewed_at       timestamptz,
  reviewed_by       uuid REFERENCES users(id),
  review_notes      text,
  rejection_reason  text,
  
  -- Submission tracking
  submitted_at      timestamptz NOT NULL DEFAULT now(),
  
  -- Metadata
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint
CREATE UNIQUE INDEX idx_vehicle_credentials_unique 
  ON vehicle_credentials(vehicle_id, credential_type_id);

-- Indexes
CREATE INDEX idx_vehicle_credentials_vehicle_id ON vehicle_credentials(vehicle_id);
CREATE INDEX idx_vehicle_credentials_company_id ON vehicle_credentials(company_id);
CREATE INDEX idx_vehicle_credentials_status ON vehicle_credentials(company_id, status);
CREATE INDEX idx_vehicle_credentials_expiration ON vehicle_credentials(expiration_date) 
  WHERE status = 'approved';

-- RLS
ALTER TABLE vehicle_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/Coordinators can view company vehicle credentials"
  ON vehicle_credentials FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Admins can manage vehicle credentials"
  ON vehicle_credentials FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Drivers can view credentials for accessible vehicles"
  ON vehicle_credentials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles v
      LEFT JOIN driver_vehicle_assignments dva ON dva.vehicle_id = v.id
      LEFT JOIN drivers d ON d.id = dva.driver_id OR d.id = v.owner_driver_id
      WHERE v.id = vehicle_credentials.vehicle_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can submit credentials for own vehicles"
  ON vehicle_credentials FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = vehicle_credentials.vehicle_id
      AND v.owner_type = 'driver'
      AND v.owner_driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid())
    )
    AND status = 'pending'
  );

CREATE POLICY "Drivers can update pending credentials for own vehicles"
  ON vehicle_credentials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = vehicle_credentials.vehicle_id
      AND v.owner_type = 'driver'
      AND v.owner_driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid())
    )
    AND status = 'pending'
  );
```

**Notes:**
- Same pattern as driver_credentials
- Drivers can only submit for vehicles they own

---

## Stub Schema (Layer 2)

These tables have defined structure but details may evolve with feature specs.

### `rates`

⚠️ **Status: Structure defined, details TBD in AD-009 Rate Management**

```sql
CREATE TABLE rates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Scope (increasingly specific)
  -- Global rate: broker_id NULL, driver_id NULL
  -- Broker rate: broker_id set, driver_id NULL
  -- Driver rate: broker_id set (or NULL for all), driver_id set
  broker_id       uuid REFERENCES brokers(id) ON DELETE CASCADE,
  driver_id       uuid REFERENCES drivers(id) ON DELETE CASCADE,
  
  -- Vehicle type
  vehicle_type    text NOT NULL 
                  CHECK (vehicle_type IN ('sedan', 'wheelchair_van', 'stretcher')),
  
  -- Employment type this rate applies to
  employment_type text NOT NULL 
                  CHECK (employment_type IN ('w2', '1099')),
  
  -- Rate values
  -- For 1099: per-trip and per-mile
  base_rate       decimal(10,2),  -- Per trip base
  per_mile_rate   decimal(10,4),  -- Per mile
  
  -- For W2: hourly or salary
  hourly_rate     decimal(10,2),
  -- ⚠️ TBD: Salary handling, overtime, etc.
  
  -- Effective dates
  effective_from  date NOT NULL DEFAULT CURRENT_DATE,
  effective_to    date,  -- NULL = currently active
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES users(id)
);

-- ⚠️ TBD: Unique constraints for rate precedence
-- ⚠️ TBD: Rate lookup function/view

-- Indexes
CREATE INDEX idx_rates_company_id ON rates(company_id);
CREATE INDEX idx_rates_broker_id ON rates(broker_id);
CREATE INDEX idx_rates_driver_id ON rates(driver_id);

-- RLS
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rates"
  ON rates FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- ⚠️ TBD: Driver visibility of their rates
```

---

### `availability`

⚠️ **Status: Structure defined, details TBD in DR-005 Availability**

```sql
CREATE TABLE availability (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  driver_id       uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Type
  availability_type text NOT NULL 
                    CHECK (availability_type IN ('recurring', 'one_time', 'unavailable')),
  
  -- For recurring: day of week (0=Sunday, 6=Saturday)
  day_of_week     integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  
  -- For one_time/unavailable: specific date
  specific_date   date,
  
  -- Time range
  start_time      time NOT NULL,
  end_time        time NOT NULL,
  
  -- ⚠️ TBD: Timezone handling
  -- ⚠️ TBD: Recurring effective dates (start_date, end_date)
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ⚠️ TBD: Constraints for recurring vs one_time
-- ⚠️ TBD: Overlap detection

-- Indexes
CREATE INDEX idx_availability_driver_id ON availability(driver_id);
CREATE INDEX idx_availability_company_id ON availability(company_id);

-- RLS
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can manage own availability"
  ON availability FOR ALL
  USING (
    driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins/Coordinators can view company availability"
  ON availability FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );
```

---

### `messages`

⚠️ **Status: Structure defined, details TBD in AD-011/DR-008 Messaging**

```sql
CREATE TABLE message_threads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Participants (simplified: admin <-> driver for now)
  driver_id       uuid REFERENCES drivers(id) ON DELETE CASCADE,
  
  -- ⚠️ TBD: Group threads, multiple participants
  
  subject         text,
  
  -- Status
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'archived')),
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Sender
  sender_id       uuid NOT NULL REFERENCES users(id),
  
  -- Content
  content         text NOT NULL,
  
  -- ⚠️ TBD: Attachments, rich content
  
  -- Read status
  -- ⚠️ TBD: Per-recipient read tracking
  
  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_message_threads_company_id ON message_threads(company_id);
CREATE INDEX idx_message_threads_driver_id ON message_threads(driver_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);

-- ⚠️ TBD: RLS policies
-- ⚠️ TBD: Realtime subscriptions
```

---

## Placeholder Schema (Layer 3)

These tables will be fully defined in their respective feature specs.

### `trips`

📋 **Defined in:** AD-008 Trip Manifests

```sql
-- ⚠️ PLACEHOLDER - See feature spec AD-008
-- Will include: trip details from CSV manifests, driver assignment, 
-- status, broker, times, locations, pay calculation
```

### `payments`

📋 **Defined in:** DR-007 Payments (and AD-008)

```sql
-- ⚠️ PLACEHOLDER - See feature specs
-- Will include: pay periods, calculated amounts, status, payout tracking
```

### `notifications`

📋 **Defined in:** Cross-cutting feature spec (TBD)

```sql
-- ⚠️ PLACEHOLDER
-- Will include: notification type, recipient, content, read status, 
-- delivery method (in-app, email, SMS)
```

### `audit_logs`

📋 **Defined in:** Cross-cutting feature spec (TBD)

```sql
-- ⚠️ PLACEHOLDER
-- Will include: action type, actor, target entity, changes, timestamp
```

### `company_settings`

📋 **Defined in:** AD-012 Settings

```sql
-- ⚠️ PLACEHOLDER
-- Will include: company preferences, enabled features, integration settings
```

### `billing` (Super Admin)

📋 **Defined in:** SA-003 Billing

```sql
-- ⚠️ PLACEHOLDER
-- Will include: subscription plans, billing history, payment methods
-- Likely integrates with Stripe
```

---

## Database Functions

### `get_driver_broker_eligibility`

Calculates whether a driver can perform trips for a broker.

```sql
-- ⚠️ TBD: Full implementation in credential feature specs
-- Signature preview:

CREATE OR REPLACE FUNCTION get_driver_broker_eligibility(
  p_driver_id uuid,
  p_broker_id uuid
)
RETURNS TABLE (
  is_eligible boolean,
  missing_driver_credentials uuid[],
  missing_vehicle_credentials uuid[],
  eligible_vehicles uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check all global driver credentials
  -- Check all broker-specific driver credentials
  -- For each assigned vehicle:
  --   Check vehicle type accepted by broker
  --   Check all global vehicle credentials
  --   Check all broker-specific vehicle credentials
  -- Return eligibility status and any gaps
END;
$$;
```

---

## Triggers

### Update `updated_at` Timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ... repeat for all tables
```

### Sync JWT Claims on User Changes

```sql
-- ⚠️ TBD: Trigger to update auth.users app_metadata 
-- when user role or company changes
-- See 03-AUTHENTICATION.md for details
```

---

## Views

### `driver_eligibility_summary`

```sql
-- ⚠️ TBD: View that shows each driver's eligibility status per broker
-- Useful for admin dashboards
```

### `expiring_credentials`

```sql
CREATE VIEW expiring_credentials AS
SELECT 
  'driver' as credential_category,
  dc.id,
  dc.driver_id,
  NULL::uuid as vehicle_id,
  dc.company_id,
  ct.name as credential_name,
  dc.expiration_date,
  dc.expiration_date - CURRENT_DATE as days_until_expiration
FROM driver_credentials dc
JOIN credential_types ct ON ct.id = dc.credential_type_id
WHERE dc.status = 'approved'
AND dc.expiration_date IS NOT NULL
AND dc.expiration_date <= CURRENT_DATE + INTERVAL '30 days'

UNION ALL

SELECT 
  'vehicle' as credential_category,
  vc.id,
  NULL::uuid as driver_id,
  vc.vehicle_id,
  vc.company_id,
  ct.name as credential_name,
  vc.expiration_date,
  vc.expiration_date - CURRENT_DATE as days_until_expiration
FROM vehicle_credentials vc
JOIN credential_types ct ON ct.id = vc.credential_type_id
WHERE vc.status = 'approved'
AND vc.expiration_date IS NOT NULL
AND vc.expiration_date <= CURRENT_DATE + INTERVAL '30 days';
```

---

## Migration Strategy

### File Naming Convention

```
supabase/migrations/
├── 20260116000001_create_companies.sql
├── 20260116000002_create_users.sql
├── 20260116000003_create_drivers.sql
├── 20260116000004_create_vehicles.sql
├── 20260116000005_create_driver_vehicle_assignments.sql
├── 20260116000006_create_brokers.sql
├── 20260116000007_create_credential_types.sql
├── 20260116000008_create_driver_credentials.sql
├── 20260116000009_create_vehicle_credentials.sql
├── 20260116000010_create_rates.sql
├── 20260116000011_create_availability.sql
├── 20260116000012_create_messages.sql
└── ... (added as features are built)
```

### Migration Order

1. `companies` (no dependencies)
2. `users` (depends on companies)
3. `drivers` (depends on users, companies)
4. `vehicles` (depends on drivers, companies)
5. `driver_vehicle_assignments` (depends on drivers, vehicles)
6. `brokers` (depends on companies)
7. `credential_types` (depends on brokers, companies)
8. `driver_credentials` (depends on drivers, credential_types)
9. `vehicle_credentials` (depends on vehicles, credential_types)
10. Remaining tables as features are built

---

## Change Log

| Date | Change | Spec Reference |
|------|--------|----------------|
| 2026-01-16 | Initial core schema | - |
| - | - | - |
