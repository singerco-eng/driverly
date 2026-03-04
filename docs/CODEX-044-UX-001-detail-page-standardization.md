# CODEX-044: UX-001 Detail Page Standardization

> **Context Document** - Read this before implementing any user stories in the prompt file.

## Overview

This initiative standardizes the UX pattern across all detail pages (Driver, Vehicle, Location) for both admin and driver portal views. The goal is to create a consistent, comprehensive, and visually cohesive experience.

## Problem Statement

### Current Issues

1. **Flat, boring cards** - Simple `Card > CardHeader > CardTitle > CardContent` pattern with minimal visual hierarchy
2. **Random information chunking** - Data grouped arbitrarily (e.g., "Application Status, License, Activity, Location" on the same row)
3. **Inconsistent views** - Driver Profile (driver portal) vs DriverDetail (admin) show completely different layouts and information
4. **Multiple redundant tabs** - Overview/Profile/Details tabs contain overlapping or sparse content
5. **No quick-glance value** - Cannot scan and understand entity health/status immediately
6. **Wasted space** - Small cards with minimal content don't use space effectively

### Current Tab Structures

| Entity | Admin Tabs | Driver Portal Tabs |
|--------|------------|-------------------|
| Driver | Overview, Profile, Vehicles, Credentials, Availability | Profile page (separate), N/A |
| Vehicle | Overview, Details, Credentials, Assignments | Overview, Details, Credentials |
| Location | Overview, Drivers, Vehicles, Credentials, Trip Sources | N/A |

### Files Affected

**Admin Detail Pages:**
- `src/pages/admin/DriverDetail.tsx`
- `src/pages/admin/VehicleDetail.tsx`
- `src/pages/admin/LocationDetail.tsx`

**Driver Portal Pages:**
- `src/pages/driver/Profile.tsx`
- `src/pages/driver/VehicleDetail.tsx`

**Admin Tab Components:**
- `src/components/features/admin/DriverOverviewTab.tsx`
- `src/components/features/admin/VehicleOverviewTab.tsx`
- `src/components/features/admin/LocationOverviewTab.tsx`

**Driver Tab Components:**
- `src/components/features/driver/VehicleOverviewTab.tsx`
- `src/components/features/driver/VehicleDetailsTab.tsx`

## Solution: Unified Summary Pattern

### Design Goals

1. **Comprehensive information display** - All relevant data organized logically in one scrollable view
2. **Fewer tabs** - Consolidate Overview/Profile/Details into a single "Summary" tab
3. **Consistent pattern** - Same visual structure across Driver, Vehicle, and Location
4. **Role-aware rendering** - Same components for admin and driver, with edit controls based on permissions

### New Tab Structure

| Entity | New Tabs |
|--------|----------|
| Driver | **Summary**, Vehicles, Credentials, Availability |
| Vehicle | **Summary**, Credentials, Assignments |
| Location | **Summary**, Drivers, Vehicles, Credentials, Trip Sources |

### Visual Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│  [DetailPageHeader - unchanged]                                      │
│  Back | Avatar | Title | Badges | [Tabs] | Actions                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  SUMMARY TAB CONTENT                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  [QuickStatsBar - NEW]                                          ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            ││
│  │  │ Stat 1  │  │ Stat 2  │  │ Stat 3  │  │ Stat 4  │            ││
│  │  │ Value   │  │ Value   │  │ Value   │  │ Value   │            ││
│  │  │ Status  │  │ Status  │  │ Status  │  │ Status  │            ││
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  [InfoSection - NEW]                                            ││
│  │  ┌─────────────────────────────────────────────────────────────┐││
│  │  │ Icon  Section Title                              [Edit]     │││
│  │  ├─────────────────────────────────────────────────────────────┤││
│  │  │ [PropertyGrid - NEW]                                        │││
│  │  │ Label 1        │ Value 1                                    │││
│  │  │ Label 2        │ Value 2                                    │││
│  │  │ Label 3        │ Value 3                                    │││
│  │  └─────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  [Another InfoSection]                                          ││
│  │  ...                                                            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## New Shared Components

### 1. QuickStatsBar

**Purpose:** Display 3-5 key metrics at a glance with visual status indicators.

**File:** `src/components/ui/quick-stats-bar.tsx`

**Features:**
- Horizontal row of stat cards
- Each card shows: icon, label, value, status indicator
- Status colors: success (green), warning (amber), error (red), neutral (gray)
- Optional click handler for scrolling to related section
- Responsive: 2 columns on mobile, 4 columns on desktop

**Props Interface:**
```typescript
interface QuickStat {
  id: string;                    // For key and scroll targeting
  label: string;                 // e.g., "License"
  value: string | number;        // e.g., "Expires in 6mo"
  icon: React.ReactNode;         // Lucide icon
  status?: 'success' | 'warning' | 'error' | 'neutral';
  description?: string;          // Additional context
  onClick?: () => void;          // Optional scroll/navigate action
}

interface QuickStatsBarProps {
  stats: QuickStat[];
  columns?: 3 | 4 | 5;           // Default: 4
  className?: string;
}
```

**Visual Design:**
- Use existing `cardVariants({ variant: 'stats' })` from design system
- Status indicator as left border accent (4px) with status color
- Icon in muted circle background
- Value prominently displayed
- Status badge or text below value

### 2. InfoSection

**Purpose:** Consistent wrapper for grouped information with optional edit capability.

**File:** `src/components/ui/info-section.tsx`

**Features:**
- Card-based container with header and content area
- Icon + title in header
- Optional edit button (role-aware visibility)
- Optional collapsible behavior
- Smooth transitions

**Props Interface:**
```typescript
interface InfoSectionProps {
  id?: string;                   // For scroll targeting
  icon?: React.ReactNode;        // Lucide icon for section
  title: string;                 // Section title
  description?: string;          // Optional subtitle
  onEdit?: () => void;           // Edit button handler
  canEdit?: boolean;             // Show/hide edit button
  children: React.ReactNode;     // Section content
  collapsible?: boolean;         // Enable collapse
  defaultOpen?: boolean;         // Initial collapse state
  className?: string;
}
```

**Visual Design:**
- Use existing `cardVariants({ variant: 'default' })` or `section` variant
- Header: flex row with icon + title left, edit button right
- Content: padding with space-y-4 for internal spacing
- If collapsible, use Accordion pattern from shadcn/ui

### 3. PropertyGrid

**Purpose:** Structured key-value display for entity properties.

**File:** `src/components/ui/property-grid.tsx`

**Features:**
- Responsive grid layout
- Labels styled as muted, values as foreground
- Support for complex values (badges, links, formatted dates)
- Column span control for wider values
- Hidden property support for role-aware display

**Props Interface:**
```typescript
interface Property {
  label: string;                 // Property name
  value: React.ReactNode;        // Can be string, badge, link, etc.
  span?: 1 | 2;                  // Column span (default: 1)
  hidden?: boolean;              // Conditionally hide
}

interface PropertyGridProps {
  properties: Property[];
  columns?: 1 | 2 | 3;           // Grid columns (default: 2)
  className?: string;
}
```

**Visual Design:**
- CSS Grid with gap-x-4 gap-y-3
- Label: text-sm text-muted-foreground
- Value: text-sm font-medium
- Full span items break to new row

## Entity-Specific Summary Tabs

### DriverSummaryTab

**File:** `src/components/features/shared/DriverSummaryTab.tsx`

**Quick Stats (4 cards):**
1. **License Status** - Expiration date with warning if < 90 days
2. **Vehicles** - Count of assigned vehicles, primary vehicle indicator
3. **Credentials** - X/Y complete, status indicator
4. **Activity** - Last active date or "No recent activity"

**Information Sections:**

| Section | Properties | Edit Modal |
|---------|------------|------------|
| Personal Information | Full Name, Date of Birth, SSN (masked), Avatar | EditPersonalInfoModal |
| Contact Information | Email, Phone, Email Verified badge | EditContactInfoModal |
| Address | Address Line 1, Line 2, City, State, ZIP | EditAddressModal |
| License Details | Number, State, Expiration, Front Photo, Back Photo | EditLicenseModal |
| Employment | Type (1099/W2), Start Date, Location Assignment | Location selector only |
| Emergency Contact | Name, Phone, Relationship | EditEmergencyContactModal |
| Notes | Admin notes (admin-only section) | DriverNotesSection |

**Role-Aware Behavior:**
- Admin viewing driver: All sections editable, SSN visible (masked)
- Driver viewing own profile: All sections editable except Employment type
- SSN field: Show masked value (****-****-1234) to non-owners

### VehicleSummaryTab

**File:** `src/components/features/shared/VehicleSummaryTab.tsx`

**Quick Stats (4 cards):**
1. **Status** - Active/Inactive/Pending with status color
2. **Assignment** - Primary/Secondary, driver name if assigned
3. **Capacity** - Seat count, wheelchair/stretcher if applicable
4. **Credentials** - X/Y complete, status indicator

**Information Sections:**

| Section | Properties | Edit Modal |
|---------|------------|------------|
| Vehicle Information | Make, Model, Year, Color, Type, Fleet # | EditVehicleModal |
| Identification | License Plate, State, VIN | EditVehicleModal |
| Capacity | Seat Capacity, Wheelchair Capacity, Stretcher Capacity | EditVehicleModal |
| Photos | Exterior, Interior, Lift (if wheelchair van) | UpdatePhotosModal |
| Ownership (Admin only) | Type (Company/Driver), Owner Name, Location | Location selector |
| Mileage (Company vehicles only) | Current Mileage, Last Updated | Inline input |
| Broker Eligibility (Driver only) | Eligible/Ineligible brokers list | Read-only |

**Role-Aware Behavior:**
- Admin: All sections visible and editable
- Driver (1099): Vehicle info editable, photos editable, broker eligibility visible
- Driver (W2): Photos editable only, broker eligibility visible

### LocationSummaryTab

**File:** `src/components/features/shared/LocationSummaryTab.tsx`

**Quick Stats (4 cards):**
1. **Drivers** - Count of assigned drivers
2. **Vehicles** - Count of assigned vehicles
3. **Credentials** - X/Y complete, status indicator
4. **Trip Sources** - Count of associated brokers

**Information Sections:**

| Section | Properties | Edit Modal |
|---------|------------|------------|
| Location Information | Name, Code, Primary badge | EditLocationModal |
| Address | Address Line 1, Line 2, City, State, ZIP | EditLocationModal |
| Contact | Phone, Email | EditLocationModal |

**Note:** Location is admin-only, no driver portal view needed.

## Implementation Approach

### Component Location Strategy

New shared components go in `src/components/ui/`:
- `quick-stats-bar.tsx`
- `info-section.tsx`
- `property-grid.tsx`

Entity-specific summary tabs go in `src/components/features/shared/`:
- `DriverSummaryTab.tsx`
- `VehicleSummaryTab.tsx`
- `LocationSummaryTab.tsx`

The `shared/` directory indicates these components are used by both admin and driver portals.

### Role Detection Pattern

```typescript
// In summary tab components
const { user } = useAuth();
const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
const isOwner = user?.id === entityUserId; // e.g., driver.user_id
const canEdit = isAdmin || isOwner;

// Pass canEdit to InfoSection
<InfoSection title="Personal Info" onEdit={handleEdit} canEdit={canEdit}>
  ...
</InfoSection>
```

### Existing Modal Reuse

The driver portal already has edit modals that should be reused:
- `src/components/features/driver/EditPersonalInfoModal.tsx`
- `src/components/features/driver/EditContactInfoModal.tsx`
- `src/components/features/driver/EditAddressModal.tsx`
- `src/components/features/driver/EditLicenseModal.tsx`
- `src/components/features/driver/EditEmergencyContactModal.tsx`

Admin vehicle edit: `src/components/features/admin/EditVehicleModal.tsx`
Admin location edit: `src/components/features/admin/EditLocationModal.tsx`

### Design System Integration

Use existing patterns from `src/lib/design-system.ts`:

```typescript
import { cardVariants, textVariants } from '@/lib/design-system';

// For QuickStatsBar cards
<div className={cardVariants({ variant: 'stats', padding: 'sm' })}>

// For InfoSection wrapper  
<div className={cardVariants({ variant: 'default' })}>

// For section titles
<h3 className={textVariants({ variant: 'subtitle' })}>
```

## Migration Strategy

### Phase 1: UI Components
Create the three new shared UI components (QuickStatsBar, InfoSection, PropertyGrid).

### Phase 2: Driver Summary
1. Create `DriverSummaryTab.tsx`
2. Update `DriverDetail.tsx` to use new Summary tab (replace Overview + Profile)
3. Update `Profile.tsx` (driver portal) to use same `DriverSummaryTab`

### Phase 3: Vehicle Summary
1. Create `VehicleSummaryTab.tsx`
2. Update admin `VehicleDetail.tsx` (replace Overview + Details)
3. Update driver `VehicleDetail.tsx` (replace Overview + Details)

### Phase 4: Location Summary
1. Create `LocationSummaryTab.tsx`
2. Update `LocationDetail.tsx` (replace Overview)

### Phase 5: Cleanup
Remove deprecated components after validation:
- `DriverOverviewTab.tsx` (admin)
- `VehicleOverviewTab.tsx` (admin and driver)
- `VehicleDetailsTab.tsx` (driver)
- `LocationOverviewTab.tsx` (admin)

## File Inventory

### New Files to Create

| File | Type | Description |
|------|------|-------------|
| `src/components/ui/quick-stats-bar.tsx` | UI Component | Stats bar with status indicators |
| `src/components/ui/info-section.tsx` | UI Component | Section wrapper with edit |
| `src/components/ui/property-grid.tsx` | UI Component | Key-value grid display |
| `src/components/features/shared/DriverSummaryTab.tsx` | Feature | Driver summary content |
| `src/components/features/shared/VehicleSummaryTab.tsx` | Feature | Vehicle summary content |
| `src/components/features/shared/LocationSummaryTab.tsx` | Feature | Location summary content |

### Files to Update

| File | Change |
|------|--------|
| `src/pages/admin/DriverDetail.tsx` | Replace Overview+Profile tabs with Summary |
| `src/pages/admin/VehicleDetail.tsx` | Replace Overview+Details tabs with Summary |
| `src/pages/admin/LocationDetail.tsx` | Replace Overview tab with Summary |
| `src/pages/driver/Profile.tsx` | Use DriverSummaryTab instead of inline sections |
| `src/pages/driver/VehicleDetail.tsx` | Use VehicleSummaryTab, remove Overview+Details |
| `src/components/ui/index.ts` | Export new components |

### Files to Deprecate (Phase 5)

| File | Replacement |
|------|-------------|
| `src/components/features/admin/DriverOverviewTab.tsx` | DriverSummaryTab |
| `src/components/features/admin/VehicleOverviewTab.tsx` | VehicleSummaryTab |
| `src/components/features/admin/LocationOverviewTab.tsx` | LocationSummaryTab |
| `src/components/features/driver/VehicleOverviewTab.tsx` | VehicleSummaryTab |
| `src/components/features/driver/VehicleDetailsTab.tsx` | VehicleSummaryTab |

## Testing Requirements

### Visual Verification
- [ ] Quick stats show correct status colors (green/amber/red)
- [ ] Info sections have consistent spacing
- [ ] Property grids align labels and values properly
- [ ] Edit buttons appear only when user has permission
- [ ] Responsive layout works on mobile (stack columns)

### Functional Verification
- [ ] All existing edit modals work from new summary tabs
- [ ] Location assignment selector works in Employment section
- [ ] Credential status computation is accurate
- [ ] Tab navigation preserves selected tab on refresh
- [ ] Back button navigation works correctly

### Role-Based Verification
- [ ] Admin sees all sections with edit controls
- [ ] Driver sees own profile with edit controls
- [ ] Driver cannot edit other drivers' profiles
- [ ] W2 drivers have limited edit capability on vehicles
- [ ] Location sections are admin-only

## Success Criteria

1. **Consistency:** All three entity types (Driver, Vehicle, Location) use the same visual pattern
2. **Comprehensiveness:** All information previously split across multiple tabs is visible in one scrollable Summary
3. **Role Awareness:** Edit controls appear appropriately based on viewer permissions
4. **No Regression:** All existing functionality continues to work (edit modals, status changes, assignments)
5. **Code Reuse:** Shared components reduce duplication between admin and driver portals
