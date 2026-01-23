# Driverly Platform - Database Schema

> **Last Updated:** 2026-01-20  
> **Status:** Complete - Generated from 26 migrations  
> **Database:** PostgreSQL (Supabase)

---

## Overview

This document defines the complete PostgreSQL schema for Driverly. All tables use Row Level Security (RLS) for multi-tenant data isolation.

### Conventions

- All tables use `UUID` primary keys (Supabase default)
- All tenant-scoped tables include `company_id` foreign key
- Timestamps: `created_at`, `updated_at` on most tables
- Snake_case for all identifiers
- JWT claims stored in `auth.jwt() -> 'app_metadata'`

### Role Hierarchy

| Role | Access Level |
|------|--------------|
| `super_admin` | Platform-wide access, no company_id |
| `admin` | Full access within their company |
| `coordinator` | Read + limited write within company |
| `driver` | Access to own records only |

---

## Entity Relationship Diagram

```
┌─────────────────┐
│    companies    │◄──────────────────────────────────────────────────┐
└────────┬────────┘                                                   │
         │ 1:many                                                     │
         ▼                                                            │
┌─────────────────┐         ┌─────────────────┐                       │
│      users      │◄────────│     drivers     │                       │
└─────────────────┘         └────────┬────────┘                       │
                                     │                                │
                    ┌────────────────┼────────────────┐               │
                    │                │                │               │
                    ▼                ▼                ▼               │
         ┌──────────────────┐  ┌───────────┐  ┌──────────────────┐    │
         │ driver_vehicle_  │  │  vehicles │  │ driver_broker_   │    │
         │   assignments    │◄─┤           │  │   assignments    │    │
         └──────────────────┘  └─────┬─────┘  └────────┬─────────┘    │
                                     │                 │              │
                    ┌────────────────┴──────┐          │              │
                    ▼                       ▼          ▼              │
         ┌──────────────────┐      ┌──────────────────┐               │
         │ vehicle_         │      │     brokers      │───────────────┘
         │   credentials    │      └────────┬─────────┘
         └──────────────────┘               │
                                            ▼
         ┌──────────────────┐      ┌──────────────────┐
         │ driver_          │◄─────│ credential_types │
         │   credentials    │      └──────────────────┘
         └──────────────────┘
```

---

## Core Tables

### `companies`

Tenant companies on the platform.

```sql
CREATE TABLE companies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) UNIQUE NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(50),
  address_line1   VARCHAR(255),
  address_line2   VARCHAR(255),
  city            VARCHAR(100),
  state           VARCHAR(50),
  zip             VARCHAR(20),
  logo_url        TEXT,
  primary_color   VARCHAR(7) DEFAULT '#3B82F6',
  status          VARCHAR(20) DEFAULT 'active' 
                  CHECK (status IN ('active', 'inactive', 'suspended')),
  ein             VARCHAR(20),
  timezone        VARCHAR(50) DEFAULT 'America/New_York',
  deactivation_reason TEXT,
  deactivated_at  TIMESTAMPTZ,
  deactivated_by  UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `slug` | VARCHAR(100) | URL-friendly identifier (e.g., `acme` for `acme.driverly.com`) |
| `status` | ENUM | `active`, `inactive`, `suspended` |
| `ein` | VARCHAR(20) | Employer Identification Number |

**RLS Policies:**
- Super admins: Full access to all companies
- Company members: Read-only access to own company

---

### `users`

All authenticated users across all roles.

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES companies(id),
  email           VARCHAR(255) UNIQUE NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  phone           VARCHAR(50),
  role            VARCHAR(20) NOT NULL 
                  CHECK (role IN ('super_admin', 'admin', 'coordinator', 'driver')),
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | References `auth.users` (Supabase Auth) |
| `company_id` | UUID | NULL for `super_admin` users |
| `role` | ENUM | `super_admin`, `admin`, `coordinator`, `driver` |

**RLS Policies:**
- Super admins: Full access to all users
- Company users: View users in their company
- Users: Update own profile

---

### `drivers`

Driver profiles linked to user accounts.

```sql
CREATE TABLE drivers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Employment
  employment_type     VARCHAR(10) NOT NULL CHECK (employment_type IN ('w2', '1099')),
  
  -- Personal
  date_of_birth       DATE,
  ssn_last_four       CHAR(4),
  
  -- Address
  address_line1       VARCHAR(255),
  address_line2       VARCHAR(255),
  city                VARCHAR(100),
  state               VARCHAR(50),
  zip                 VARCHAR(20),
  
  -- License
  license_number      VARCHAR(50),
  license_state       CHAR(2),
  license_expiration  DATE,
  
  -- Emergency Contact
  emergency_contact_name   VARCHAR(255),
  emergency_contact_phone  VARCHAR(50),
  emergency_contact_relation VARCHAR(100),
  
  -- Application
  application_status  VARCHAR(20) CHECK (application_status IN (
    'pending', 'under_review', 'approved', 'rejected', 'withdrawn'
  )),
  application_date    TIMESTAMPTZ,
  approved_at         TIMESTAMPTZ,
  approved_by         UUID REFERENCES users(id),
  rejection_reason    TEXT,
  
  -- Status
  status              VARCHAR(20) DEFAULT 'inactive' 
                      CHECK (status IN ('active', 'inactive', 'suspended', 'terminated')),
  status_reason       TEXT,
  status_changed_at   TIMESTAMPTZ,
  
  -- Onboarding
  onboarding_completed_at TIMESTAMPTZ,
  welcome_modal_dismissed BOOLEAN DEFAULT false,
  has_payment_info    BOOLEAN DEFAULT false,
  has_availability    BOOLEAN DEFAULT false,
  
  -- Admin
  admin_notes         TEXT,
  
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, company_id)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `employment_type` | ENUM | `w2` (employee) or `1099` (contractor) |
| `application_status` | ENUM | Hiring workflow state |
| `status` | ENUM | Operational status after approval |
| `ssn_last_four` | CHAR(4) | Only last 4 digits stored |

**RLS Policies:**
- Super admins: Full access
- Admins: Full CRUD within company
- Drivers: View/update own record

---

### `vehicles`

Fleet vehicles (company-owned or driver-owned).

```sql
CREATE TABLE vehicles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Vehicle Info
  make            VARCHAR(100) NOT NULL,
  model           VARCHAR(100) NOT NULL,
  year            INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
  color           VARCHAR(50) NOT NULL,
  vin             VARCHAR(17),
  license_plate   VARCHAR(20) NOT NULL,
  license_state   CHAR(2),
  
  -- Type & Capacity
  vehicle_type    VARCHAR(30) NOT NULL CHECK (vehicle_type IN (
    'sedan', 'suv', 'minivan', 'wheelchair_van', 'stretcher_van'
  )),
  wheelchair_capacity INTEGER DEFAULT 0,
  stretcher_capacity  INTEGER DEFAULT 0,
  ambulatory_capacity INTEGER DEFAULT 4,
  
  -- Ownership
  ownership       VARCHAR(20) DEFAULT 'company' 
                  CHECK (ownership IN ('company', 'driver', 'leased')),
  owner_driver_id UUID REFERENCES drivers(id),
  
  -- Status
  status          VARCHAR(20) DEFAULT 'active' 
                  CHECK (status IN ('active', 'inactive', 'maintenance', 'retired')),
  
  -- Maintenance
  last_inspection_date DATE,
  next_inspection_due  DATE,
  mileage         INTEGER,
  
  -- Insurance
  insurance_policy_number VARCHAR(100),
  insurance_expiration    DATE,
  
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, license_plate)
);
```

**RLS Policies:**
- Admins: Full CRUD within company
- Drivers: View assigned and owned vehicles

---

### `brokers`

Trip sources/brokers (Medicaid brokers, facilities, etc.).

```sql
CREATE TABLE brokers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Basic Info
  name            VARCHAR(255) NOT NULL,
  code            VARCHAR(50),
  source_type     TEXT NOT NULL DEFAULT 'state_broker' CHECK (source_type IN (
    'state_broker', 'facility', 'insurance', 'private', 'corporate'
  )),
  logo_url        TEXT,
  
  -- Contact
  contact_name    VARCHAR(255),
  contact_email   VARCHAR(255),
  contact_phone   VARCHAR(50),
  
  -- Address
  address_line1   TEXT,
  address_line2   TEXT,
  city            TEXT,
  state           TEXT,
  zip_code        TEXT,
  website         TEXT,
  contract_number TEXT,
  notes           TEXT,
  
  -- Eligibility
  service_states          TEXT[] NOT NULL DEFAULT '{}',
  accepted_vehicle_types  TEXT[] NOT NULL DEFAULT ARRAY['sedan', 'wheelchair_van', 'stretcher_van', 'suv', 'minivan'],
  accepted_employment_types TEXT[] NOT NULL DEFAULT ARRAY['w2', '1099'],
  
  -- Assignment Mode
  allow_driver_requests   BOOLEAN NOT NULL DEFAULT false,
  allow_driver_auto_signup BOOLEAN NOT NULL DEFAULT false,
  
  -- Status
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, name)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `source_type` | ENUM | Type of trip source |
| `service_states` | TEXT[] | US state codes where broker operates |
| `allow_driver_requests` | BOOLEAN | Drivers can request to join |
| `allow_driver_auto_signup` | BOOLEAN | Drivers can join instantly |

---

## Credential System

### `credential_types`

Definitions of required credentials.

```sql
CREATE TABLE credential_types (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Basic Info
  name                  TEXT NOT NULL,
  description           TEXT,
  instruction_config    JSONB,  -- Multi-step instruction builder config
  
  -- Classification
  category              TEXT NOT NULL CHECK (category IN ('driver', 'vehicle')),
  scope                 TEXT NOT NULL CHECK (scope IN ('global', 'broker')),
  broker_id             UUID REFERENCES brokers(id) ON DELETE CASCADE,
  
  -- Requirements
  requires_driver_action BOOLEAN NOT NULL DEFAULT true,
  employment_type       TEXT NOT NULL DEFAULT 'both' 
                        CHECK (employment_type IN ('both', 'w2_only', '1099_only')),
  requirement           TEXT NOT NULL DEFAULT 'required' 
                        CHECK (requirement IN ('required', 'optional', 'recommended')),
  vehicle_types         TEXT[],
  
  -- Legacy (deprecated)
  submission_type       TEXT CHECK (submission_type IN (
    'document_upload', 'photo', 'signature', 'form', 'admin_verified', 'date_entry'
  )),
  form_schema           JSONB,
  signature_document_url TEXT,
  
  -- Expiration
  expiration_type       TEXT NOT NULL DEFAULT 'never' 
                        CHECK (expiration_type IN ('never', 'fixed_interval', 'driver_specified')),
  expiration_interval_days INTEGER,
  expiration_warning_days  INTEGER DEFAULT 30,
  grace_period_days     INTEGER DEFAULT 30,
  
  -- Ordering
  display_order         INTEGER DEFAULT 0,
  
  -- Status
  is_active             BOOLEAN NOT NULL DEFAULT true,
  is_seeded             BOOLEAN NOT NULL DEFAULT false,
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES users(id),
  
  CONSTRAINT broker_required_for_broker_scope 
    CHECK (scope = 'global' OR broker_id IS NOT NULL)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `instruction_config` | JSONB | V2 multi-step instruction builder schema |
| `requires_driver_action` | BOOLEAN | If false, admin-managed credential |
| `scope` | ENUM | `global` = all drivers, `broker` = specific broker |
| `submission_type` | ENUM | DEPRECATED - use `instruction_config` |

---

### `driver_credentials`

Credential submissions from drivers.

```sql
CREATE TABLE driver_credentials (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id           UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  credential_type_id  UUID NOT NULL REFERENCES credential_types(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Status
  status              TEXT NOT NULL DEFAULT 'not_submitted' CHECK (status IN (
    'not_submitted', 'pending_review', 'approved', 'rejected', 'expired'
  )),
  
  -- Submission Data
  document_url        TEXT,
  document_urls       TEXT[],
  signature_data      JSONB,
  form_data           JSONB,
  entered_date        DATE,
  driver_expiration_date DATE,
  notes               TEXT,
  
  -- Versioning
  submission_version  INTEGER NOT NULL DEFAULT 1,
  
  -- Expiration
  expires_at          TIMESTAMPTZ,
  grace_period_ends   TIMESTAMPTZ,
  
  -- Review
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID REFERENCES users(id),
  review_notes        TEXT,
  rejection_reason    TEXT,
  
  submitted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(driver_id, credential_type_id)
);
```

---

### `vehicle_credentials`

Credential submissions for vehicles.

```sql
CREATE TABLE vehicle_credentials (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id          UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  credential_type_id  UUID NOT NULL REFERENCES credential_types(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Status
  status              TEXT NOT NULL DEFAULT 'not_submitted' CHECK (status IN (
    'not_submitted', 'pending_review', 'approved', 'rejected', 'expired'
  )),
  
  -- Submission Data
  document_url        TEXT,
  document_urls       TEXT[],
  signature_data      JSONB,
  form_data           JSONB,
  entered_date        DATE,
  driver_expiration_date DATE,
  notes               TEXT,
  
  submission_version  INTEGER NOT NULL DEFAULT 1,
  
  -- Expiration
  expires_at          TIMESTAMPTZ,
  grace_period_ends   TIMESTAMPTZ,
  
  -- Review
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID REFERENCES users(id),
  review_notes        TEXT,
  rejection_reason    TEXT,
  
  submitted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(vehicle_id, credential_type_id)
);
```

---

### `credential_progress`

Tracks step-by-step progress through multi-step credentials.

```sql
CREATE TABLE credential_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id   UUID NOT NULL,
  credential_table TEXT NOT NULL CHECK (credential_table IN ('driver_credentials', 'vehicle_credentials')),
  current_step_id TEXT,
  step_data       JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(credential_id, credential_table)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `credential_table` | TEXT | Polymorphic reference to `driver_credentials` or `vehicle_credentials` |
| `step_data` | JSONB | Per-step state: `{ steps: { stepId: { completed, formData, uploadedFiles, etc } } }` |

---

### `credential_submission_history`

Audit trail for credential submissions.

```sql
CREATE TABLE credential_submission_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id   UUID NOT NULL,
  credential_table TEXT NOT NULL CHECK (credential_table IN ('driver_credentials', 'vehicle_credentials')),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submission_data JSONB NOT NULL,
  status          TEXT NOT NULL CHECK (status IN (
    'submitted', 'pending_review', 'approved', 'rejected', 'expired'
  )),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES users(id),
  review_notes    TEXT,
  rejection_reason TEXT,
  expires_at      TIMESTAMPTZ,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Assignment Tables

### `driver_vehicle_assignments`

Links drivers to vehicles.

```sql
CREATE TABLE driver_vehicle_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id       UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assignment_type VARCHAR(20) DEFAULT 'assigned' 
                  CHECK (assignment_type IN ('owned', 'assigned', 'shared')),
  is_primary      BOOLEAN DEFAULT false,
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  unassigned_at   TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  starts_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(driver_id, vehicle_id)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `assignment_type` | ENUM | `owned` (driver's vehicle), `assigned` (company vehicle), `shared` |
| `is_primary` | BOOLEAN | Driver's default vehicle |

---

### `driver_broker_assignments`

Links drivers to brokers/trip sources.

```sql
CREATE TABLE driver_broker_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id       UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  broker_id       UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending' 
                  CHECK (status IN ('pending', 'assigned', 'removed')),
  requested_by    TEXT NOT NULL CHECK (requested_by IN ('admin', 'driver')),
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  removed_by      UUID REFERENCES users(id),
  removed_at      TIMESTAMPTZ,
  removal_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(driver_id, broker_id)
);
```

---

## Theme Tables

### `platform_theme`

Global theme defaults.

```sql
CREATE TABLE platform_theme (
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
```

### `company_theme`

Per-company theme overrides.

```sql
CREATE TABLE company_theme (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  -- Same columns as platform_theme but nullable for overrides
  "primary" TEXT,
  primary_foreground TEXT,
  -- ... (all theme tokens)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Supporting Tables

### `invitations`

Admin/driver invitations.

```sql
CREATE TABLE invitations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id),
  email       VARCHAR(255) NOT NULL,
  full_name   VARCHAR(255) NOT NULL,
  phone       VARCHAR(50),
  role        VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'coordinator', 'driver')),
  token       VARCHAR(255) UNIQUE NOT NULL,
  status      VARCHAR(20) DEFAULT 'pending' 
              CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by  UUID REFERENCES users(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `broker_rates`

Rate configuration per vehicle type per broker.

```sql
CREATE TABLE broker_rates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broker_id     UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_type  TEXT NOT NULL CHECK (vehicle_type IN (
    'sedan', 'suv', 'minivan', 'wheelchair_van', 'stretcher_van'
  )),
  base_rate     DECIMAL(10,2) NOT NULL,
  per_mile_rate DECIMAL(10,4) NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to  DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    UUID REFERENCES users(id),
  
  UNIQUE(broker_id, vehicle_type, effective_from)
);
```

### `driver_onboarding_progress`

Tracks driver onboarding checklist.

```sql
CREATE TABLE driver_onboarding_progress (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_key    TEXT NOT NULL,
  completed   BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  skipped     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(driver_id, item_key)
);
```

### `driver_availability`

Weekly availability schedule.

```sql
CREATE TABLE driver_availability (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(driver_id, day_of_week)
);
```

### `driver_payment_info`

Driver payment information.

```sql
CREATE TABLE driver_payment_info (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id       UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE UNIQUE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  payment_method  TEXT NOT NULL CHECK (payment_method IN ('direct_deposit', 'check', 'paycard')),
  bank_name       TEXT,
  account_type    TEXT CHECK (account_type IN ('checking', 'savings')),
  routing_number_last4 CHAR(4),
  account_number_last4 CHAR(4),
  check_address_line1 TEXT,
  check_address_line2 TEXT,
  check_city      TEXT,
  check_state     TEXT,
  check_zip       TEXT,
  is_verified     BOOLEAN DEFAULT false,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `credential_type_templates`

Super Admin templates for seeding credentials.

```sql
CREATE TABLE credential_type_templates (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  description           TEXT,
  category              TEXT NOT NULL CHECK (category IN ('driver', 'vehicle')),
  submission_type       TEXT NOT NULL,
  employment_type       TEXT NOT NULL DEFAULT 'both',
  requirement           TEXT NOT NULL DEFAULT 'required',
  expiration_type       TEXT NOT NULL DEFAULT 'never',
  expiration_interval_days INTEGER,
  expiration_warning_days  INTEGER DEFAULT 30,
  form_schema           JSONB,
  signature_document_url TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  display_order         INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Key RPC Functions

### `get_driver_required_credentials(p_driver_id UUID)`

Returns all credential types a driver needs based on employment type and broker assignments.

**Returns:**
| Column | Type |
|--------|------|
| `credential_type_id` | UUID |
| `credential_type_name` | TEXT |
| `category` | TEXT |
| `scope` | TEXT |
| `broker_id` | UUID |
| `broker_name` | TEXT |
| `submission_type` | TEXT |
| `requires_driver_action` | BOOLEAN |
| `requirement` | TEXT |
| `existing_credential_id` | UUID |
| `current_status` | TEXT |

### `get_vehicle_required_credentials(p_vehicle_id UUID)`

Returns all credential types a vehicle needs based on type and owner's broker assignments.

### `can_driver_join_broker(p_driver_id UUID, p_broker_id UUID)`

Checks if a driver can join a broker.

**Returns:**
| Column | Type |
|--------|------|
| `can_join` | BOOLEAN |
| `join_mode` | TEXT (`auto_signup`, `request`, `admin_only`, `not_eligible`) |
| `reason` | TEXT |

### `calculate_credential_expiration(...)`

Calculates credential expiration based on type configuration.

---

## Indexes Summary

```sql
-- Companies
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_status ON companies(status);

-- Users
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role ON users(role);

-- Drivers
CREATE INDEX idx_drivers_company_id ON drivers(company_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_application_status ON drivers(application_status);
CREATE INDEX idx_drivers_company_status ON drivers(company_id, status);

-- Vehicles
CREATE INDEX idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_owner_driver ON vehicles(owner_driver_id);

-- Credentials
CREATE INDEX idx_driver_credentials_driver ON driver_credentials(driver_id);
CREATE INDEX idx_driver_credentials_status ON driver_credentials(status);
CREATE INDEX idx_driver_credentials_expiring ON driver_credentials(expires_at) WHERE status = 'approved';
CREATE INDEX idx_vehicle_credentials_vehicle ON vehicle_credentials(vehicle_id);

-- Brokers
CREATE INDEX idx_brokers_company_id ON brokers(company_id);
CREATE INDEX idx_brokers_status ON brokers(company_id, status);
CREATE INDEX idx_brokers_source_type ON brokers(company_id, source_type);

-- Assignments
CREATE INDEX idx_driver_broker_active ON driver_broker_assignments(driver_id, broker_id) WHERE status = 'assigned';
```

---

## Migration History

| # | File | Description |
|---|------|-------------|
| 001 | `001_core_tables.sql` | Companies, users, invitations |
| 002 | `002_fix_user_rls.sql` | RLS policy fixes |
| 003 | `003_theme_tables.sql` | Platform/company theming |
| 004 | `004_fix_rls_jwt_claims.sql` | JWT claims RLS fix |
| 005 | `005_update_invitations_for_sa002.sql` | Invitation enhancements |
| 006 | `006_driver_vehicle_tables.sql` | Drivers and vehicles |
| 007 | `007_driver_applications.sql` | Application workflow |
| 008 | `008_public_company_access.sql` | Public company lookup |
| 009 | `009_credential_storage_bucket.sql` | Storage bucket setup |
| 010 | `010_auto_create_user_profile.sql` | Auto user profile creation |
| 011 | `011_credential_types.sql` | Credential types system |
| 012 | `012_broker_management.sql` | Brokers and assignments |
| 013 | `013_vehicle_assignment.sql` | Vehicle assignment workflow |
| 014 | `014_driver_onboarding.sql` | Onboarding progress |
| 015 | `015_credential_submission.sql` | Credential submission flow |
| 016 | `016_driver_profile.sql` | Profile management |
| 017 | `017_driver_vehicle_management.sql` | Vehicle photos/status |
| 018 | `018_fix_vehicle_credentials_rpc.sql` | Vehicle credential RPC |
| 019 | `019_fix_driver_vehicle_rls.sql` | Driver vehicle RLS |
| 020 | `020_fix_driver_credential_insert.sql` | Credential insert RLS |
| 021 | `021_broker_assignment_settings.sql` | Broker assignment modes |
| 022 | `022_credential_instruction_builder.sql` | Instruction builder JSONB |
| 023 | `023_credential_progress.sql` | Step progress tracking |
| 024 | `024_credential_type_refactor.sql` | requires_driver_action flag |
| 024b | `024_admin_ensure_driver_credential.sql` | Admin credential ensure RPC |
| 025 | `025_admin_ensure_vehicle_credential.sql` | Admin vehicle credential RPC |
