# AD-005: Credential Types

> **Last Updated:** 2026-01-16  
> **Status:** Draft  
> **Phase:** 2 - Admin Core

---

## Overview

Credential Types define the requirements that drivers and vehicles must meet to operate. This feature allows Admins to create, configure, and manage credential definitions. The actual submitted credentials (instances) are handled in AD-006.

**Key Concepts:**
- **Credential Type** = The definition/template (e.g., "Background Check")
- **Credential Instance** = An actual submission tied to a driver or vehicle

---

## Data Model

### Credential Type Schema

```sql
-- Credential type definition
CREATE TABLE credential_types (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Basic Info
  name            text NOT NULL,
  description     text,                    -- Rich text/markdown with images, instructions
  
  -- Classification
  category        text NOT NULL CHECK (category IN ('driver', 'vehicle')),
  scope           text NOT NULL CHECK (scope IN ('global', 'broker')),
  broker_id       uuid REFERENCES brokers(id) ON DELETE CASCADE,  -- Required if scope = 'broker'
  
  -- Requirements
  employment_type text NOT NULL DEFAULT 'both' CHECK (employment_type IN ('both', 'w2_only', '1099_only')),
  requirement     text NOT NULL DEFAULT 'required' CHECK (requirement IN ('required', 'optional', 'recommended')),
  vehicle_types   text[],                  -- If category='vehicle', which types (null = all)
  
  -- Submission Configuration
  submission_type text NOT NULL CHECK (submission_type IN (
    'document_upload',    -- Upload PDF/image
    'photo',              -- Take/upload photo (camera-first UX)
    'signature',          -- E-signature on agreement
    'form',               -- Fill out structured form
    'admin_verified',     -- Admin marks complete manually
    'date_entry'          -- Driver enters date only
  )),
  
  -- Form configuration (if submission_type = 'form')
  form_schema     jsonb,                   -- JSON schema for form fields
  
  -- Document for signature (if submission_type = 'signature')
  signature_document_url text,             -- PDF/document to sign
  
  -- Expiration Configuration
  expiration_type text NOT NULL DEFAULT 'never' CHECK (expiration_type IN (
    'never',              -- One-time, never expires
    'fixed_interval',     -- Valid for N days/months/years from approval
    'driver_specified'    -- Driver enters expiration date
  )),
  expiration_interval_days integer,        -- If fixed_interval, number of days
  expiration_warning_days integer DEFAULT 30, -- Days before expiration to warn
  
  -- Grace Period (for new credentials added to existing drivers)
  grace_period_days integer DEFAULT 30,    -- Days for existing drivers to submit
  
  -- Ordering
  display_order   integer DEFAULT 0,
  
  -- Metadata
  is_active       boolean NOT NULL DEFAULT true,
  is_seeded       boolean NOT NULL DEFAULT false, -- Created by Super Admin template
  
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT broker_required_for_broker_scope 
    CHECK (scope = 'global' OR broker_id IS NOT NULL),
  CONSTRAINT vehicle_types_only_for_vehicle_category
    CHECK (category = 'driver' OR vehicle_types IS NOT NULL OR vehicle_types IS NULL)
);

CREATE INDEX idx_credential_types_company ON credential_types(company_id);
CREATE INDEX idx_credential_types_broker ON credential_types(broker_id);
CREATE INDEX idx_credential_types_active ON credential_types(company_id, is_active);

-- RLS
ALTER TABLE credential_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view credential types"
  ON credential_types FOR SELECT
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

CREATE POLICY "Admins can manage credential types"
  ON credential_types FOR ALL
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

### Credential Instance Schema

```sql
-- Actual credential submissions (detailed in AD-006)
CREATE TABLE driver_credentials (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id           uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  credential_type_id  uuid NOT NULL REFERENCES credential_types(id) ON DELETE CASCADE,
  company_id          uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Status
  status              text NOT NULL DEFAULT 'not_submitted' CHECK (status IN (
    'not_submitted',
    'pending_review',
    'approved',
    'rejected',
    'expired'
  )),
  
  -- Submission data (varies by submission_type)
  document_url        text,                -- For document_upload, photo
  signature_data      jsonb,               -- For signature (signature image, timestamp, IP)
  form_data           jsonb,               -- For form submissions
  entered_date        date,                -- For date_entry
  notes               text,                -- Driver notes on submission
  
  -- Expiration
  expires_at          timestamptz,         -- Calculated or driver-specified
  
  -- Review
  reviewed_at         timestamptz,
  reviewed_by         uuid REFERENCES users(id),
  review_notes        text,                -- Admin notes (internal)
  rejection_reason    text,                -- Shown to driver if rejected
  
  -- Grace period tracking
  grace_period_ends   timestamptz,         -- For new required credentials
  
  -- Timestamps
  submitted_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(driver_id, credential_type_id)
);

CREATE INDEX idx_driver_credentials_driver ON driver_credentials(driver_id);
CREATE INDEX idx_driver_credentials_status ON driver_credentials(status);
CREATE INDEX idx_driver_credentials_expiring ON driver_credentials(expires_at) 
  WHERE status = 'approved';

-- Vehicle credentials follow same pattern
CREATE TABLE vehicle_credentials (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  credential_type_id  uuid NOT NULL REFERENCES credential_types(id) ON DELETE CASCADE,
  company_id          uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Same fields as driver_credentials...
  status              text NOT NULL DEFAULT 'not_submitted' CHECK (status IN (
    'not_submitted',
    'pending_review',
    'approved',
    'rejected',
    'expired'
  )),
  
  document_url        text,
  signature_data      jsonb,
  form_data           jsonb,
  entered_date        date,
  notes               text,
  
  expires_at          timestamptz,
  
  reviewed_at         timestamptz,
  reviewed_by         uuid REFERENCES users(id),
  review_notes        text,
  rejection_reason    text,
  
  grace_period_ends   timestamptz,
  
  submitted_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(vehicle_id, credential_type_id)
);

-- RLS for credentials
ALTER TABLE driver_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_credentials ENABLE ROW LEVEL SECURITY;

-- Drivers can see their own credentials
CREATE POLICY "Drivers can view own credentials"
  ON driver_credentials FOR SELECT
  USING (
    driver_id = (
      SELECT id FROM drivers 
      WHERE user_id = auth.uid()
    )
  );

-- Admins/Coordinators can view all company credentials
CREATE POLICY "Company staff can view credentials"
  ON driver_credentials FOR SELECT
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );
```

### Super Admin Credential Templates

```sql
-- Templates for Super Admin to seed into new companies
CREATE TABLE credential_type_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template info
  name            text NOT NULL,
  description     text,
  
  -- Configuration (same as credential_types)
  category        text NOT NULL CHECK (category IN ('driver', 'vehicle')),
  submission_type text NOT NULL,
  employment_type text NOT NULL DEFAULT 'both',
  requirement     text NOT NULL DEFAULT 'required',
  expiration_type text NOT NULL DEFAULT 'never',
  expiration_interval_days integer,
  expiration_warning_days integer DEFAULT 30,
  
  -- Form/signature config
  form_schema     jsonb,
  signature_document_url text,
  
  -- Metadata
  is_active       boolean NOT NULL DEFAULT true,
  display_order   integer DEFAULT 0,
  
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS - Super Admin only
ALTER TABLE credential_type_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins can manage templates"
  ON credential_type_templates FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Everyone can view templates"
  ON credential_type_templates FOR SELECT
  USING (is_active = true);
```

---

## User Stories

### Admin Stories

1. **As an Admin**, I want to view all credential types so that I can understand what's required.

2. **As an Admin**, I want to create a new credential type so that I can add requirements for my drivers/vehicles.

3. **As an Admin**, I want to configure how a credential is submitted (upload, signature, form, etc.) so that drivers know what to provide.

4. **As an Admin**, I want to set expiration rules so that credentials are kept current.

5. **As an Admin**, I want to specify if a credential applies to W2, 1099, or both so that requirements match employment type.

6. **As an Admin**, I want to tie vehicle credentials to specific vehicle types so that only relevant vehicles need them.

7. **As an Admin**, I want to edit a credential type so that I can update requirements.

8. **As an Admin**, I want to deactivate a credential type so that it's no longer required (without deleting history).

9. **As an Admin**, I want to reorder credential types so that the most important appear first.

10. **As an Admin**, I want to set a grace period for new required credentials so that existing drivers have time to submit.

### Super Admin Stories

11. **As a Super Admin**, I want to create credential type templates so that new companies get sensible defaults.

12. **As a Super Admin**, I want to select which templates to seed when creating a company so that setup is fast.

---

## UI Specifications

### 1. Credential Types List

**Route:** `/admin/settings/credentials`

**Access:** Admin only (Coordinators cannot access)

**Component:** `EnhancedDataView` (card/table toggle)

```
┌─────────────────────────────────────────────────────────────────┐
│  Credential Types                        [Card|Table] [+ Add]   │
├─────────────────────────────────────────────────────────────────┤
│  [Search...]  [Category ▼]  [Scope ▼]  [Status ▼]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Global Driver Credentials                                      │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📄 Background Check                        Required      │   │
│  │    Driver • Document Upload • Never Expires             │   │
│  │    W2 & 1099                                            │   │
│  │                                    [Edit] [Deactivate]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✍️ Driver Agreement                        Required      │   │
│  │    Driver • Signature • Never Expires                   │   │
│  │    W2 & 1099                                            │   │
│  │                                    [Edit] [Deactivate]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📷 Driver's License Photos                 Required      │   │
│  │    Driver • Photo • Driver Specifies Expiration         │   │
│  │    W2 & 1099                                            │   │
│  │                                    [Edit] [Deactivate]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Global Vehicle Credentials                                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📄 Vehicle Insurance                       Required      │   │
│  │    Vehicle • Document Upload • Driver Specifies Exp.    │   │
│  │    All vehicle types                                    │   │
│  │                                    [Edit] [Deactivate]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Broker: MedTrans Credentials                                   │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📄 Medicaid Certification                  Required      │   │
│  │    Driver • Document Upload • 12 months                 │   │
│  │    W2 & 1099                                            │   │
│  │                                    [Edit] [Deactivate]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Grouping:** Group by Scope (Global first), then by Category (Driver, then Vehicle)

**Card Fields:**
| Field | Display |
|-------|---------|
| Icon | Based on submission type (📄 document, 📷 photo, ✍️ signature, 📝 form, ✓ admin, 📅 date) |
| Name | Credential type name |
| Requirement | Required / Optional / Recommended badge |
| Category | Driver or Vehicle |
| Submission Type | Document Upload / Photo / Signature / Form / Admin Verified / Date Entry |
| Expiration | Never / N months / Driver Specifies |
| Employment Type | W2 & 1099 / W2 Only / 1099 Only |
| Vehicle Types | (for vehicle category) All types or specific list |

**Filters:**
| Filter | Options |
|--------|---------|
| Search | Name |
| Category | All, Driver, Vehicle |
| Scope | All, Global, Broker: [list] |
| Status | Active, Inactive |

---

### 2. Create/Edit Credential Type

**Trigger:** "+ Add" button or "Edit" action

**Component:** `ElevatedContainer` with `FormToggle` tabs

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Credential Type                                    [X]  │
├─────────────────────────────────────────────────────────────────┤
│  [Basic Info]  [Submission]  [Expiration]  [Requirements]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│  BASIC INFO TAB                                                 │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  Name *                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Background Check                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Description & Instructions                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Rich Text Editor]                                      │   │
│  │                                                         │   │
│  │ Upload your background check certificate from an        │   │
│  │ approved provider. Accepted formats: PDF, JPG, PNG      │   │
│  │                                                         │   │
│  │ [B] [I] [Link] [Image] [List]                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Category *                                                     │
│  ○ Driver Credential    ○ Vehicle Credential                   │
│                                                                 │
│  Scope *                                                        │
│  ○ Global (Required for all)                                   │
│  ○ Broker-Specific                                             │
│                                                                 │
│  [If Broker-Specific selected:]                                │
│  Broker *                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▼ Select broker                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ═══════════════════════════════════════════════════════════   │
│  SUBMISSION TAB                                                 │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  How should drivers submit this credential? *                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ 📄 Document Upload                                    │   │
│  │   Driver uploads a PDF or image file                    │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ○ 📷 Photo Capture                                      │   │
│  │   Driver takes or uploads a photo (camera-first)        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ○ ✍️ E-Signature                                        │   │
│  │   Driver signs a document electronically                │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ○ 📝 Form Submission                                    │   │
│  │   Driver fills out a custom form                        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ○ ✓ Admin Verified                                      │   │
│  │   Admin manually marks as complete                      │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ○ 📅 Date Entry                                         │   │
│  │   Driver enters a date (e.g., last drug test)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [If E-Signature selected:]                                    │
│  Document to Sign *                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Upload PDF]  or  [Create from template]               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [If Form selected:]                                           │
│  Form Builder                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Form field configuration - future spec]               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ═══════════════════════════════════════════════════════════   │
│  EXPIRATION TAB                                                 │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  Does this credential expire? *                                 │
│                                                                 │
│  ○ Never expires (one-time completion)                         │
│  ○ Fixed interval (valid for set period after approval)        │
│  ○ Driver specifies (driver enters expiration date)            │
│                                                                 │
│  [If Fixed Interval selected:]                                 │
│  Valid for *                                                    │
│  ┌──────────┐  ┌─────────────────────────────┐                 │
│  │ 12       │  │ ▼ Months                    │                 │
│  └──────────┘  └─────────────────────────────┘                 │
│                                                                 │
│  Warning Threshold                                              │
│  Notify when credential expires within:                         │
│  ┌──────────┐  days                                            │
│  │ 30       │                                                   │
│  └──────────┘                                                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ═══════════════════════════════════════════════════════════   │
│  REQUIREMENTS TAB                                               │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  Requirement Level *                                            │
│  ○ Required - Must be completed to be eligible                 │
│  ○ Recommended - Shows warning but doesn't block               │
│  ○ Optional - Nice to have                                     │
│                                                                 │
│  Employment Type *                                              │
│  ○ Both W2 and 1099                                            │
│  ○ W2 Only                                                     │
│  ○ 1099 Only                                                   │
│                                                                 │
│  [If Category = Vehicle:]                                       │
│  Vehicle Types *                                                │
│  ☑ Sedan                                                       │
│  ☑ Wheelchair Van                                              │
│  ☑ Stretcher Van                                               │
│  ☐ [Select All]                                                │
│                                                                 │
│  Grace Period for Existing Drivers                              │
│  When this credential is created, existing drivers have:        │
│  ┌──────────┐  days to submit                                  │
│  │ 30       │                                                   │
│  └──────────┘                                                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save Credential Type]   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Credential Type Detail View

**Trigger:** Click on credential type card

**Shows:**
- All configuration details
- Usage statistics (how many drivers/vehicles have submitted)
- Status breakdown (approved, pending, missing, expired)
- Quick actions (Edit, Deactivate)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Credential Types                                     │
│                                                                 │
│  📄 Background Check                          ● Active          │
│  Driver • Global • Required                                     │
│                                                                 │
│  [Edit]  [Deactivate]                                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Configuration                                                  │
│  ───────────────────────────────────────────────────────────── │
│  Submission Type      Document Upload                           │
│  Employment Type      W2 & 1099                                 │
│  Expiration           Never expires                             │
│  Warning Threshold    30 days                                   │
│  Grace Period         30 days for new drivers                   │
│                                                                 │
│  Description                                                    │
│  ───────────────────────────────────────────────────────────── │
│  Upload your background check certificate from an approved      │
│  provider. Accepted formats: PDF, JPG, PNG                      │
│                                                                 │
│  Submission Statistics                                          │
│  ───────────────────────────────────────────────────────────── │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 42           │  │ 38           │  │ 3            │          │
│  │ Total        │  │ Approved     │  │ Pending      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ 1            │  │ 0            │                            │
│  │ Rejected     │  │ Expired      │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                 │
│  [View All Submissions →]                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4. Deactivate Credential Type Modal

**Trigger:** Deactivate button

```
┌─────────────────────────────────────────────────────────────────┐
│  Deactivate Credential Type                                [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Are you sure you want to deactivate "Background Check"?        │
│                                                                 │
│  • This credential will no longer be required                   │
│  • Existing submissions will be preserved                       │
│  • Drivers will no longer see this in their portal              │
│  • You can reactivate it later                                  │
│                                                                 │
│  ⚠️ 38 drivers have approved submissions for this credential    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Deactivate]             │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. Super Admin: Template Management

**Route:** `/super-admin/settings/credential-templates`

```
┌─────────────────────────────────────────────────────────────────┐
│  Credential Type Templates                         [+ Add]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  These templates can be seeded into new companies.              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ Background Check                                      │   │
│  │   Driver • Document Upload • Never Expires              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ Driver's License Photos                               │   │
│  │   Driver • Photo • Driver Specifies Expiration          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ Vehicle Insurance                                     │   │
│  │   Vehicle • Document Upload • Driver Specifies Exp.     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ Vehicle Registration                                  │   │
│  │   Vehicle • Document Upload • Driver Specifies Exp.     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**During Company Creation (SA-001):**

```
┌─────────────────────────────────────────────────────────────────┐
│  Default Credentials                                            │
│                                                                 │
│  Select credential types to seed for this company:              │
│                                                                 │
│  ☑ Background Check                                            │
│  ☑ Driver's License Photos                                     │
│  ☑ Vehicle Insurance                                           │
│  ☑ Vehicle Registration                                        │
│  ☐ HIPAA Training (optional)                                   │
│                                                                 │
│  Admins can modify or add to these after company is created.   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### AC-1: View Credential Types

- [ ] Admin can view all credential types for their company
- [ ] Types are grouped by scope (Global first, then by Broker)
- [ ] Within scope, grouped by category (Driver, then Vehicle)
- [ ] Shows submission type icon, name, requirement level, configuration
- [ ] Can filter by category, scope, status
- [ ] Can search by name
- [ ] Coordinators cannot access this page

### AC-2: Create Credential Type

- [ ] Admin can create new credential type
- [ ] Required fields: name, category, scope, submission type
- [ ] If scope=broker, broker selection is required
- [ ] Can configure expiration (never, fixed interval, driver specifies)
- [ ] Can set warning threshold days
- [ ] Can set requirement level (required, optional, recommended)
- [ ] Can set employment type (both, w2_only, 1099_only)
- [ ] If category=vehicle, can select applicable vehicle types
- [ ] Can set grace period for existing drivers
- [ ] Description supports rich text with images

### AC-3: Submission Type Configuration

- [ ] Document Upload: No additional config needed
- [ ] Photo: No additional config needed (camera-first UX on driver side)
- [ ] E-Signature: Upload document to sign
- [ ] Form: Configure form fields (JSON schema)
- [ ] Admin Verified: No driver action, admin marks complete
- [ ] Date Entry: No additional config needed

### AC-4: Edit Credential Type

- [ ] Admin can edit any field
- [ ] Changes apply to future submissions
- [ ] Existing approved submissions remain valid
- [ ] Warning shown if changing requirements on active credential

### AC-5: Deactivate Credential Type

- [ ] Admin can deactivate credential type
- [ ] Shows count of existing submissions
- [ ] Deactivated types hidden from driver view
- [ ] Existing submissions preserved
- [ ] Can reactivate later

### AC-6: Reorder Credential Types

- [ ] Admin can drag to reorder within groups
- [ ] Order reflected in driver portal

### AC-7: Grace Period

- [ ] New required credentials show grace period for existing drivers
- [ ] Grace period countdown visible
- [ ] After grace period, credential shows as "missing"

### AC-8: Super Admin Templates

- [ ] Super Admin can create/edit/delete templates
- [ ] Templates available during company creation
- [ ] Selected templates seeded to new company
- [ ] Seeded types marked `is_seeded=true`
- [ ] Admin can modify seeded types

---

## Business Rules

1. **Scope is immutable after creation** - Cannot change from global to broker or vice versa (would break existing submissions)

2. **Category is immutable after creation** - Cannot change from driver to vehicle

3. **Broker-specific credentials** - Only shown to drivers assigned to that broker

4. **Vehicle type filtering** - Vehicle credentials only apply to specified vehicle types

5. **Employment type filtering** - W2-only credentials don't appear for 1099 drivers

6. **Grace period** - When new required credential created:
   - Calculate `grace_period_ends` for all existing relevant drivers/vehicles
   - Create `not_submitted` credential instances with grace period set
   - After grace period ends, shows as missing

7. **Deactivation** - Soft delete:
   - `is_active = false`
   - Hidden from driver portal
   - Not required for eligibility
   - Submissions preserved for records

8. **Expiration calculation:**
   - `never`: `expires_at = null`
   - `fixed_interval`: `expires_at = approved_at + interval_days`
   - `driver_specified`: `expires_at = driver_entered_date`

9. **Warning threshold** - System marks credentials as "expiring soon" when within threshold

---

## API/Queries

### Get Credential Types

```typescript
const { data: credentialTypes } = await supabase
  .from('credential_types')
  .select(`
    *,
    broker:brokers(id, name)
  `)
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('scope')
  .order('category')
  .order('display_order');
```

### Get Credential Types for Driver

```typescript
// Get only credentials relevant to this driver
async function getCredentialTypesForDriver(driverId: string) {
  const driver = await getDriver(driverId);
  
  // Get global credentials matching employment type
  const globalCreds = await supabase
    .from('credential_types')
    .select('*')
    .eq('company_id', driver.company_id)
    .eq('scope', 'global')
    .eq('category', 'driver')
    .eq('is_active', true)
    .or(`employment_type.eq.both,employment_type.eq.${driver.employment_type}`);
  
  // Get broker-specific credentials for assigned brokers
  const assignedBrokerIds = await getDriverAssignedBrokers(driverId);
  const brokerCreds = await supabase
    .from('credential_types')
    .select('*')
    .eq('company_id', driver.company_id)
    .eq('scope', 'broker')
    .eq('category', 'driver')
    .eq('is_active', true)
    .in('broker_id', assignedBrokerIds)
    .or(`employment_type.eq.both,employment_type.eq.${driver.employment_type}`);
  
  return [...globalCreds.data, ...brokerCreds.data];
}
```

### Create Credential Type

```typescript
async function createCredentialType(data: CreateCredentialTypeInput) {
  const { data: credType } = await supabase
    .from('credential_types')
    .insert({
      company_id: data.companyId,
      name: data.name,
      description: data.description,
      category: data.category,
      scope: data.scope,
      broker_id: data.brokerId,
      submission_type: data.submissionType,
      employment_type: data.employmentType,
      requirement: data.requirement,
      vehicle_types: data.vehicleTypes,
      expiration_type: data.expirationType,
      expiration_interval_days: data.expirationIntervalDays,
      expiration_warning_days: data.expirationWarningDays,
      grace_period_days: data.gracePeriodDays,
      form_schema: data.formSchema,
      signature_document_url: data.signatureDocumentUrl,
      created_by: currentUser.id,
    })
    .select()
    .single();
  
  // If required, create credential instances for existing drivers/vehicles
  if (data.requirement === 'required') {
    await seedCredentialInstances(credType);
  }
  
  return credType;
}

// Seed credential instances with grace period
async function seedCredentialInstances(credType: CredentialType) {
  const gracePeriodEnds = addDays(new Date(), credType.grace_period_days);
  
  if (credType.category === 'driver') {
    // Get relevant drivers
    const drivers = await supabase
      .from('drivers')
      .select('id')
      .eq('company_id', credType.company_id)
      .neq('status', 'archived');
    
    // Filter by employment type if needed
    // Filter by broker assignment if broker-scoped
    
    // Create instances
    const instances = drivers.data.map(d => ({
      driver_id: d.id,
      credential_type_id: credType.id,
      company_id: credType.company_id,
      status: 'not_submitted',
      grace_period_ends: gracePeriodEnds,
    }));
    
    await supabase.from('driver_credentials').insert(instances);
  }
  // Similar for vehicles...
}
```

---

## Dependencies

- `02-DATABASE-SCHEMA.md` - Base tables
- AD-007 - Broker Management (for broker-specific credentials)
- AD-003 - Vehicle Management (for vehicle types)
- SA-001 - Company Management (for template seeding)

---

## Related Features

- **AD-006: Credential Review** - Admin reviews submitted credentials
- **DR-004: Credential Submission** - Driver submits credentials

---

## Testing Requirements

### Integration Tests

```typescript
describe('AD-005: Credential Types', () => {
  describe('Create Credential Type', () => {
    it('creates global driver credential');
    it('creates broker-specific credential with broker_id');
    it('creates vehicle credential with vehicle types');
    it('seeds instances for existing drivers when required');
    it('sets grace period on seeded instances');
    it('validates scope/broker constraint');
  });
  
  describe('Get Credentials for Driver', () => {
    it('returns global credentials matching employment type');
    it('excludes w2_only credentials for 1099 driver');
    it('returns broker credentials only for assigned brokers');
    it('excludes inactive credential types');
  });
  
  describe('Deactivate', () => {
    it('sets is_active=false');
    it('preserves existing submissions');
    it('removes from driver eligibility calculation');
  });
  
  describe('Super Admin Templates', () => {
    it('creates template');
    it('seeds templates to new company');
    it('marks seeded types with is_seeded=true');
  });
});
```

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-16 | Initial spec | - |
