# CRED-001: Credential Publishing System

> **For AI Implementation**: Copy this entire document when starting the implementation session.

---

## Quick Links

| Document | Purpose |
|----------|---------|
| **This document** | Technical context, architecture, and implementation details |
| [`docs/CRED-001-user-stories.prompt.md`](./CRED-001-user-stories.prompt.md) | User stories with acceptance criteria (implement in order listed) |

---

## Implementation Instructions

1. **Read this document first** for full technical context
2. **Implement stories from** `CRED-001-user-stories.prompt.md` in the recommended order
3. **Start with** Story T1 (Database Migration), then T3 (Type Safety)
4. **Test each story** against its acceptance criteria before moving to next
5. **Do not skip** the migration - all other work depends on it

---

## Overview

Add a draft/publish workflow for credential types, allowing admins to safely build credentials without immediately affecting drivers. Includes scheduling effective dates and grace period visibility.

**Problem:**
Currently, when an admin sets a credential type to `is_active = true`, it immediately becomes visible to all qualifying drivers. There's no way to:
- Work on a credential without affecting drivers (draft mode)
- Schedule when a credential goes live (effective date)
- Show drivers when credentials are due (grace period visibility)

**Solution:**
Replace the simple `is_active` boolean with a status-based lifecycle that includes drafts, scheduling, and proper grace period tracking.

---

## Current State Analysis

### Credential Type Lifecycle (Current)

```
┌─────────────┐         ┌─────────────┐
│   Create    │────────▶│   Active    │
│ (is_active  │         │ (is_active  │
│   = true)   │         │   = true)   │
└─────────────┘         └─────────────┘
                              │
                              ▼
                        ┌─────────────┐
                        │  Inactive   │
                        │ (is_active  │
                        │   = false)  │
                        └─────────────┘
```

**Issues:**
1. No draft state - credentials are visible immediately when created
2. No scheduling - no way to set a future "go live" date
3. Grace period fields exist but are not populated or displayed
4. Admin must toggle `is_active` manually to control visibility

### Relevant Database Schema (Current)

**`credential_types` table:**
```sql
-- Key fields
id UUID PRIMARY KEY
name TEXT NOT NULL
is_active BOOLEAN NOT NULL DEFAULT true
grace_period_days INTEGER DEFAULT 30
-- No effective_date, published_at, or status fields
```

**`driver_credentials` table:**
```sql
-- Key fields  
grace_period_ends TIMESTAMPTZ  -- Exists but never populated
```

### Current RPC Functions

**`get_driver_required_credentials(p_driver_id)`** in `supabase/migrations/024_credential_type_refactor.sql`:
```sql
-- Current filter (line ~72)
WHERE ct.is_active = true
  AND ct.company_id = driver_company
  -- ... employment type and scope filters
```

Credentials appear to drivers immediately when `is_active = true`.

### Files Involved

| File | Purpose |
|------|---------|
| `src/types/credential.ts` | TypeScript types for credentials |
| `src/services/credentialTypes.ts` | CRUD operations for credential types |
| `src/services/credentials.ts` | Driver credential operations, display status |
| `src/pages/admin/CredentialTypeEditor.tsx` | Admin editor page |
| `src/components/features/admin/credential-builder/AIBuilderTwoPanel.tsx` | AI builder component |
| `supabase/migrations/024_credential_type_refactor.sql` | RPC functions |
| `src/pages/driver/Credentials.tsx` | Driver credentials page |
| `src/components/features/driver/DriverCredentialCard.tsx` | Driver credential display |

---

## Proposed Solution

### New Credential Lifecycle

```
┌─────────┐    Publish     ┌───────────┐   Effective    ┌─────────┐
│  Draft  │───────────────▶│ Scheduled │──────────────▶│ Active  │
│         │   (future      │           │  date reached  │         │
│         │    date)       │           │                │         │
└─────────┘                └───────────┘                └─────────┘
     │                                                       │
     │         Publish                                       │
     │        (now)                                          ▼
     └──────────────────────────────────────────────▶ ┌─────────┐
                                                      │Inactive │
                                          Deactivate  │         │
                                      ◀───────────────┤         │
                                                      └─────────┘
```

**States:**
- `draft` - Work in progress, NOT visible to drivers
- `scheduled` - Published with future effective date, NOT yet visible
- `active` - Visible to drivers, grace period applies
- `inactive` - Deactivated, hidden from drivers

### Database Schema Changes

**New columns for `credential_types`:**

```sql
-- Add to credential_types table
status TEXT NOT NULL DEFAULT 'draft' 
  CHECK (status IN ('draft', 'scheduled', 'active', 'inactive'))
effective_date TIMESTAMPTZ           -- When credential becomes active
published_at TIMESTAMPTZ             -- When admin clicked publish
published_by UUID REFERENCES profiles(id)  -- Who published
```

**Migration strategy:**
```sql
-- Migrate existing data
UPDATE credential_types 
SET status = CASE 
    WHEN is_active = true THEN 'active' 
    ELSE 'inactive' 
  END,
  effective_date = created_at,
  published_at = created_at;
```

### RPC Function Changes

**Update `get_driver_required_credentials()`:**

```sql
-- Change from:
WHERE ct.is_active = true

-- To:
WHERE ct.status = 'active' 
  AND (ct.effective_date IS NULL OR ct.effective_date <= NOW())
```

This ensures:
1. Only `active` status credentials are returned
2. Credentials with future `effective_date` are excluded
3. Backward compatible (existing active credentials have `effective_date` = `created_at`)

### Grace Period Calculation

**When a credential becomes active:**
- For existing drivers: `grace_period_ends = effective_date + grace_period_days`
- For new drivers (joined after effective_date): `grace_period_ends = driver.created_at + grace_period_days`

**Display logic in `computeDisplayStatus()`:**
```typescript
if (credential.status === 'not_submitted') {
  const gracePeriodEnds = calculateGracePeriodEnd(credential, credentialType, driver);
  
  if (gracePeriodEnds && new Date() < gracePeriodEnds) {
    return { status: 'grace_period', dueDate: gracePeriodEnds };
  } else if (gracePeriodEnds && new Date() >= gracePeriodEnds) {
    return { status: 'missing' }; // Visual only in Phase 1
  }
  return { status: 'not_submitted' };
}
```

---

## Admin UX Specifications

### Credential Status Badge

Display in header of credential editor:

| Status | Badge | Color |
|--------|-------|-------|
| Draft | `Draft` | Gray/Secondary |
| Scheduled | `Scheduled · Mar 15, 2026` | Blue/Info |
| Active | `Active` | Green/Success |
| Inactive | `Inactive` | Red/Destructive |

### Save vs Publish Actions

**In AI Builder (`AIBuilderTwoPanel`):**

| Credential Status | Primary Button | Secondary Action |
|-------------------|----------------|------------------|
| Draft | `Save Draft` | `Publish...` dropdown |
| Scheduled | `Save Changes` | `Edit Schedule...` |
| Active | `Save Changes` | — |
| Inactive | `Save Changes` | `Reactivate` |

### Publish Dialog

When admin clicks "Publish":

```
┌─────────────────────────────────────────────────────────────────┐
│  Publish Credential                                        [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  When should this credential become active?                     │
│                                                                 │
│  ○ Publish Now                                                  │
│    Drivers will see this immediately                            │
│                                                                 │
│  ○ Schedule for later                                           │
│    ┌─────────────────────────────────────────────┐              │
│    │  📅  March 15, 2026                         │              │
│    └─────────────────────────────────────────────┘              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ℹ️  Grace Period: 30 days                                   ││
│  │    Existing drivers will have until [date] to comply        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│                              [Cancel]  [Publish]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Status Transitions

| Current Status | Allowed Actions |
|----------------|-----------------|
| Draft | Save Draft, Publish (now or scheduled) |
| Scheduled | Save, Edit Schedule, Cancel (return to draft) |
| Active | Save, Deactivate |
| Inactive | Save, Reactivate |

**Restrictions:**
- Cannot return to draft if any driver has started submission
- Cannot delete active/scheduled credentials with submissions

---

## Driver UX Specifications

### Grace Period Display

**Credential card states:**

| State | Badge | Description |
|-------|-------|-------------|
| Grace Period | `Due by Mar 15` (Yellow) | Within grace period, not yet submitted |
| Missing | `Missing` (Red) | Past grace period, not submitted |
| Not Submitted | `Not Submitted` (Gray) | No grace period (new credential type) |

### Credentials List

```
┌─────────────────────────────────────────────────────────────────┐
│  Driver's License                              [Due by Mar 15]  │
│  Upload your driver's license                                   │
│                                                       [Start →] │
├─────────────────────────────────────────────────────────────────┤
│  Insurance Card                                      [Missing]  │
│  Upload your auto insurance card                                │
│                                                       [Start →] │
├─────────────────────────────────────────────────────────────────┤
│  Background Check                                   [Complete]  │
│  Approved on Feb 1, 2026                                        │
│                                                        [View →] │
└─────────────────────────────────────────────────────────────────┘
```

---

## TypeScript Type Changes

**File:** `src/types/credential.ts`

```typescript
// New status type
export type CredentialTypeStatus = 'draft' | 'scheduled' | 'active' | 'inactive';

// Update CredentialType interface
export interface CredentialType {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: 'driver' | 'vehicle';
  scope: 'global' | 'broker';
  broker_id: string | null;
  
  // NEW: Publishing fields
  status: CredentialTypeStatus;
  effective_date: string | null;
  published_at: string | null;
  published_by: string | null;
  
  // DEPRECATED: Keep for backward compatibility during migration
  is_active: boolean;
  
  // Existing fields
  grace_period_days: number;
  // ... rest of fields
}

// New display status for drivers
export type CredentialDisplayStatus = 
  | 'not_submitted'
  | 'grace_period'    // NEW
  | 'missing'         // NEW
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'expiring';

export interface CredentialDisplayInfo {
  status: CredentialDisplayStatus;
  dueDate?: Date;     // For grace_period status
  expiresAt?: Date;   // For expiring status
}
```

---

## Service Layer Changes

### New Functions

**File:** `src/services/credentialTypes.ts`

```typescript
/**
 * Publish a credential type (immediately or scheduled)
 */
export async function publishCredentialType(
  credentialTypeId: string,
  effectiveDate?: Date // If provided, schedules for future
): Promise<CredentialType> {
  const status = effectiveDate && effectiveDate > new Date() 
    ? 'scheduled' 
    : 'active';
  
  const { data, error } = await supabase
    .from('credential_types')
    .update({
      status,
      effective_date: effectiveDate?.toISOString() ?? new Date().toISOString(),
      published_at: new Date().toISOString(),
      published_by: (await supabase.auth.getUser()).data.user?.id,
      is_active: status === 'active', // Keep in sync for backward compat
    })
    .eq('id', credentialTypeId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

/**
 * Unpublish a credential type (return to draft)
 * Only allowed if no submissions exist
 */
export async function unpublishCredentialType(
  credentialTypeId: string
): Promise<CredentialType> {
  // Check for existing submissions first
  const { count } = await supabase
    .from('driver_credentials')
    .select('*', { count: 'exact', head: true })
    .eq('credential_type_id', credentialTypeId)
    .neq('status', 'not_submitted');
    
  if (count && count > 0) {
    throw new Error('Cannot unpublish: drivers have already submitted');
  }
  
  const { data, error } = await supabase
    .from('credential_types')
    .update({
      status: 'draft',
      effective_date: null,
      published_at: null,
      published_by: null,
      is_active: false,
    })
    .eq('id', credentialTypeId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}
```

### Updated Functions

**File:** `src/services/credentials.ts`

Update `computeDisplayStatus()` to handle grace periods:

```typescript
export function computeDisplayStatus(
  credential: DriverCredential | null,
  credentialType: CredentialType,
  driverCreatedAt: Date
): CredentialDisplayInfo {
  // Not submitted - check grace period
  if (!credential || credential.status === 'not_submitted') {
    const gracePeriodEnds = calculateGracePeriodEnd(
      credentialType,
      driverCreatedAt
    );
    
    if (gracePeriodEnds) {
      const now = new Date();
      if (now < gracePeriodEnds) {
        return { status: 'grace_period', dueDate: gracePeriodEnds };
      } else {
        return { status: 'missing' };
      }
    }
    
    return { status: 'not_submitted' };
  }
  
  // ... existing status logic
}

function calculateGracePeriodEnd(
  credentialType: CredentialType,
  driverCreatedAt: Date
): Date | null {
  if (!credentialType.effective_date || !credentialType.grace_period_days) {
    return null;
  }
  
  const effectiveDate = new Date(credentialType.effective_date);
  
  // Use later of: effective date or driver join date
  const baseDate = driverCreatedAt > effectiveDate ? driverCreatedAt : effectiveDate;
  
  const gracePeriodEnds = new Date(baseDate);
  gracePeriodEnds.setDate(gracePeriodEnds.getDate() + credentialType.grace_period_days);
  
  return gracePeriodEnds;
}
```

---

## Migration Plan

### Phase 1: Schema Migration (Non-Breaking)

1. Add new columns with defaults
2. Migrate existing data
3. Keep `is_active` in sync via trigger

```sql
-- Migration: 030_credential_publishing.sql

-- Step 1: Add new columns
ALTER TABLE credential_types
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS effective_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES profiles(id);

-- Step 2: Add constraint
ALTER TABLE credential_types
ADD CONSTRAINT credential_types_status_check 
CHECK (status IN ('draft', 'scheduled', 'active', 'inactive'));

-- Step 3: Migrate existing data
UPDATE credential_types 
SET 
  status = CASE WHEN is_active = true THEN 'active' ELSE 'inactive' END,
  effective_date = created_at,
  published_at = CASE WHEN is_active = true THEN created_at ELSE NULL END
WHERE status IS NULL OR status = 'draft';

-- Step 4: Set NOT NULL after migration
ALTER TABLE credential_types
ALTER COLUMN status SET NOT NULL;

-- Step 5: Update RPC function
CREATE OR REPLACE FUNCTION get_driver_required_credentials(p_driver_id UUID)
-- ... update to use status = 'active' AND effective_date <= NOW()
```

### Phase 2: UI Deployment

1. Deploy type changes
2. Deploy service changes
3. Deploy admin UI (publish dialog)
4. Deploy driver UI (grace period badges)

### Phase 3: Deprecation

1. Remove `is_active` from UI code
2. Keep `is_active` column synced via trigger for backward compat
3. Eventually remove column in future migration

---

## File-by-File Implementation Guide

### Files to Create

#### 1. `supabase/migrations/030_credential_publishing.sql`

Database migration with schema changes. See "Database Schema Changes" section above for full SQL.

**Must include:**
- Add `status`, `effective_date`, `published_at`, `published_by` columns
- Add CHECK constraint for status values
- Migrate existing data based on `is_active`
- Update `get_driver_required_credentials()` RPC function
- Update `get_vehicle_required_credentials()` RPC function (if exists)

#### 2. `src/components/features/admin/credential-builder/PublishDialog.tsx`

New dialog component for publish workflow.

**Must include:**
- Radio options: "Publish Now" vs "Schedule for later"
- Date picker for scheduled option (use existing date picker component)
- Grace period info display
- Cancel and Publish buttons
- Props: `open`, `onOpenChange`, `credentialType`, `onPublish`

---

### Files to Modify

#### 1. `src/types/credential.ts`

**Add:**
```typescript
export type CredentialTypeStatus = 'draft' | 'scheduled' | 'active' | 'inactive';
```

**Update `CredentialType` interface - add fields:**
```typescript
status: CredentialTypeStatus;
effective_date: string | null;
published_at: string | null;
published_by: string | null;
```

**Add new display status types:**
```typescript
export type CredentialDisplayStatus = 
  | 'not_submitted'
  | 'grace_period'
  | 'missing'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'expiring';
```

#### 2. `src/services/credentialTypes.ts`

**Add new functions:**
- `publishCredentialType(id, effectiveDate?)` - See "Service Layer Changes" section
- `unpublishCredentialType(id)` - See "Service Layer Changes" section

**Update existing:**
- `createCredentialType()` - Ensure new credentials start with `status: 'draft'`

#### 3. `src/services/credentials.ts`

**Update `computeDisplayStatus()` function:**
- Add grace period calculation logic
- Add `grace_period` and `missing` status handling
- See "Service Layer Changes" section for implementation

**Add helper function:**
- `calculateGracePeriodEnd(credentialType, driverCreatedAt)`

#### 4. `src/pages/admin/CredentialTypeEditor.tsx`

**Add:**
- Import `PublishDialog` component
- Status badge in header (Draft/Scheduled/Active/Inactive)
- "Publish" button that opens PublishDialog
- State for dialog open/close
- Handler for publish action

**Modify:**
- Conditionally show "Save Draft" vs "Save Changes" based on status

#### 5. `src/components/features/admin/credential-builder/AIBuilderTwoPanel.tsx`

**Add:**
- Status-aware button labels ("Save Draft" vs "Save Changes")
- Publish action (optional - may defer to parent)

**Note:** Main publish flow may be in `CredentialTypeEditor.tsx` - keep AIBuilder focused on saving.

#### 6. `src/pages/driver/Credentials.tsx`

**Update:**
- Handle new display statuses (`grace_period`, `missing`)
- Add status badge variants for new statuses
- Ensure "Action Needed" filter includes `grace_period` and `missing`

#### 7. `src/components/features/driver/DriverCredentialCard.tsx`

**Add:**
- "Due by [date]" badge for `grace_period` status (yellow/warning)
- "Missing" badge for `missing` status (red/destructive)
- Date formatting for due date display

---

### Key RPC Function to Update

**`get_driver_required_credentials()` in migration files:**

Change from:
```sql
WHERE ct.is_active = true
```

To:
```sql
WHERE ct.status = 'active' 
  AND (ct.effective_date IS NULL OR ct.effective_date <= NOW())
```

This ensures:
- Only `active` status credentials are returned
- Scheduled credentials with future `effective_date` are excluded

---

## Out of Scope (Phase 2: Compliance Enforcement)

The following will be implemented in a follow-up plan:

- Auto-deactivate drivers who miss grace period deadlines
- Per-broker deactivation for broker-scoped credentials
- Global deactivation for global credentials
- Admin notifications when drivers become non-compliant
- Driver notifications/reminders before grace period expires
- Compliance dashboard/reporting

---

## Testing Checklist

### Admin Scenarios

- [ ] Create new credential type - starts in `draft` status
- [ ] Edit draft credential - save works, not visible to drivers
- [ ] Publish immediately - status becomes `active`, drivers see it
- [ ] Publish with future date - status becomes `scheduled`
- [ ] Scheduled credential reaches effective date - becomes visible
- [ ] Deactivate credential - hidden from drivers
- [ ] Reactivate credential - visible again
- [ ] Cannot unpublish credential with submissions

### Driver Scenarios

- [ ] Draft credentials not visible
- [ ] Scheduled credentials not visible before effective date
- [ ] Active credentials visible with grace period badge
- [ ] Grace period countdown accurate
- [ ] "Missing" status shows after grace period expires
- [ ] New driver gets grace period from join date

### Migration Scenarios

- [ ] Existing `is_active=true` credentials become `status='active'`
- [ ] Existing `is_active=false` credentials become `status='inactive'`
- [ ] Existing credentials get `effective_date` = `created_at`
- [ ] No disruption to current driver experience
