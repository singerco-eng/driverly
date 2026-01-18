# SA-001: Company Management

> **Last Updated:** 2026-01-16  
> **Status:** Draft  
> **Phase:** 1 - Super Admin MVP

---

## Overview

Company Management allows Super Admins to create, view, edit, and manage tenant companies on the Driverly platform. This is the foundational feature that enables multi-tenancy.

---

## User Stories

### Primary Stories

1. **As a Super Admin**, I want to create a new company so that a new NEMT business can use the platform.

2. **As a Super Admin**, I want to view all companies in a searchable list so that I can quickly find and manage them.

3. **As a Super Admin**, I want to edit a company's information so that I can keep their details up to date.

4. **As a Super Admin**, I want to deactivate a company so that they can no longer access the platform while preserving their data.

5. **As a Super Admin**, I want to suspend a company (for billing issues) so that they see a specific message about why access is restricted.

6. **As a Super Admin**, I want to reactivate a company so that they can regain access to the platform.

7. **As a Super Admin**, I want to view a company's details including their admins so that I can provide support.

---

## Data Model

### Company Entity

References `02-DATABASE-SCHEMA.md` - `companies` table with these additions:

```sql
-- Additional fields for SA-001
ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  ein text,                    -- Optional EIN/Tax ID
  timezone text DEFAULT 'America/New_York',
  deactivation_reason text,    -- Why company was deactivated/suspended
  deactivated_at timestamptz,
  deactivated_by uuid REFERENCES users(id);
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Auto | Primary key |
| `name` | text | Yes | Company name |
| `slug` | text | Auto | URL identifier (auto-generated from name) |
| `email` | text | Yes | Primary contact email |
| `phone` | text | Yes | Primary contact phone |
| `address_line1` | text | No | Street address |
| `address_line2` | text | No | Suite/unit |
| `city` | text | No | City |
| `state` | text | No | State (2-letter) |
| `zip_code` | text | No | ZIP code |
| `ein` | text | No | EIN/Tax ID (optional) |
| `timezone` | text | Yes | Timezone (default: America/New_York) |
| `status` | enum | Yes | `active`, `inactive`, `suspended` |
| `deactivation_reason` | text | No | Reason displayed to locked-out users |
| `logo_url` | text | No | Uploaded logo (Supabase Storage) |
| `primary_color` | text | No | Primary brand color (HSL or hex) |
| `created_at` | timestamptz | Auto | Creation timestamp |
| `updated_at` | timestamptz | Auto | Last update timestamp |
| `created_by` | uuid | Yes | Super Admin who created |
| `deactivated_at` | timestamptz | No | When deactivated |
| `deactivated_by` | uuid | No | Who deactivated |

### Status Definitions

| Status | Description | User Experience |
|--------|-------------|-----------------|
| `active` | Company is operational | Full access |
| `inactive` | Voluntarily deactivated | Locked out, sees "Account deactivated" message |
| `suspended` | Billing/compliance issue | Locked out, sees specific reason (e.g., "Payment required") |

---

## UI Specifications

### 1. Company List View (Dashboard)

**Route:** `/super-admin/companies`

**Component:** `EnhancedDataView` (card/table toggle)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Companies                               [Card|Table] [+ New]   │
├─────────────────────────────────────────────────────────────────┤
│  [Search by name...]  [Status ▼: All]                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Company A   │  │ Company B   │  │ Company C   │             │
│  │ ● Active    │  │ ● Active    │  │ ○ Suspended │             │
│  │ 3 admins    │  │ 1 admin     │  │ 2 admins    │             │
│  │ 45 drivers  │  │ 12 drivers  │  │ 8 drivers   │             │
│  │ Jan 15 2026 │  │ Dec 3 2025  │  │ Nov 1 2025  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Card Display Fields:**
- Company name (title)
- Status badge (color-coded)
- Admin count
- Driver count
- Created date

**Table Columns:**
- Company Name
- Status
- Email
- Admins (count)
- Drivers (count)
- Created
- Actions (menu)

**Filters:**
- Search: by company name
- Status: All | Active | Inactive | Suspended

**Actions:**
- Click card/row → Company detail view
- "+" button → Create company modal

---

### 2. Create Company

**Trigger:** Click "+ New Company" button

**Component:** `ElevatedContainer` with `FormToggle` tabs

**Modal Size:** `xl` (max-w-4xl)

**Tabs:**
1. **Company Info** (default)
2. **Branding**
3. **Admin** (optional - invite first admin)

#### Tab 1: Company Info

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Company                                            [X]  │
├─────────────────────────────────────────────────────────────────┤
│  [Company Info]  [Branding]  [Admin]                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Company Name *                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │ Email *                 │  │ Phone *                 │      │
│  └─────────────────────────┘  └─────────────────────────┘      │
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │ EIN (optional)          │  │ Timezone *              │      │
│  └─────────────────────────┘  └─────────────────────────┘      │
│                                                                 │
│  Address (optional)                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Street Address                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Suite/Unit                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌───────────────┐ ┌───────┐ ┌───────────┐                     │
│  │ City          │ │ State │ │ ZIP       │                     │
│  └───────────────┘ └───────┘ └───────────┘                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Next: Branding →]       │
└─────────────────────────────────────────────────────────────────┘
```

**Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Company Name | text | Yes | Min 2 chars |
| Email | email | Yes | Valid email |
| Phone | tel | Yes | Valid phone |
| EIN | text | No | Format: XX-XXXXXXX |
| Timezone | select | Yes | US timezones list |
| Address Line 1 | text | No | - |
| Address Line 2 | text | No | - |
| City | text | No | - |
| State | select | No | US states |
| ZIP | text | No | 5 digits |

#### Tab 2: Branding

```
┌─────────────────────────────────────────────────────────────────┐
│  [Company Info]  [Branding]  [Admin]                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Company Logo                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │     [Drag & drop or click to upload]                    │   │
│  │     PNG, JPG up to 2MB                                  │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Brand Color                                                    │
│  ┌──────────┐  Primary Color                                   │
│  │  [████]  │  #3B82F6                                         │
│  └──────────┘                                                  │
│                                                                 │
│  Preview                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Logo] Company Name                                    │   │
│  │  ┌─────────────────┐                                    │   │
│  │  │ Primary Button  │  (shows gradient with color)       │   │
│  │  └─────────────────┘                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                       [← Back]  [Cancel]  [Next: Admin →]       │
└─────────────────────────────────────────────────────────────────┘
```

**Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Logo | file upload | No | PNG/JPG, max 2MB, stored in Supabase Storage |
| Primary Color | color picker | No | Hex color, used for `--primary` token |

**Color System:**
- Store primary color as hex
- On load, convert to HSL for CSS variable
- Secondary/accent derived algorithmically (complementary or analogous)
- Preview shows how buttons/gradients will look

#### Tab 3: Admin (Optional)

```
┌─────────────────────────────────────────────────────────────────┐
│  [Company Info]  [Branding]  [Admin]                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Invite Initial Admin (Optional)                                │
│                                                                 │
│  You can invite an admin now or do it later from the            │
│  company detail view.                                           │
│                                                                 │
│  ☐ Invite admin now                                             │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  (shown if checkbox checked)                                    │
│                                                                 │
│  Full Name *                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │ Email *                 │  │ Phone *                 │      │
│  └─────────────────────────┘  └─────────────────────────┘      │
│                                                                 │
│  An invitation email will be sent to this address.              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                       [← Back]  [Cancel]  [Create Company]      │
└─────────────────────────────────────────────────────────────────┘
```

**Fields (if inviting):**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Full Name | text | Yes | Min 2 chars |
| Email | email | Yes | Valid email, unique |
| Phone | tel | Yes | Valid phone |

---

### 3. Company Detail View

**Route:** `/super-admin/companies/[id]`

**Layout:** Page with sub-navigation tabs

**Sub-nav Tabs:** `ToggleTabs` (page-navigation variant)
- Overview
- Company Info
- Admins
- Billing (future - disabled for MVP)

#### Overview Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Companies                                            │
│                                                                 │
│  [Logo] Acme Transport                          [Edit] [•••]    │
│         ● Active                                                │
│                                                                 │
│  [Overview]  [Company Info]  [Admins]  [Billing]                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 3            │  │ 45           │  │ 12           │          │
│  │ Admins       │  │ Drivers      │  │ Active       │          │
│  │              │  │              │  │ Vehicles     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Jan 15, 2026 │  │ Jan 20, 2026 │  │ America/     │          │
│  │ Created      │  │ Last Active  │  │ New_York     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  Quick Actions                                                  │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │ + Invite Admin  │  │ View as Admin   │                      │
│  └─────────────────┘  └─────────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Stats Cards:**
- Admin count
- Driver count
- Active vehicle count
- Created date
- Last activity date
- Timezone

**Quick Actions:**
- Invite Admin → Opens invite modal
- View as Admin → Future: impersonation (disabled for MVP)

**Header Actions (•••) Menu:**
- Edit Company
- Deactivate Company
- Suspend Company
- (if inactive/suspended) Reactivate Company

#### Company Info Tab

Displays company information in read-only format with "Edit" button.

**Edit:** Opens `ElevatedContainer` with same form as create (pre-populated), minus the Admin tab.

#### Admins Tab

**Component:** `EnhancedDataView` (table view default)

```
┌─────────────────────────────────────────────────────────────────┐
│  Admins                                          [+ Invite]     │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Name          │ Email              │ Status    │ Actions │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ John Smith    │ john@acme.com      │ ● Active  │ [•••]   │  │
│  │ Jane Doe      │ jane@acme.com      │ ● Active  │ [•••]   │  │
│  │ Bob Wilson    │ bob@acme.com       │ ○ Pending │ [•••]   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Table Columns:**
- Name
- Email
- Phone
- Role (Admin/Coordinator)
- Status (Active/Pending Invitation)
- Invited Date
- Actions

**Row Actions (•••):**
- Resend Invitation (if pending)
- Remove Admin
- Reset Password

---

### 4. Deactivate/Suspend Modal

**Trigger:** Header actions menu → Deactivate/Suspend

**Component:** `Modal` (size: md)

```
┌─────────────────────────────────────────────────────────────────┐
│  Deactivate Company                                        [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Are you sure you want to deactivate Acme Transport?            │
│                                                                 │
│  • All admins and drivers will be locked out                    │
│  • Data will be preserved                                       │
│  • You can reactivate at any time                               │
│                                                                 │
│  Reason (shown to users)                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Account deactivated at company request                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Deactivate]             │
└─────────────────────────────────────────────────────────────────┘
```

**For Suspend:** Same layout, different copy:
- Title: "Suspend Company"
- Bullet: "Company will see the reason below when trying to log in"
- Default reason: "Account suspended - please contact support"
- Button: "Suspend"

---

## Acceptance Criteria

### AC-1: Company List

- [ ] Super Admin sees paginated list of all companies
- [ ] Can toggle between card and table view
- [ ] Can search by company name
- [ ] Can filter by status (All/Active/Inactive/Suspended)
- [ ] Each item shows: name, status, admin count, driver count, created date
- [ ] Clicking a company navigates to detail view

### AC-2: Create Company

- [ ] Can open create modal from list view
- [ ] Form has 3 tabs: Company Info, Branding, Admin
- [ ] Company Info tab validates required fields
- [ ] Slug is auto-generated from company name
- [ ] Duplicate slug shows error
- [ ] Can upload logo (PNG/JPG, max 2MB)
- [ ] Can select primary brand color
- [ ] Color preview shows how branding will look
- [ ] Can optionally invite first admin
- [ ] On submit, company is created with status "active"
- [ ] If admin invited, invitation email is sent
- [ ] Success toast shown
- [ ] Redirects to company detail view

### AC-3: Edit Company

- [ ] Can open edit modal from detail view
- [ ] Form pre-populated with current values
- [ ] Can edit all fields
- [ ] Can change logo
- [ ] Can change primary color
- [ ] On save, company is updated
- [ ] Success toast shown

### AC-4: Deactivate Company

- [ ] Can deactivate from detail view actions menu
- [ ] Must provide reason
- [ ] On confirm, status changes to "inactive"
- [ ] `deactivated_at` and `deactivated_by` are set
- [ ] Company admins/drivers can no longer log in
- [ ] Locked out users see deactivation reason

### AC-5: Suspend Company

- [ ] Can suspend from detail view actions menu
- [ ] Must provide reason
- [ ] On confirm, status changes to "suspended"
- [ ] Same lockout behavior as deactivate
- [ ] Suspended users see suspension reason

### AC-6: Reactivate Company

- [ ] Can reactivate inactive/suspended company
- [ ] On confirm, status changes to "active"
- [ ] `deactivation_reason`, `deactivated_at`, `deactivated_by` are cleared
- [ ] Company admins/drivers can log in again

### AC-7: Company Detail View

- [ ] Shows company logo and name in header
- [ ] Shows status badge
- [ ] Overview tab shows stats (admins, drivers, vehicles, dates)
- [ ] Company Info tab shows all company fields
- [ ] Admins tab shows list of company admins
- [ ] Can invite new admin from Admins tab
- [ ] Can remove admin from Admins tab
- [ ] Can resend invitation for pending admins

---

## API/Edge Functions

### Queries

```typescript
// Get all companies (Super Admin only)
const { data: companies } = await supabase
  .from('companies')
  .select(`
    *,
    admin_count:users(count).filter(role.eq.admin),
    driver_count:drivers(count)
  `)
  .order('created_at', { ascending: false });

// Get single company with admins
const { data: company } = await supabase
  .from('companies')
  .select(`
    *,
    admins:users(*)
      .filter(role.in.(admin,coordinator)),
    driver_count:drivers(count),
    vehicle_count:vehicles(count).filter(status.eq.active)
  `)
  .eq('id', companyId)
  .single();
```

### Mutations

```typescript
// Create company
const { data: company } = await supabase
  .from('companies')
  .insert({
    name,
    slug: generateSlug(name),
    email,
    phone,
    // ... other fields
    created_by: currentUser.id,
  })
  .select()
  .single();

// Update company
const { data: company } = await supabase
  .from('companies')
  .update({ ...updates, updated_at: new Date() })
  .eq('id', companyId)
  .select()
  .single();

// Deactivate/Suspend
const { data: company } = await supabase
  .from('companies')
  .update({
    status: 'inactive', // or 'suspended'
    deactivation_reason: reason,
    deactivated_at: new Date(),
    deactivated_by: currentUser.id,
  })
  .eq('id', companyId)
  .select()
  .single();

// Reactivate
const { data: company } = await supabase
  .from('companies')
  .update({
    status: 'active',
    deactivation_reason: null,
    deactivated_at: null,
    deactivated_by: null,
  })
  .eq('id', companyId)
  .select()
  .single();
```

### Edge Function: Generate Unique Slug

```typescript
// supabase/functions/generate-company-slug/index.ts
export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  let slug = baseSlug;
  let counter = 1;
  
  while (await slugExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}
```

### Edge Function: Invite Admin

See `03-AUTHENTICATION.md` for invitation flow. Creates invitation record and sends email.

---

## File Upload

### Logo Upload

**Bucket:** `company-assets`

**Path:** `{company_id}/logo.{ext}`

**Accepted types:** `image/png`, `image/jpeg`

**Max size:** 2MB

**Process:**
1. Upload to Supabase Storage
2. Get public URL
3. Update company `logo_url`

---

## Color System Integration

### Primary Color Storage

Store as hex in database: `#3B82F6`

### Runtime Application

```typescript
function applyCompanyTheme(company: Company) {
  if (!company.primary_color) return;
  
  const root = document.documentElement;
  const hsl = hexToHSL(company.primary_color);
  
  // Set primary color
  root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
  
  // Derive accent (shift hue by 30 degrees)
  const accentHue = (hsl.h + 30) % 360;
  root.style.setProperty('--accent', `${accentHue} ${hsl.s}% ${hsl.l}%`);
  
  // Update gradients
  root.style.setProperty('--gradient-primary', 
    `linear-gradient(135deg, hsl(${hsl.h} ${hsl.s}% ${hsl.l}%), hsl(${accentHue} ${hsl.s}% ${hsl.l}%))`
  );
}
```

---

## Business Rules

1. **Slug uniqueness:** Slugs must be unique across all companies
2. **Soft delete only:** Companies cannot be hard deleted
3. **Status transitions:**
   - `active` → `inactive` (deactivate)
   - `active` → `suspended` (suspend)
   - `inactive` → `active` (reactivate)
   - `suspended` → `active` (reactivate)
4. **Admin minimum:** Companies can exist without admins (Super Admin manages)
5. **Timezone required:** Default to America/New_York

---

## Dependencies

- `02-DATABASE-SCHEMA.md` - companies table
- `03-AUTHENTICATION.md` - invitation flow (SA-002)
- Supabase Storage - logo uploads

---

## Out of Scope

- Billing management (SA-003)
- Default credential seeding (future enhancement)
- Company impersonation (future feature)
- Activity/audit logging
- Bulk company operations

---

## Testing Requirements

### Integration Tests

Per `05-TESTING-STRATEGY.md`, write tests BEFORE implementation:

```typescript
// tests/integration/super-admin/company-management.test.ts

describe('SA-001: Company Management', () => {
  describe('AC-1: Company List', () => {
    it('returns all companies for super admin');
    it('returns company counts (admins, drivers)');
    it('filters by status');
    it('searches by name');
  });
  
  describe('AC-2: Create Company', () => {
    it('creates company with required fields');
    it('auto-generates unique slug');
    it('rejects duplicate slug');
    it('uploads logo to storage');
    it('creates admin invitation if provided');
  });
  
  // ... more test cases per AC
});
```

### E2E Tests

```typescript
// tests/e2e/super-admin/company-management.spec.ts

test('super admin can create new company', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/companies');
  await page.click('[data-testid="create-company"]');
  // ... fill form, submit, verify
});
```

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-16 | Initial spec | - |
