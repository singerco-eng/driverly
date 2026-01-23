# TASK 012: Admin Vehicle Creation - Enhanced Form with Segmented Tabs

## Context

The Admin Vehicle Management feature exists but needs UX improvements. Currently, the `CreateVehicleModal` component has issues:

1. **Bug:** The License State field is a free-text `<Input>` but the database column `license_state` is `CHAR(2)`, causing a "value too long" error when users type full state names
2. **UX Gap:** The form is a flat grid layout, but should use an `ElevatedContainer` with segmented tabs per the AD-003 spec

**Reference:** `docs/features/admin/AD-003-vehicle-management.md` (see "Add/Edit Vehicle" wireframe)

## Prerequisites

- Migration `017_driver_vehicle_management.sql` applied
- `src/lib/us-states.ts` exists with US_STATES array (value/label pairs)
- `src/components/ui/elevated-container.tsx` exists
- `src/components/ui/tabs.tsx` exists
- Vehicle service and hooks functional (`src/services/vehicles.ts`, `src/hooks/useVehicles.ts`)

## User Story

**As an Admin** of Driverly, I want to create vehicles using an elegant, segmented form so that I can efficiently enter vehicle information without errors.

## Problem Statement

### Current Issues

1. **Database Error on Creation:**
   - Error: `{code: '22001', message: 'value too long for type character varying(2)'}`
   - Cause: `license_state` input allows free text (e.g., "California") but DB expects 2-char code ("CA")
   - Location: `src/components/features/admin/CreateVehicleModal.tsx` line ~127

2. **Suboptimal Form UX:**
   - All fields crammed into one scrollable area
   - No logical grouping or progressive disclosure
   - Doesn't match the ElevatedContainer pattern used elsewhere in the app

### Database Schema Reference

From `supabase/migrations/006_driver_vehicle_tables.sql`:
```sql
license_state CHAR(2),  -- 2-character state code only
```

## Your Tasks

### Task 1: Fix License State Input

Replace the free-text `<Input>` with a `<Select>` dropdown using `US_STATES` data.

**File:** `src/components/features/admin/CreateVehicleModal.tsx`

**Change:**
```tsx
// Before (line ~126-128):
<div>
  <label className="text-sm text-white/80">License State</label>
  <Input value={licenseState} onChange={(e) => setLicenseState(e.target.value)} />
</div>

// After:
import { US_STATES } from '@/lib/us-states';

<div>
  <label className="text-sm text-white/80">License State</label>
  <Select value={licenseState} onValueChange={setLicenseState}>
    <SelectTrigger>
      <SelectValue placeholder="Select state" />
    </SelectTrigger>
    <SelectContent>
      {US_STATES.map((state) => (
        <SelectItem key={state.value} value={state.value}>
          {state.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### Task 2: Convert to ElevatedContainer with Tabs

Replace the Modal with ElevatedContainer and organize fields into 3 tabs:

**Tab Structure:**
1. **Vehicle Info** - Fleet #, Make, Model, Year, Color, Type, Ownership, Owner Driver (if driver-owned), Capacity fields, Mileage
2. **Identification** - License Plate, License State, VIN
3. **Photos** - Exterior, Interior, Wheelchair Lift (conditional)

**File:** `src/components/features/admin/CreateVehicleModal.tsx`

**New Structure:**
```tsx
import { ElevatedContainer } from '@/components/ui/elevated-container';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Component implementation
export function CreateVehicleModal({ open, onOpenChange }: CreateVehicleModalProps) {
  const [activeTab, setActiveTab] = useState('info');
  // ... existing state ...

  return (
    <ElevatedContainer
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Add Vehicle"
      description="Create a new vehicle record"
      size="xl"
      variant="elevated"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="info">Vehicle Info</TabsTrigger>
          <TabsTrigger value="identification">Identification</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="info">
          {/* Vehicle Info fields */}
        </TabsContent>
        
        <TabsContent value="identification">
          {/* License Plate, State, VIN */}
        </TabsContent>
        
        <TabsContent value="photos">
          {/* Photo upload fields */}
        </TabsContent>
      </Tabs>
      
      {/* Footer with Cancel/Submit buttons */}
    </ElevatedContainer>
  );
}
```

### Task 3: Add Photo Upload Fields (Optional Enhancement)

Add photo upload capability for:
- Exterior Photo (required for completion)
- Interior Photo (optional)
- Wheelchair Lift Photo (shown only when vehicle_type === 'wheelchair_van')

Use existing photo upload patterns from the codebase or create simple file inputs that store URLs.

### Task 4: Form Validation per Tab

Add visual validation indicators:
- Show which tabs have incomplete required fields
- Highlight tab triggers with warning indicator if missing required data
- Disable Submit if any required field is missing

### Task 5: Update EditVehicleModal

The EditVehicleModal (`src/components/features/admin/EditVehicleModal.tsx`) has the same issues:
- Line 129-131: Uses `<Input>` for License State instead of `<Select>`
- Uses flat Modal layout instead of ElevatedContainer with Tabs

Apply the same fixes:
1. Replace License State `<Input>` with `<Select>` using `US_STATES`
2. Convert from `Modal` to `ElevatedContainer`
3. Organize into 3 tabs (Vehicle Info, Identification, Photos)
4. Pre-populate all fields from `vehicle` prop
5. Maintain existing useEffect that syncs state when vehicle changes

**File:** `src/components/features/admin/EditVehicleModal.tsx`

**Current License State code (lines 129-131):**
```tsx
<div>
  <label className="text-sm text-white/80">License State</label>
  <Input value={licenseState} onChange={(e) => setLicenseState(e.target.value)} />
</div>
```

**Should become:**
```tsx
<div>
  <label className="text-sm text-white/80">License State</label>
  <Select value={licenseState} onValueChange={setLicenseState}>
    <SelectTrigger>
      <SelectValue placeholder="Select state" />
    </SelectTrigger>
    <SelectContent>
      {US_STATES.map((state) => (
        <SelectItem key={state.value} value={state.value}>
          {state.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

## Acceptance Criteria

### AC-1: License State Dropdown
- [ ] License State uses a `<Select>` dropdown, not free-text input
- [ ] Dropdown options come from `US_STATES` in `src/lib/us-states.ts`
- [ ] Values are 2-character state codes (CA, NY, TX, etc.)
- [ ] Creating a vehicle no longer throws "value too long" error

### AC-2: ElevatedContainer Integration
- [ ] Form uses `ElevatedContainer` instead of `Modal`
- [ ] Has proper title and description
- [ ] Uses `size="xl"` for adequate form space
- [ ] Close button works correctly
- [ ] Backdrop click behavior follows existing patterns

### AC-3: Tabbed Form Layout
- [ ] Form has 3 tabs: Vehicle Info, Identification, Photos
- [ ] Tabs are styled consistently with app design system
- [ ] Tab switching preserves form state
- [ ] Active tab is visually highlighted

### AC-4: Vehicle Info Tab
Contains:
- [ ] Fleet Number (optional, for company vehicles)
- [ ] Make (required)
- [ ] Model (required)
- [ ] Year (required)
- [ ] Color (required)
- [ ] Vehicle Type dropdown (required)
- [ ] Ownership dropdown (required)
- [ ] Owner Driver dropdown (shown only when ownership === 'driver')
- [ ] Seat Capacity
- [ ] Wheelchair Capacity (relevant for wheelchair_van)
- [ ] Stretcher Capacity (relevant for stretcher_van)
- [ ] Mileage (optional, for company vehicles)

### AC-5: Identification Tab
Contains:
- [ ] License Plate (required)
- [ ] License State dropdown (required, 2-char codes)
- [ ] VIN (recommended, 17 characters)

### AC-6: Photos Tab
Contains:
- [ ] Exterior Photo upload/preview
- [ ] Interior Photo upload/preview
- [ ] Wheelchair Lift Photo (shown only when vehicle_type === 'wheelchair_van')
- [ ] Each photo slot shows preview when uploaded
- [ ] Each photo slot has upload/remove controls

### AC-7: Form Submission
- [ ] Submit button validates all required fields
- [ ] Shows loading state during submission
- [ ] Displays success toast on completion
- [ ] Closes form and refreshes vehicle list on success
- [ ] Shows error toast with message on failure

### AC-8: Responsive Design
- [ ] Works on desktop (xl: 3-column grid where appropriate)
- [ ] Works on tablet (md: 2-column grid)
- [ ] Works on mobile (single column stack)

### AC-9: Edit Modal Consistency
- [ ] EditVehicleModal uses same ElevatedContainer + Tabs pattern
- [ ] Pre-populates all fields from vehicle data
- [ ] Maintains same validation rules

## Technical Notes

### Database Constraints
- `license_state`: `CHAR(2)` - must be exactly 2 characters
- `vin`: `VARCHAR(17)` - up to 17 characters
- `year`: `INTEGER` with CHECK (year >= 1900 AND year <= 2100)
- `vehicle_type`: CHECK IN ('sedan', 'suv', 'minivan', 'van', 'wheelchair_van', 'stretcher_van')
- `ownership`: CHECK IN ('company', 'driver', 'leased')
- `status`: CHECK IN ('active', 'inactive', 'retired')

### Existing Resources
- US States data: `src/lib/us-states.ts` (already exists)
- ElevatedContainer: `src/components/ui/elevated-container.tsx`
- Tabs: `src/components/ui/tabs.tsx`
- Vehicle types: `src/types/vehicle.ts`
- Vehicle service: `src/services/vehicles.ts`
- Vehicle hooks: `src/hooks/useVehicles.ts`

### Styling Guidelines
- Use glass/elevated styling consistent with existing modals
- Labels: `text-sm text-white/80`
- Use grid layouts: `grid gap-4 md:grid-cols-2` or `md:grid-cols-3`
- Button variants: `variant="gradient"` for submit, `variant="modal-secondary"` for cancel
- Tab styling should work against dark/glass backgrounds

## UI/UX Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  Add Vehicle                                               [X]  │
│  Create a new vehicle record                                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────────┐ ┌──────────┐              │
│  │ Vehicle Info│ │ Identification  │ │  Photos  │              │
│  └─────────────┘ └─────────────────┘ └──────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [TAB CONTENT - See AC-4, AC-5, AC-6 for each tab]             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                [Cancel]  [Create Vehicle]       │
└─────────────────────────────────────────────────────────────────┘
```

### Task 6: Add Missing Vehicle Type Options

The database supports more vehicle types than the UI currently offers:

**Database constraint (from migration 017):**
```sql
CHECK (vehicle_type IN ('sedan', 'suv', 'minivan', 'van', 'wheelchair_van', 'stretcher_van'))
```

**Current UI (CreateVehicleModal lines 142-146):**
```tsx
<SelectItem value="sedan">Sedan</SelectItem>
<SelectItem value="van">Van</SelectItem>
<SelectItem value="wheelchair_van">Wheelchair Van</SelectItem>
<SelectItem value="stretcher_van">Stretcher Van</SelectItem>
```

**Missing options:** `suv`, `minivan`

Add these to both CreateVehicleModal and EditVehicleModal:
```tsx
<SelectItem value="sedan">Sedan</SelectItem>
<SelectItem value="suv">SUV</SelectItem>
<SelectItem value="minivan">Minivan</SelectItem>
<SelectItem value="van">Van</SelectItem>
<SelectItem value="wheelchair_van">Wheelchair Van</SelectItem>
<SelectItem value="stretcher_van">Stretcher Van</SelectItem>
```

**Files requiring vehicle type updates:**

1. **Type definition** - `src/types/vehicle.ts`:
```typescript
// Before:
export type VehicleType = 'sedan' | 'van' | 'wheelchair_van' | 'stretcher_van';

// After:
export type VehicleType = 'sedan' | 'suv' | 'minivan' | 'van' | 'wheelchair_van' | 'stretcher_van';
```

2. **Admin Create Modal** - `src/components/features/admin/CreateVehicleModal.tsx` (lines 142-146)

3. **Admin Edit Modal** - `src/components/features/admin/EditVehicleModal.tsx` (lines 144-149)

4. **Admin Vehicles Page Filter** - `src/pages/admin/Vehicles.tsx` (lines 72-76)

5. **Driver Add Vehicle Wizard** - `src/components/features/driver/AddVehicleWizard.tsx` (lines 279-283)

6. **Driver Edit Vehicle Modal** - `src/components/features/driver/EditVehicleModal.tsx` (lines 156-160)

Note: `src/components/features/admin/CreateBrokerModal.tsx` already includes suv/minivan - use it as reference.

## Testing Notes

1. **Test License State:**
   - Select a state from dropdown
   - Verify 2-char code is submitted (e.g., "CA" not "California")
   - Confirm no database errors on submit

2. **Test Tab Navigation:**
   - Fill fields in Tab 1, switch to Tab 2, switch back
   - Verify data is preserved across tab switches

3. **Test Conditional Fields:**
   - Select ownership = "driver" → Owner Driver dropdown appears
   - Select vehicle_type = "wheelchair_van" → Wheelchair Lift Photo field appears

4. **Test Validation:**
   - Try submitting with missing required fields
   - Verify appropriate error messages

5. **Test Full Flow:**
   - Fill all required fields across all tabs
   - Submit and verify vehicle appears in list
   - Open edit modal and verify data loads correctly

## DO NOT

- Change the database schema (it's correct as-is)
- Modify core UI components in `src/components/ui/`
- Remove existing functionality
- Break mobile responsiveness
- Use inline styles (use Tailwind classes)

## Output Summary

When complete, confirm:
1. ✅ License State uses Select dropdown with 2-char state codes (both modals)
2. ✅ CreateVehicleModal uses ElevatedContainer
3. ✅ EditVehicleModal uses ElevatedContainer  
4. ✅ Both forms organized into 3 tabs (Vehicle Info, Identification, Photos)
5. ✅ All fields properly organized per tab
6. ✅ Photos tab includes conditional wheelchair lift photo
7. ✅ Form validation works correctly
8. ✅ No more "value too long" database errors
9. ✅ Vehicle type dropdown includes all 6 types (sedan, suv, minivan, van, wheelchair_van, stretcher_van)
10. ✅ VehicleType in `src/types/vehicle.ts` updated to include suv and minivan
